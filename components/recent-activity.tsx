"use client"

import { useEffect, useState } from "react"
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { CheckCircle2, Clock } from "lucide-react"

interface TimeLog {
    id: string
    userId: string
    type: "in" | "out"
    timestamp: any // Firestore Timestamp
    locationId: string
}

export function RecentActivity({ locationId }: { locationId: string }) {
    const [logs, setLogs] = useState<(TimeLog & { userName: string })[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true)
            try {
                // 1. Fetch recent logs (limit 20)
                const q = query(
                    collection(db, "time_logs"),
                    orderBy("timestamp", "desc"),
                    limit(20)
                )

                const querySnapshot = await getDocs(q)
                const allLogs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as TimeLog))

                // 2. Filter by location (Client-side to avoid composite index requirement for now)
                const locationLogs = allLogs.filter(log => log.locationId === locationId)

                // 3. Extract Unique User IDs
                const userIds = Array.from(new Set(locationLogs.map(log => log.userId)))
                const usersMap: Record<string, string> = {}

                // 4. Fetch User Details in Parallel (Direct Doc Lookup)
                await Promise.all(
                    userIds.map(async (uid) => {
                        try {
                            const userSnap = await getDoc(doc(db, "users", uid))
                            if (userSnap.exists()) {
                                usersMap[uid] = userSnap.data().name
                            } else {
                                usersMap[uid] = "Unknown User"
                            }
                        } catch (e) {
                            console.warn(`Failed to fetch user ${uid}`, e)
                            usersMap[uid] = "Unknown"
                        }
                    })
                )

                // 5. Merge Data
                const enrichedLogs = locationLogs.map(log => ({
                    ...log,
                    userName: usersMap[log.userId] || "Unknown User"
                }))

                setLogs(enrichedLogs)
            } catch (error) {
                console.error("Error fetching logs:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchLogs()
    }, [locationId])

    if (loading) {
        return <div className="text-center py-4 text-slate-400 text-sm">Loading activity...</div>
    }

    if (logs.length === 0) {
        return <div className="text-center py-4 text-slate-400 text-sm">No recent activity for this location.</div>
    }

    return (
        <div className="space-y-4">
            {logs.map((log) => (
                <div
                    key={log.id}
                    className="flex items-center justify-between p-4 bg-white/40 border border-white/50 rounded-lg shadow-sm backdrop-blur-sm"
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${log.type === "in" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                            {log.type === "in" ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 text-sm">{log.userName}</p>
                            <p className="text-xs text-slate-500 capitalize">{log.type === "in" ? "Clock In" : "Clock Out"}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-slate-600">
                            {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                            {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleDateString() : ""}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    )
}
