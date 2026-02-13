"use client"

import { useEffect, useState } from "react"
import { ClockButton } from "@/components/clock/clock-button"
import { useAuth } from "@/components/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { collection, query, where, getDocs, limit, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Clock, Calendar, CheckCircle, MapPin } from "lucide-react"
import { getAutoClockOutTime, getEffectiveShifts, EffectiveShift } from "@/lib/services/schedule-utils"
import { isAfter, addDays, startOfDay, endOfDay, isSameDay } from "date-fns"
import { formatHoursMinutes } from "@/lib/services/payroll-service"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Send } from "lucide-react"
import { getIanaTz, getTzDayRange } from "@/lib/services/timezone-utils"

export default function EmployeeDashboard() {
    const { user, userData } = useAuth()
    const [status, setStatus] = useState<"clocked-in" | "clocked-out">("clocked-out")
    const [loading, setLoading] = useState(true)
    const [lastEntry, setLastEntry] = useState<any>(null)
    const [pharmacyLocation, setPharmacyLocation] = useState<any>(null)
    const [nextShift, setNextShift] = useState<EffectiveShift | null>(null)
    const [upcomingShifts, setUpcomingShifts] = useState<EffectiveShift[]>([])
    const [todayMinutes, setTodayMinutes] = useState(0)
    const [completedMinutes, setCompletedMinutes] = useState(0)
    const [clockInTimestamp, setClockInTimestamp] = useState<Date | null>(null)

    // Support Dialog State
    const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false)
    const [supportMessage, setSupportMessage] = useState("")
    const [clockInError, setClockInError] = useState<{ message: string, reason?: string } | null>(null)
    const [clockOutError, setClockOutError] = useState<{ message: string } | null>(null)
    const [isSendingSupport, setIsSendingSupport] = useState(false)

    useEffect(() => {
        if (!user || !userData) return

        const fetchData = async () => {
            if (!userData.organizationId) return
            const orgId = userData.organizationId

            try {
                // 1. Check for active clock-in
                const q = query(
                    collection(db, "organizations", orgId, "time_entries"),
                    where("employeeId", "==", user.uid),
                    where("clockOutTime", "==", null),
                    limit(1)
                )
                const snapshot = await getDocs(q)
                const hasActiveEntry = !snapshot.empty

                if (hasActiveEntry) {
                    setStatus("clocked-in")
                    setLastEntry(snapshot.docs[0].data())
                } else {
                    setStatus("clocked-out")
                }

                // 2. Fetch Assigned Location
                if (userData.locationId) {
                    const locDoc = await getDoc(doc(db, "organizations", orgId, "locations", userData.locationId))
                    if (locDoc.exists()) {
                        setPharmacyLocation(locDoc.data())
                    }
                }

                // 3. Auto Clock-out check (if clocked in)
                if (hasActiveEntry && userData.locationId) {
                    const expectedOut = await getAutoClockOutTime(orgId, user.uid, userData.locationId)

                    if (expectedOut && isAfter(new Date(), expectedOut)) {
                        // Determine reason
                        const todayShifts = await getEffectiveShifts(orgId, user.uid, startOfDay(new Date()), endOfDay(new Date()))
                        const clockOutReason = todayShifts.length > 0 ? "auto_shift_end" : "auto_location_close"

                        console.log(`[Auto-Clock-Out] Reason: ${clockOutReason}, Expected out:`, expectedOut)
                        toast.info("Shift Automatically Ended", {
                            description: clockOutReason === "auto_shift_end"
                                ? "You were clocked out because your shift has ended."
                                : "You were clocked out at location closing time."
                        })
                        await fetch("/api/clock/out", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "x-user-id": user.uid
                            },
                            body: JSON.stringify({ coordinates: null, reason: clockOutReason })
                        })
                        setStatus("clocked-out")
                    }
                }

                // 3.5 Fetch Organization Timezone for day boundaries
                const orgDoc = await getDoc(doc(db, "organizations", orgId))
                const ianaTz = getIanaTz(orgDoc.data()?.timezone || "Eastern Standard Time (EST)")

                // 4. Fetch Next Shift
                const { start: todayStart, end: dayWindowEnd } = getTzDayRange(ianaTz)
                const nextShifts = await getEffectiveShifts(
                    orgId,
                    user.uid,
                    todayStart,
                    addDays(todayStart, 7),
                    ianaTz
                )
                setUpcomingShifts(nextShifts)
                // Find first upcoming shift
                const upcoming = nextShifts.find(s => isAfter(s.startTime, new Date()))
                setNextShift(upcoming || null)

                // 5. Fetch today's time entries using TZ-aligned boundaries
                const { start: tzTodayStart, end: tzTodayEnd } = getTzDayRange(ianaTz)
                const todayQ = query(
                    collection(db, "organizations", orgId, "time_entries"),
                    where("employeeId", "==", user.uid),
                    where("clockInTime", ">=", tzTodayStart),
                    where("clockInTime", "<=", tzTodayEnd)
                )
                const todaySnap = await getDocs(todayQ)
                let completed = 0
                let activeClockIn: Date | null = null

                todaySnap.docs.forEach(d => {
                    const data = d.data()
                    const cin = data.clockInTime?.toDate ? data.clockInTime.toDate() : (data.clockInTime?.seconds ? new Date(data.clockInTime.seconds * 1000) : new Date(data.clockInTime))
                    if (data.clockOutTime) {
                        const cout = data.clockOutTime?.toDate ? data.clockOutTime.toDate() : (data.clockOutTime?.seconds ? new Date(data.clockOutTime.seconds * 1000) : new Date(data.clockOutTime))
                        completed += (cout.getTime() - cin.getTime()) / (1000 * 60)
                    } else {
                        // Active entry — will be ticked in real time
                        activeClockIn = cin
                    }
                })

                setCompletedMinutes(completed)
                setClockInTimestamp(activeClockIn)
                const activeTs = activeClockIn as Date | null
                if (activeTs) {
                    setTodayMinutes(completed + (Date.now() - activeTs.getTime()) / (1000 * 60))
                } else {
                    setTodayMinutes(completed)
                }

            } catch (error) {
                console.error("Error fetching dashboard data:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [user, userData])

    // Real-time ticker for active clock-in
    useEffect(() => {
        if (!clockInTimestamp) return
        const interval = setInterval(() => {
            setTodayMinutes(completedMinutes + (Date.now() - clockInTimestamp.getTime()) / (1000 * 60))
        }, 1000)
        return () => clearInterval(interval)
    }, [clockInTimestamp, completedMinutes])

    const handleClockIn = async (coords: GeolocationCoordinates) => {
        if (!userData?.locationId) {
            toast.error("No location assigned to your profile.")
            return
        }

        try {
            const res = await fetch("/api/clock/in", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": user!.uid
                },
                body: JSON.stringify({
                    locationId: userData.locationId,
                    coordinates: {
                        latitude: coords.latitude,
                        longitude: coords.longitude
                    }
                })
            })

            if (!res.ok) {
                const text = await res.text();
                console.error(`Clock in request failed with status: ${res.status} ${res.statusText}`);
                console.error("Clock in failed (Raw Body):", text);

                let data: any = {};
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    console.error("Failed to parse error response as JSON");
                }

                throw new Error(data.details || data.error || `Clock in failed (${res.status}): ${text.substring(0, 100)}`);
            }

            const data = await res.json();

            setStatus("clocked-in")
            setLastEntry(data.entry)
            toast.success("Clocked in successfully!")
        } catch (error: any) {
            console.error("Clock In Error:", error)
            setClockInError({
                message: error.message || "Unknown error occurred",
                reason: error.message?.includes("Outside operating hours") ? "Outside Operating Hours" :
                    error.message?.includes("Outside Shift Hours") ? "Outside Scheduled Shift" :
                        "Verification Failed"
            })
            // Removed auto-open: setIsSupportDialogOpen(true)
            toast.error(error.message)
        }
    }

    const handleSendSupport = async () => {
        if (!clockInError) return
        setIsSendingSupport(true)
        try {
            const res = await fetch("/api/support/clock-in-issue", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": user!.uid
                },
                body: JSON.stringify({
                    locationId: userData?.locationId,
                    locationName: pharmacyLocation?.name,
                    reason: clockInError ? (clockInError.reason || clockInError.message) : (clockOutError ? `Clock-Out Error: ${clockOutError.message}` : "General Support"),
                    message: supportMessage,
                    userName: userData?.name
                })
            })

            if (!res.ok) {
                const text = await res.text();
                // console.error(`Support request failed: ${res.status} ${res.statusText}`);
                // console.error("Support response:", text);
                throw new Error("Failed to send message: " + text);
            }

            // console.log("Support email sent successfully");
            toast.success("Support ticket sent successfully. An admin will review it shortly.")
            setIsSupportDialogOpen(false)
            setSupportMessage("")
            setClockInError(null)
            setClockOutError(null)
        } catch (error) {
            console.error("handleSendSupport Error:", error);
            toast.error("Failed to send support message")
        } finally {
            setIsSendingSupport(false)
        }
    }

    const handleClockOut = async (coords: GeolocationCoordinates) => {
        setClockOutError(null)
        try {
            const res = await fetch("/api/clock/out", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": user!.uid
                },
                body: JSON.stringify({
                    coordinates: {
                        latitude: coords.latitude,
                        longitude: coords.longitude
                    }
                })
            })

            if (!res.ok) {
                const text = await res.text();
                let data: any = {};
                try { data = JSON.parse(text); } catch (e) { }
                throw new Error(data.details || data.error || `Clock out failed (${res.status})`);
            }

            const data = await res.json()

            setStatus("clocked-out")
            toast.success("Shift ended successfully!")
        } catch (error: any) {
            console.error("Clock Out Error:", error)
            setClockOutError({
                message: error.message || "Unknown error occurred"
            })
            // Don't auto-open dialog, just show the error state in UI
            toast.error(error.message)
        }
    }

    if (loading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest animate-pulse">
                    Preparing your workspace...
                </p>
            </div>
        )
    }

    if (userData && !userData.organizationId) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-6 max-w-md mx-auto text-center px-4">
                <div className="h-20 w-20 rounded-[32px] bg-amber-50 flex items-center justify-center text-amber-600">
                    <Clock className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Setup in Progress</h1>
                    <p className="text-neutral-500 font-medium">
                        Your account has been created, but your pharmacy hasn't finished setting up your profile yet.
                        Please contact your administrator.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto space-y-10 px-4 md:px-0">
            {/* Greeting */}
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
                    Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {userData?.name?.split(" ")[0]}!
                </h1>
                <p className="text-neutral-500 font-medium tracking-tight">
                    {format(new Date(), "EEEE, MMMM do")} • {pharmacyLocation?.name || "Multiple locations"}
                </p>
            </header>

            <div className="grid lg:grid-cols-12 gap-10">
                {/* Left: Clock Action */}
                <div className="lg:col-span-12 flex flex-col items-center justify-center py-4 gap-6">
                    {/* Persistent Error Alert Area */}
                    {(clockInError || clockOutError) && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full max-w-sm"
                        >
                            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="bg-red-100 p-2 rounded-full shrink-0">
                                        <AlertTriangle className="h-5 w-5 text-red-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-red-900 text-sm">
                                            {clockInError ? "Clock-In Failed" : "Clock-Out Failed"}
                                        </h3>
                                        <p className="text-sm text-red-700 font-medium leading-relaxed">
                                            {clockInError?.message || clockOutError?.message}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setIsSupportDialogOpen(true)}
                                    className="w-full bg-white border-red-200 text-red-700 hover:bg-red-50 hover:text-red-900 font-bold"
                                >
                                    <Send className="h-3.5 w-3.5 mr-2" />
                                    Report Issue to Admin
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    <ClockButton
                        status={status}
                        pharmacyLocation={pharmacyLocation?.coordinates || pharmacyLocation?.coords}
                        geofenceRadius={pharmacyLocation?.geofenceRadius}
                        onClockIn={handleClockIn}
                        onClockOut={handleClockOut}
                    />
                </div>

                {/* Right: Stats Summary */}
                <div className="lg:col-span-12 grid md:grid-cols-3 gap-6">
                    <Card className="rounded-2xl border-neutral-100 shadow-sm overflow-hidden">
                        <CardHeader className="bg-neutral-50/50 pb-3">
                            <CardTitle className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                Current Shift
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="text-2xl font-bold text-neutral-900">
                                {status === 'clocked-in' ? "Active" : "Off Duty"}
                            </div>
                            {status === 'clocked-in' && lastEntry && (
                                <p className="text-sm font-medium text-primary mt-1">
                                    Started at {(() => {
                                        const date = lastEntry.clockInTime;
                                        if (!date) return "Just now";

                                        // Handle Firestore Timestamp
                                        if (date.toDate) return format(date.toDate(), "h:mm a");

                                        // Handle raw Firestore object {seconds, nanoseconds}
                                        if (date.seconds) return format(new Date(date.seconds * 1000), "h:mm a");

                                        // Handle ISO string or other Date-compatible formats
                                        try {
                                            const parsed = new Date(date);
                                            if (isNaN(parsed.getTime())) return "Recently";
                                            return format(parsed, "h:mm a");
                                        } catch {
                                            return "Recently";
                                        }
                                    })()}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-neutral-100 shadow-sm overflow-hidden">
                        <CardHeader className="bg-neutral-50/50 pb-3">
                            <CardTitle className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                Hours Today
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="text-2xl font-bold text-neutral-900">
                                {formatHoursMinutes(Math.max(0, todayMinutes))}
                            </div>
                            <p className="text-sm font-medium text-emerald-600 mt-1">
                                {status === "clocked-in" ? "Currently clocking..." : todayMinutes > 0 ? "Completed for today" : "No hours yet"}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-neutral-100 shadow-sm overflow-hidden">
                        <CardHeader className="bg-neutral-50/50 pb-3">
                            <CardTitle className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle className="h-3 w-3" />
                                Next Shift
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="text-2xl font-bold text-neutral-900">
                                {nextShift ? (
                                    isSameDay(nextShift.startTime, new Date()) ? "Later Today" : format(nextShift.startTime, "EEEE")
                                ) : "No shift scheduled"}
                            </div>
                            {nextShift && (
                                <p className="text-sm font-medium text-neutral-500 mt-1">
                                    {format(nextShift.startTime, "h:mm a")} • {nextShift.locationName}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* My Schedule Section */}
                <div className="lg:col-span-12">
                    <Card className="rounded-2xl border-neutral-100 shadow-sm overflow-hidden">
                        <CardHeader className="bg-neutral-50/50 pb-3">
                            <CardTitle className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                My Schedule — Upcoming
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {(() => {
                                const now = new Date()
                                const futureShifts = upcomingShifts.filter(s => s.endTime >= now)
                                const displayShifts = futureShifts.slice(0, 3)
                                const hasMore = futureShifts.length > 3

                                if (displayShifts.length === 0) {
                                    return (
                                        <div className="py-8 text-center">
                                            <Calendar className="h-10 w-10 text-neutral-200 mx-auto mb-3" />
                                            <p className="text-sm font-bold text-neutral-400">No upcoming shifts</p>
                                            <p className="text-xs text-neutral-300 mt-1">Check back later or contact your admin.</p>
                                        </div>
                                    )
                                }

                                return (
                                    <div className="space-y-3">
                                        {displayShifts.map(shift => {
                                            const isToday = isSameDay(shift.startTime, new Date())
                                            return (
                                                <div
                                                    key={shift.id}
                                                    className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${isToday
                                                        ? "bg-primary/5 border-primary/10"
                                                        : "bg-white border-neutral-100 hover:bg-neutral-50"
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isToday ? "bg-primary/10 text-primary" : "bg-neutral-100 text-neutral-400"
                                                            }`}>
                                                            <Calendar className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className={`text-sm font-bold ${isToday ? "text-primary" : "text-neutral-900"
                                                                }`}>
                                                                {isToday ? "Today" : format(shift.startTime, "EEEE, MMM d")}
                                                                {shift.isVirtual && (
                                                                    <span className="ml-2 text-[9px] font-black text-neutral-400 uppercase tracking-tighter">Recurring</span>
                                                                )}
                                                            </p>
                                                            <p className="text-xs font-medium text-neutral-400 flex items-center gap-2 mt-0.5">
                                                                <Clock className="h-3 w-3" />
                                                                {format(shift.startTime, "h:mm a")} – {format(shift.endTime, "h:mm a")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
                                                        <MapPin className="h-3.5 w-3.5" />
                                                        <span className="hidden sm:inline">{shift.locationName}</span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {hasMore && (
                                            <a
                                                href="/dashboard/employee/schedule"
                                                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-neutral-200 text-sm font-bold text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 transition-colors cursor-pointer"
                                            >
                                                <Calendar className="h-4 w-4" />
                                                Show More
                                            </a>
                                        )}
                                    </div>
                                )
                            })()}
                        </CardContent>
                    </Card>
                </div>
            </div>
            {/* Support Dialog */}
            <Dialog open={isSupportDialogOpen} onOpenChange={setIsSupportDialogOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="h-5 w-5" />
                            Issue Reported
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            {clockInError?.message || clockOutError?.message || "Please describe the issue you are facing."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="message">Message to Admin (Optional)</Label>
                            <Textarea
                                id="message"
                                placeholder="Explain why you need to clock in..."
                                value={supportMessage}
                                onChange={(e) => setSupportMessage(e.target.value)}
                                className="min-h-[100px] rounded-xl resize-none"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsSupportDialogOpen(false)} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button onClick={handleSendSupport} disabled={isSendingSupport} className="rounded-xl bg-primary hover:bg-primary-600">
                            {isSendingSupport ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                            Send to Admin
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function Loader2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    )
}
