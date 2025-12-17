"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore"
import { Calendar, Clock, MapPin } from "lucide-react"

export function UpcomingShifts() {
    const { user } = useAuth()
    const [shifts, setShifts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return

        const fetchShifts = async () => {
            try {
                const now = new Date()
                const q = query(
                    collection(db, "shifts"),
                    where("userId", "==", user.uid),
                    where("startTime", ">=", Timestamp.fromDate(now)),
                    orderBy("startTime", "asc"),
                    limit(3)
                )

                const snapshot = await getDocs(q)
                const fetchedShifts = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                setShifts(fetchedShifts)
            } catch (err) {
                console.error("Error fetching shifts:", err)
            } finally {
                setLoading(false)
            }
        }

        fetchShifts()
    }, [user])

    if (loading) return <div className="animate-pulse h-24 bg-white/20 rounded-2xl w-full" />

    return (
        <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4 opacity-70">
                <Calendar size={18} className="text-slate-700" />
                <span className="text-sm font-bold uppercase tracking-wide text-slate-700">Upcoming Shifts</span>
            </div>

            <div className="space-y-3">
                {shifts.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4">No upcoming shifts scheduled.</p>
                ) : (
                    shifts.map((shift) => {
                        const start = shift.startTime.toDate()
                        const end = shift.endTime.toDate()
                        const dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                        const timeStr = `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`

                        // Calculate duration
                        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

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
                    })
                )}
            </div>
        </div>
    )
}
