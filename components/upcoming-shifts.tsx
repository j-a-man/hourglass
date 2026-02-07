"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy, limit as firestoreLimit, Timestamp } from "firebase/firestore"
import { Calendar, Clock, MapPin, AlertCircle, ArrowRight } from "lucide-react"
import Link from "next/link"

interface UpcomingShiftsProps {
    limit?: number
}

export function UpcomingShifts({ limit }: UpcomingShiftsProps) {
    const { user, userData } = useAuth()
    const [shifts, setShifts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!user || !userData?.organizationId) return
        const orgId = userData.organizationId

        const fetchShifts = async () => {
            try {
                // Get start of today
                const today = new Date()
                today.setHours(0, 0, 0, 0)

                let q = query(
                    collection(db, "organizations", orgId, "shifts"),
                    where("userId", "==", user.uid),
                    where("startTime", ">=", Timestamp.fromDate(today)),
                    orderBy("startTime", "asc")
                )

                if (limit) {
                    q = query(q, firestoreLimit(limit))
                }

                const snapshot = await getDocs(q)
                const fetchedShifts = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                setShifts(fetchedShifts)
            } catch (err: any) {
                console.error("Error fetching shifts:", err)
                if (err.message && err.message.includes("index")) {
                    setError("Missing Firestore Index. Check console for link.")
                } else {
                    setError("Failed to load shifts.")
                }
            } finally {
                setLoading(false)
            }
        }

        fetchShifts()
    }, [user, userData?.organizationId, limit])

    if (loading) return <div className="animate-pulse h-24 bg-white/20 rounded-2xl w-full" />

    if (error) {
        return (
            <div className="glass-card p-4 border-l-4 border-red-500 bg-red-50/50">
                <div className="flex items-center gap-2 text-red-700 font-bold text-sm mb-1">
                    <AlertCircle size={16} />
                    <span>Error Loading Shifts</span>
                </div>
                <p className="text-xs text-red-600">{error}</p>
            </div>
        )
    }

    return (
        <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4 opacity-70">
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-slate-700" />
                    <span className="text-sm font-bold uppercase tracking-wide text-slate-700">Upcoming Shifts</span>
                </div>
            </div>

            <div className="space-y-3">
                {shifts.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4">No upcoming shifts scheduled.</p>
                ) : (
                    <>
                        {shifts.map((shift) => {
                            const start = shift.startTime.toDate()
                            const end = shift.endTime.toDate()
                            const dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                            const timeStr = `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`

                            // Calculate duration
                            const hours = Math.round(((end.getTime() - start.getTime()) / (1000 * 60 * 60)) * 10) / 10

                            return (
                                <div key={shift.id} className="flex items-center justify-between p-3 rounded-xl bg-white/40 border border-white/50 hover:bg-white/60 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-indigo-50 text-indigo-600 font-bold rounded-lg p-2 text-center min-w-[3.5rem]">
                                            <div className="text-[10px] uppercase tracking-wider">{start.toLocaleDateString([], { weekday: 'short' })}</div>
                                            <div className="text-lg leading-none">{start.getDate()}</div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-0.5">
                                                <Clock size={12} />
                                                {timeStr}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-slate-400">
                                                <MapPin size={12} />
                                                <span className="capitalize">{shift.locationId} Store</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-bold text-slate-600 bg-white/50 px-2 py-1 rounded-md">
                                            {hours} hrs
                                        </span>
                                    </div>
                                </div>
                            )
                        })}

                        {limit && shifts.length >= limit && (
                            <Link
                                href="/dashboard/technician/schedule"
                                className="w-full mt-4 flex items-center justify-center py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                                View All Shifts
                                <ArrowRight size={14} className="ml-1" />
                            </Link>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
