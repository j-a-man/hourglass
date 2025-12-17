"use client"

import { useState } from "react"
import { auth, db } from "@/lib/firebase"
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { collection, getDocs, writeBatch, doc, Timestamp, query, where } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Loader2, Check, AlertCircle, RefreshCw, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface GoogleCalendarSyncProps {
    locationId: string
    onSuccess?: () => void
}

export function GoogleCalendarSync({ locationId, onSuccess }: GoogleCalendarSyncProps) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<"auth" | "select" | "preview" | "importing" | "success">("auth")
    const [accessToken, setAccessToken] = useState<string | null>(null)
    const [calendars, setCalendars] = useState<any[]>([])
    const [selectedCalendar, setSelectedCalendar] = useState<string>("")
    const [matchedShifts, setMatchedShifts] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    const handleAuth = async () => {
        setLoading(true)
        try {
            const provider = new GoogleAuthProvider()
            provider.addScope("https://www.googleapis.com/auth/calendar.readonly")

            const result = await signInWithPopup(auth, provider)
            const credential = GoogleAuthProvider.credentialFromResult(result)
            const token = credential?.accessToken

            if (token) {
                setAccessToken(token)
                await fetchCalendars(token)
            }
        } catch (error) {
            console.error("Auth error:", error)
            toast.error("Failed to sign in with Google")
            setLoading(false)
        }
    }

    const fetchCalendars = async (token: string) => {
        try {
            const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await response.json()
            setCalendars(data.items || [])
            setStep("select")
        } catch (error) {
            console.error("Calendar fetch error:", error)
            toast.error("Failed to fetch calendars")
        } finally {
            setLoading(false)
        }
    }

    const handleCalendarSelect = async () => {
        if (!selectedCalendar || !accessToken) return
        setLoading(true)

        try {
            // 1. Fetch Users for matching
            const usersQ = query(collection(db, "users"), where("locationId", "==", locationId))
            const usersSnap = await getDocs(usersQ)
            const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

            // 2. Fetch Events (Next 30 days)
            const now = new Date()
            const nextMonth = new Date()
            nextMonth.setDate(now.getDate() + 30)

            const response = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${selectedCalendar}/events?timeMin=${now.toISOString()}&timeMax=${nextMonth.toISOString()}&singleEvents=true`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            )
            const data = await response.json()
            const events = data.items || []

            // 3. Match Logic
            const matches: any[] = []

            for (const event of events) {
                if (!event.start?.dateTime || !event.end?.dateTime) continue // Skip all-day events for now if needed

                // Simple Match: Check if Event Summary contains User Name
                const matchedUser = users.find((u: any) =>
                    event.summary?.toLowerCase().includes(u.name?.toLowerCase()) ||
                    event.attendees?.some((a: any) => a.email === u.email)
                )

                if (matchedUser) {
                    matches.push({
                        userId: matchedUser.id,
                        userName: (matchedUser as any).name,
                        locationId: locationId,
                        startTime: new Date(event.start.dateTime),
                        endTime: new Date(event.end.dateTime),
                        originalSummary: event.summary
                    })
                }
            }

            setMatchedShifts(matches)
            setStep("preview")

        } catch (error) {
            console.error("Event fetch error:", error)
            toast.error("Failed to fetch events")
        } finally {
            setLoading(false)
        }
    }

    const importShifts = async () => {
        setLoading(true)
        setStep("importing")

        try {
            const batch = writeBatch(db)

            matchedShifts.forEach(shift => {
                const ref = doc(collection(db, "shifts"))
                batch.set(ref, {
                    userId: shift.userId,
                    userName: shift.userName,
                    locationId: shift.locationId,
                    startTime: Timestamp.fromDate(shift.startTime),
                    endTime: Timestamp.fromDate(shift.endTime),
                    createdAt: Timestamp.now(),
                    source: "google_calendar"
                })
            })

            await batch.commit()

            toast.success(`Successfully imported ${matchedShifts.length} shifts`)
            setStep("success")
            if (onSuccess) onSuccess()

            // Close after delay
            setTimeout(() => {
                setOpen(false)
                setStep("auth")
                setMatchedShifts([])
            }, 2000)

        } catch (error) {
            console.error("Import error:", error)
            toast.error("Failed to import shifts")
            setStep("preview") // Go back to preview
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50">
                    <RefreshCw size={16} />
                    Sync Google Calendar
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="text-indigo-600" />
                        Import Shifts from Google
                    </DialogTitle>
                    <DialogDescription>
                        Sync shifts directly from your Google Calendar.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6">
                    {step === "auth" && (
                        <div className="text-center space-y-4">
                            <div className="p-4 bg-indigo-50 rounded-full w-16 h-16 mx-auto flex items-center justify-center text-indigo-600">
                                <Calendar size={32} />
                            </div>
                            <p className="text-sm text-slate-600">
                                Connect your Google account to read calendar events and automatically match them to employees.
                            </p>
                            <Button onClick={handleAuth} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sign in with Google
                            </Button>
                        </div>
                    )}

                    {step === "select" && (
                        <div className="space-y-4">
                            <p className="text-sm font-medium text-slate-700">Select the calendar containing shifts:</p>
                            <Select onValueChange={setSelectedCalendar} value={selectedCalendar}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a calendar" />
                                </SelectTrigger>
                                <SelectContent>
                                    {calendars.map(cal => (
                                        <SelectItem key={cal.id} value={cal.id}>
                                            {cal.summaryOverride || cal.summary}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-lg flex items-start gap-2">
                                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                <p>Events will be matched if the employee's name appears in the event title or if they are invited.</p>
                            </div>
                        </div>
                    )}

                    {step === "preview" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-slate-800">Found {matchedShifts.length} Shifts</h4>
                                <span className="text-xs text-slate-500">Next 30 Days</span>
                            </div>
                            <div className="border rounded-lg max-h-[300px] overflow-y-auto divide-y">
                                {matchedShifts.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">
                                        No matching events found. Check event titles.
                                    </div>
                                ) : (
                                    matchedShifts.map((shift, i) => (
                                        <div key={i} className="p-3 text-sm flex justify-between items-center hover:bg-slate-50">
                                            <div>
                                                <div className="font-bold text-slate-700">{shift.userName}</div>
                                                <div className="text-xs text-slate-500">
                                                    {format(shift.startTime, "MMM d")} • {format(shift.startTime, "h:mm a")} - {format(shift.endTime, "h:mm a")}
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                                {shift.originalSummary}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {(step === "importing" || step === "success") && (
                        <div className="text-center py-8">
                            {step === "success" ? (
                                <div className="flex flex-col items-center gap-2 text-green-600 animate-in zoom-in duration-300">
                                    <div className="p-3 bg-green-100 rounded-full"><Check size={32} /></div>
                                    <h3 className="font-bold text-lg">Import Complete!</h3>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-indigo-600">
                                    <Loader2 size={40} className="animate-spin" />
                                    <p className="text-sm font-medium">Creating shifts...</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    {step === "select" && (
                        <Button onClick={handleCalendarSelect} disabled={!selectedCalendar || loading} className="w-full">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Find Shifts
                        </Button>
                    )}
                    {step === "preview" && matchedShifts.length > 0 && (
                        <Button onClick={importShifts} disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
                            Import {matchedShifts.length} Shifts
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
