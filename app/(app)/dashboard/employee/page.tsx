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

export default function EmployeeDashboard() {
    const { user, userData } = useAuth()
    const [status, setStatus] = useState<"clocked-in" | "clocked-out">("clocked-out")
    const [loading, setLoading] = useState(true)
    const [lastEntry, setLastEntry] = useState<any>(null)
    const [pharmacyLocation, setPharmacyLocation] = useState<any>(null)

    useEffect(() => {
        if (!user || !userData) return

        const fetchData = async () => {
            if (!userData.organizationId) return
            const orgId = userData.organizationId

            try {
                // 1. Check for active clock-in in organization sub-collection
                const q = query(
                    collection(db, "organizations", orgId, "time_entries"),
                    where("employeeId", "==", user.uid),
                    where("clockOutTime", "==", null),
                    limit(1)
                )
                const snapshot = await getDocs(q)

                if (!snapshot.empty) {
                    setStatus("clocked-in")
                    setLastEntry(snapshot.docs[0].data())
                } else {
                    setStatus("clocked-out")
                }

                // 2. Fetch Assigned Location from organization sub-collection
                if (userData.locationId) {
                    const locDoc = await getDoc(doc(db, "organizations", orgId, "locations", userData.locationId))
                    if (locDoc.exists()) {
                        setPharmacyLocation(locDoc.data())
                    }
                }
            } catch (error) {
                console.error("Error fetching dashboard data:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [user, userData])

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

            const data = await res.json()
            if (!res.ok) {
                console.error("Clock in failed (API Response):", data)
                throw new Error(data.details || data.error || "Clock in failed")
            }

            setStatus("clocked-in")
            setLastEntry(data.entry)
            toast.success("Clocked in successfully!")
        } catch (error: any) {
            toast.error(error.message)
            throw error // Re-throw to show error in button
        }
    }

    const handleClockOut = async (coords: GeolocationCoordinates) => {
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

            const data = await res.json()
            if (!res.ok) {
                console.error("Clock out failed (API Response):", data)
                throw new Error(data.details || data.error || "Clock out failed")
            }

            setStatus("clocked-out")
            toast.success("Shift ended successfully!")
        } catch (error: any) {
            toast.error(error.message)
            throw error
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
                <div className="lg:col-span-12 flex justify-center py-4">
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
                                <Calendar className="h-3 w-3" />
                                This Week
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="text-2xl font-bold text-neutral-900">32.5 hrs</div>
                            <p className="text-sm font-medium text-emerald-600 mt-1">
                                On track for 40hr goal
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
                            <div className="text-2xl font-bold text-neutral-900">Tomorrow</div>
                            <p className="text-sm font-medium text-neutral-500 mt-1">
                                09:00 AM • Main Street
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
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
