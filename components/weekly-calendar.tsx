"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import { History, CheckCircle2, Clock } from "lucide-react"

export function WeeklyCalendar() {
    const { user } = useAuth()
    const [dailyLogs, setDailyLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Generate last 7 days sorted descending (today first)
    const getLast7Days = () => {
        const days = []
        for (let i = 0; i < 7; i++) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            days.push(d)
        }
        return days
    }

    useEffect(() => {
        if (!user) return

        const fetchLogs = async () => {
            try {
                // Get logs for last 7 days
                const end = new Date()
                const start = new Date()
                start.setDate(start.getDate() - 7)

                const q = query(
                    collection(db, "time_logs"),
                    where("userId", "==", user.uid),
                    where("timestamp", ">=", Timestamp.fromDate(start))
                )

                const snapshot = await getDocs(q)
                const logs = snapshot.docs.map(doc => doc.data())

                // Group by date
                const days = getLast7Days().map(date => {
                    // Find logs for this specific date
                    const dayLogs = logs.filter(log => {
                        const logDate = log.timestamp.toDate()
                        return logDate.getDate() === date.getDate() &&
                            logDate.getMonth() === date.getMonth() &&
                            logDate.getFullYear() === date.getFullYear()
                    })

                    // Sort by time
                    dayLogs.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis())

                    // Calculate daily total
                    let totalMs = 0
                    if (dayLogs.length > 0) {
                        for (let i = 0; i < dayLogs.length; i++) {
                            if (dayLogs[i].type === "in") {
                                const next = dayLogs[i + 1]
                                if (next && next.type === "out") {
                                    totalMs += next.timestamp.toMillis() - dayLogs[i].timestamp.toMillis()
                                } else if (!next && date.getDate() === new Date().getDate()) {
                                    // Today still clocked in
                                    totalMs += Date.now() - dayLogs[i].timestamp.toMillis()
                                }
                            }
                        }
                    }

                    return {
                        date,
                        logs: dayLogs,
                        totalHours: totalMs / (1000 * 60 * 60)
                    }
                })

                setDailyLogs(days)
            } catch (err) {
                console.error("Error fetching logs:", err)
            } finally {
                setLoading(false)
            }
        }

        fetchLogs()
    }, [user])

    if (loading) return <div className="animate-pulse h-48 bg-white/20 rounded-2xl w-full" />

    return (
        <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-6 opacity-70">
                <History size={18} className="text-slate-700" />
                <span className="text-sm font-bold uppercase tracking-wide text-slate-700">Past 7 Days</span>
            </div>

            <div className="space-y-4">
                {dailyLogs.map((day, idx) => (
                    <div key={idx} className="flex gap-4">
                        {/* Date Col */}
                        <div className="flex flex-col items-center min-w-[3rem]">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </span>
                            <span className={`text-lg font-bold ${day.totalHours > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>
                                {day.date.getDate()}
                            </span>
                            {idx !== dailyLogs.length - 1 && (
                                <div className="w-px h-full bg-slate-200 mt-2"></div>
                            )}
                        </div>

                        {/* Activity Col */}
                        <div className="flex-1 pb-6">
                            {day.totalHours > 0 ? (
                                <div className="bg-white/40 border border-white/50 rounded-xl p-3 hover:bg-white/60 transition-colors">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                            {day.totalHours.toFixed(1)} hrs worked
                                        </span>
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {day.logs.map((log: any, i: number) => (
                                            <div key={i} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border ${log.type === 'in' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'
                                                }`}>
                                                {log.type === 'in' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                                <span className="font-mono">{log.timestamp.toDate().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex items-center">
                                    <span className="text-xs text-slate-300 italic">No activity</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
