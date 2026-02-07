"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import { format, subDays, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths } from "date-fns"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, List, X, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react"
import { useAuth } from "@/components/auth-context"

interface AdminTimeLogsProps {
    locationId: string
}

interface UserStats {
    userId: string
    userName: string
    totalHours: number
    assignedHours: number
    adherence: number
    logs: any[]
    shifts: any[]
}

export function AdminTimeLogs({ locationId }: AdminTimeLogsProps) {
    const { userData } = useAuth()
    const [stats, setStats] = useState<UserStats[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedUser, setSelectedUser] = useState<UserStats | null>(null)
    const [detailView, setDetailView] = useState<"list" | "calendar">("list")

    const fetchData = async () => {
        if (!userData?.organizationId) return
        const orgId = userData.organizationId
        setLoading(true)

        try {
            // 1. Define Period (Last 14 Days)
            const endDate = new Date()
            const startDate = subDays(endDate, 13) // Include today
            startDate.setHours(0, 0, 0, 0)

            // 2. Fetch Users for this organization
            const usersQ = query(
                collection(db, "users"),
                where("organizationId", "==", orgId),
                where("locationId", "==", locationId)
            )
            const usersSnap = await getDocs(usersQ)
            const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

            // 3. Fetch Logs (time_entries) & Shifts from organization sub-collection
            const logsQ = query(
                collection(db, "organizations", orgId, "time_entries"),
                where("locationId", "==", locationId),
                where("timestamp", ">=", Timestamp.fromDate(startDate))
            )
            const shiftsQ = query(
                collection(db, "organizations", orgId, "shifts"),
                where("locationId", "==", locationId),
                where("startTime", ">=", Timestamp.fromDate(startDate))
            )

            const [logsSnap, shiftsSnap] = await Promise.all([getDocs(logsQ), getDocs(shiftsQ)])
            const allLogs = logsSnap.docs.map(d => d.data())
            const allShifts = shiftsSnap.docs.map(d => d.data())

            // 4. Process per User
            const userStats: UserStats[] = users.map((user: any) => {
                const userLogs = allLogs.filter((l: any) => l.userId === user.id)
                const userShifts = allShifts.filter((s: any) => s.userId === user.id)

                // Calc Worked Hours
                let workedHours = 0
                // Sort logs
                userLogs.sort((a: any, b: any) => a.timestamp.toMillis() - b.timestamp.toMillis())
                for (let i = 0; i < userLogs.length; i++) {
                    if (userLogs[i].type === "in") {
                        const next = userLogs[i + 1]
                        if (next && next.type === "out") {
                            workedHours += (next.timestamp.toMillis() - userLogs[i].timestamp.toMillis()) / (1000 * 60 * 60)
                        }
                    }
                }

                // Calc Assigned Hours
                let assignedHours = 0
                userShifts.forEach((s: any) => {
                    assignedHours += (s.endTime.toMillis() - s.startTime.toMillis()) / (1000 * 60 * 60)
                })

                const adherence = assignedHours > 0 ? (workedHours / assignedHours) * 100 : 0

                return {
                    userId: user.id,
                    userName: user.name || "Unknown",
                    totalHours: workedHours,
                    assignedHours,
                    adherence,
                    logs: userLogs,
                    shifts: userShifts
                }
            })

            setStats(userStats)

        } catch (err) {
            console.error("Error loading time log stats:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (locationId && userData?.organizationId) fetchData()
    }, [locationId, userData?.organizationId])

    if (loading) return <div className="text-slate-400 text-center py-10">Loading stats...</div>

    return (
        <div className="relative min-h-[500px]">
            {/* GRID SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {stats.map(user => (
                    <div key={user.userId} className="p-4 rounded-2xl bg-white/50 border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-3 mb-4">
                            <Avatar>
                                <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">
                                    {user.userName[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div className="overflow-hidden">
                                <div className="font-bold text-slate-800 truncate">{user.userName}</div>
                                <div className="text-xs text-slate-500">Technician</div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Worked</span>
                                <span className="font-bold text-slate-700">{user.totalHours.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ {user.assignedHours.toFixed(1)} hrs</span></span>
                            </div>
                            <Progress value={Math.min(user.adherence, 100)} className="h-2" />

                            <Button
                                variant="outline"
                                className="w-full text-xs font-bold"
                                onClick={() => setSelectedUser(user)}
                            >
                                View Logs
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* DETAIL OVERLAY */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
                        {/* HEADER */}
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">{selectedUser.userName}</h2>
                                <p className="text-sm text-slate-500">Time Log Details</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex p-1 bg-slate-200/50 rounded-lg">
                                    <button
                                        onClick={() => setDetailView("list")}
                                        className={`p-1.5 rounded-md transition-all ${detailView === "list" ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
                                    >
                                        <List size={16} />
                                    </button>
                                    <button
                                        onClick={() => setDetailView("calendar")}
                                        className={`p-1.5 rounded-md transition-all ${detailView === "calendar" ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
                                    >
                                        <CalendarIcon size={16} />
                                    </button>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedUser(null)}>
                                    <X size={20} className="text-slate-400 hover:text-red-500" />
                                </Button>
                            </div>
                        </div>

                        {/* CONTENT */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                            {detailView === "list" ? (
                                <TimeLogList logs={selectedUser.logs} />
                            ) : (
                                <TimeLogCalendar logs={selectedUser.logs} shifts={selectedUser.shifts} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// --- SUB COMPONENTS ---

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function TimeLogList({ logs }: { logs: any[] }) {
    // Reverse chronological
    const sorted = [...logs].sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())

    if (sorted.length === 0) return <div className="text-center py-10 text-slate-400">No logs found.</div>

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader className="bg-slate-100/50">
                    <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Location</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sorted.map((log, i) => (
                        <TableRow key={i}>
                            <TableCell>
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${log.type === "in" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                                    }`}>
                                    {log.type === "in" ? "Clock In" : "Clock Out"}
                                </span>
                            </TableCell>
                            <TableCell className="font-bold text-slate-700">
                                {log.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                            <TableCell className="text-slate-500">
                                {log.timestamp.toDate().toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-slate-500">
                                {log.locationId ? `${log.locationId} Store` : "N/A"}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

function TimeLogCalendar({ logs, shifts }: { logs: any[], shifts: any[] }) {
    const [currentDate, setCurrentDate] = useState(new Date())

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

    return (
        <div className="bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-700">{format(currentDate, "MMMM yyyy")}</h3>
                <div className="flex gap-1">
                    <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded-full"><ChevronLeft size={16} /></button>
                    <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded-full"><ChevronRight size={16} /></button>
                </div>
            </div>
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50 text-xs text-slate-500 font-bold text-center py-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr">
                {calendarDays.map(day => {
                    // Find logs for this day
                    const dayLogs = logs.filter(l => isSameDay(l.timestamp.toDate(), day))
                    dayLogs.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis())

                    // Find shifts
                    const dayShifts = shifts.filter(s => isSameDay(s.startTime.toDate(), day))

                    const isOutside = !isSameMonth(day, monthStart)

                    return (
                        <div key={day.toString()} className={`min-h-[100px] p-2 border-b border-r border-slate-100 ${isOutside ? "bg-slate-50/30 text-slate-300" : ""}`}>
                            <div className="text-xs font-bold mb-2">{format(day, "d")}</div>

                            {/* Shifts (Planned) */}
                            {dayShifts.map((s, i) => (
                                <div key={'s' + i} className="mb-1 px-1.5 py-0.5 rounded text-[9px] bg-slate-100 text-slate-500 flex items-center gap-1 opacity-70">
                                    <Clock size={8} />
                                    {format(s.startTime.toDate(), "h:mm")} - {format(s.endTime.toDate(), "h:mm")} (Plan)
                                </div>
                            ))}

                            {/* Logs (Actual) */}
                            {dayLogs.map((l, i) => (
                                <div key={'l' + i} className={`mb-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${l.type === 'in' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                                    {l.type === 'in' ? "IN" : "OUT"} {format(l.timestamp.toDate(), "h:mm a")}
                                </div>
                            ))}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
