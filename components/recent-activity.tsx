"use client"

import { useEffect, useState } from "react"
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { CheckCircle2, Clock } from "lucide-react"
import { useAuth } from "@/components/auth-context"

interface TimeLog {
    id: string
    userId: string
    type: "in" | "out"
    timestamp: any // Firestore Timestamp
    locationId: string
}

export function RecentActivity({ locationId, limitCount }: { locationId: string, limitCount?: number }) {
    const { userData } = useAuth()
    const [logs, setLogs] = useState<(TimeLog & { userName: string })[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!userData?.organizationId) return
        const orgId = userData.organizationId

        const fetchLogs = async () => {
            setLoading(true)
            try {
                // 1. Fetch recent logs from organization sub-collection
                const q = query(
                    collection(db, "organizations", orgId, "time_entries"),
                    where("locationId", "==", locationId),
                    orderBy("timestamp", "desc"),
                    limit(limitCount || 20)
                )

                const querySnapshot = await getDocs(q)
                const allLogs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as TimeLog))

                // 2. Filter by location (Client-side)
                const locationLogs = allLogs.filter(log => log.locationId === locationId)

                // 3. Extract Unique User IDs
                const userIds = Array.from(new Set(locationLogs.map(log => log.userId)))
                const usersMap: Record<string, string> = {}

                // 4. Fetch User Details
                await Promise.all(
                    userIds.map(async (uid) => {
                        try {
                            if (!usersMap[uid]) { // Avoid duplicate fetches if we cache or similar
                                const userSnap = await getDoc(doc(db, "users", uid))
                                usersMap[uid] = userSnap.exists() ? userSnap.data().name : "Unknown User"
                            }
                        } catch (e) {
                            usersMap[uid] = "Unknown"
                        }
                    })
                )

                // 5. Merge & Limit
                let enrichedLogs = locationLogs.map(log => ({
                    ...log,
                    userName: usersMap[log.userId] || "Unknown User"
                }))

                if (limitCount) {
                    enrichedLogs = enrichedLogs.slice(0, limitCount)
                }

                setLogs(enrichedLogs)
            } catch (error) {
                console.error("Error fetching logs:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchLogs()
    }, [locationId, limitCount, userData?.organizationId])

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
