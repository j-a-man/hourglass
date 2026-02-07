"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import { DollarSign, Clock, TrendingUp } from "lucide-react"

export function TechnicianStats() {
    const { user, userData } = useAuth()
    const [stats, setStats] = useState({
        totalHours: 0,
        earnings: 0,
        daysWorked: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user || !userData) return

        const fetchWeeklyStats = async () => {
            try {
                // Calculate start of period (14 days ago)
                const now = new Date()
                const startOfPeriod = new Date(now)
                startOfPeriod.setDate(now.getDate() - 13) // 14 days including today
                startOfPeriod.setHours(0, 0, 0, 0)

                const q = query(
                    collection(db, "organizations", userData.organizationId, "time_entries"),
                    where("userId", "==", user.uid),
                    where("timestamp", ">=", Timestamp.fromDate(startOfPeriod))
                )

                const snapshot = await getDocs(q)
                const logs = snapshot.docs.map(doc => doc.data())

                // Sort by time
                logs.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis())

                let totalMs = 0
                let days = new Set()

                // Simple calculation: sum durations between "in" and "out"
                for (let i = 0; i < logs.length; i++) {
                    const log = logs[i]
                    // Track unique days
                    const dayKey = log.timestamp.toDate().toDateString()
                    days.add(dayKey)

                    if (log.type === "in") {
                        // Look for next "out"
                        const nextLog = logs[i + 1]
                        if (nextLog && nextLog.type === "out") {
                            totalMs += nextLog.timestamp.toMillis() - log.timestamp.toMillis()
                        } else if (!nextLog) {
                            // Currently clocked in - add time until now
                            totalMs += Date.now() - log.timestamp.toMillis()
                        }
                    }
                }

                const totalHours = totalMs / (1000 * 60 * 60)
                const rate = userData?.hourlyRate || 0
                const earnings = totalHours * rate

                setStats({
                    totalHours,
                    earnings,
                    daysWorked: days.size
                })
            } catch (err) {
                console.error("Error fetching stats:", err)
            } finally {
                setLoading(false)
            }
        }

        fetchWeeklyStats()
    }, [user, userData])

    if (loading) return <div className="animate-pulse h-24 bg-white/20 rounded-2xl w-full" />

    // Formatter for currency
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    })

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* EARNINGS CARD */}
            <div className="glass-card p-5 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <DollarSign size={48} className="text-green-600" />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Bi-Weekly Period</p>
                <h3 className="text-2xl font-black text-slate-800">
                    {formatter.format(stats.earnings)}
                </h3>
                <p className="text-xs text-green-600 font-bold mt-2 flex items-center gap-1">
                    <TrendingUp size={12} />
                    <span>Based on ${userData?.hourlyRate || 0}/hr</span>
                </p>
            </div>

            {/* HOURS CARD */}
            <div className="glass-card p-5 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Clock size={48} className="text-indigo-600" />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Hours Worked</p>
                <h3 className="text-2xl font-black text-slate-800">
                    {stats.totalHours.toFixed(1)} <span className="text-sm font-medium text-slate-400">hrs</span>
                </h3>
                <p className="text-xs text-indigo-600 font-bold mt-2">
                    {stats.daysWorked} days active
                </p>
            </div>
            {/* UPCOMING PAY CARD */}
            <div className="glass-card p-5 relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-600 text-white col-span-2 md:col-span-1">
                <div className="absolute top-0 right-0 p-3 opacity-20">
                    <DollarSign size={48} className="text-white" />
                </div>
                <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest mb-1">Est. Paycheck</p>
                <h3 className="text-2xl font-black text-white">
                    {formatter.format(stats.earnings * 0.85)}*
                </h3>
                <p className="text-[10px] text-indigo-200 mt-2">
                    *Approximation after taxes
                </p>
            </div>
        </div>
    )
}
