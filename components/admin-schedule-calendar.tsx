"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, Timestamp, deleteDoc, doc } from "firebase/firestore"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns"
import { ChevronLeft, ChevronRight, User, MapPin, Trash2 } from "lucide-react"
import { AddShiftDialog } from "@/components/add-shift-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"
import { useAuth } from "@/components/auth-context"

interface Shift {
    id: string
    userId: string
    userName: string
    locationId: string
    locationName?: string
    startTime: Timestamp
    endTime: Timestamp
}

interface AdminScheduleCalendarProps {
    locationId: string
}

export function AdminScheduleCalendar({ locationId }: AdminScheduleCalendarProps) {
    const { userData } = useAuth()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [shifts, setShifts] = useState<Shift[]>([])
    const [loading, setLoading] = useState(true)

    const fetchShifts = async () => {
        if (!userData?.organizationId) return
        const orgId = userData.organizationId
        setLoading(true)
        try {
            // Get range for query
            const start = startOfMonth(currentDate)
            const end = endOfMonth(currentDate)

            // Adjust query to include full weeks (buffer)
            const queryStart = startOfWeek(start)
            const queryEnd = endOfWeek(end)

            const q = query(
                collection(db, "organizations", orgId, "shifts"),
                where("locationId", "==", locationId),
                where("startTime", ">=", Timestamp.fromDate(queryStart)),
                where("startTime", "<=", Timestamp.fromDate(queryEnd))
            )

            const snapshot = await getDocs(q)
            const shiftsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Shift[]

            setShifts(shiftsData)
        } catch (error) {
            console.error("Error fetching shifts:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteShift = async (shiftId: string, e: React.MouseEvent) => {
        e.stopPropagation() // Prevent triggering parent click events if any
        if (!confirm("Are you sure you want to delete this shift?") || !userData?.organizationId) return
        const orgId = userData.organizationId

        try {
            await deleteDoc(doc(db, "organizations", orgId, "shifts", shiftId))
            toast.success("Shift deleted")
            fetchShifts()
        } catch (error) {
            console.error("Error deleting shift:", error)
            toast.error("Failed to delete shift")
        }
    }

    useEffect(() => {
        fetchShifts()
    }, [currentDate, locationId, userData?.organizationId])

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    })

    const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    return (
        <div className="flex flex-col h-full bg-white/50 backdrop-blur-sm rounded-xl overflow-hidden shadow-sm border border-white/60">
            {/* HEADER */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200/50">
                <h2 className="text-xl font-bold text-slate-800">
                    {format(currentDate, "MMMM yyyy")}
                </h2>
                <div className="flex gap-1">
                    <button onClick={prevMonth} className="p-2 hover:bg-white/80 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-white/80 rounded-full transition-colors">
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                    </button>
                </div>
            </div>

            {/* WEEKDAY HEADER */}
            <div className="grid grid-cols-7 border-b border-slate-200/50 bg-white/30">
                {WEEKDAYS.map(day => (
                    <div key={day} className="py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* GRID */}
            <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                {calendarDays.map((day, dayIdx) => {
                    const dayShifts = shifts.filter(s => isSameDay(s.startTime.toDate(), day))
                    dayShifts.sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis())

                    return (
                        <div
                            key={day.toString()}
                            className={`
                                min-h-[80px] p-1.5 border-b border-r border-slate-200/50 relative group transition-colors
                                ${!isSameMonth(day, monthStart) ? 'bg-slate-50/50 text-slate-400' : 'bg-white/20 text-slate-800'}
                                ${isSameDay(day, new Date()) ? 'bg-indigo-50/80 ring-inset ring-2 ring-indigo-400' : ''}
                            `}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-xs font-semibold ml-1 ${!isSameMonth(day, monthStart) ? 'opacity-50' : ''}`}>
                                    {format(day, "d")}
                                </span>

                                <AddShiftDialog
                                    defaultDate={day}
                                    onSuccess={fetchShifts}
                                    trigger={
                                        <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white rounded-full transition-all text-indigo-600">
                                            <span className="sr-only">Add Shift</span>
                                            <div className="text-[9px] font-bold bg-indigo-100 px-1.5 py-0.5 rounded-full">+</div>
                                        </button>
                                    }
                                />
                            </div>

                            <div className="space-y-1">
                                {dayShifts.map(shift => (
                                    <div
                                        key={shift.id}
                                        className="group/shift text-xs p-2 rounded-md bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 flex items-center justify-between transition-all cursor-default leading-tight relative"
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                            <div className="overflow-hidden">
                                                <div className="font-bold text-slate-800 truncate">{shift.userName.split(' ')[0]}</div>
                                                <div className="text-slate-500 truncate text-[10px] font-medium">
                                                    {format(shift.startTime.toDate(), "h:mm a")} - {format(shift.endTime.toDate(), "h:mm a")}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteShift(shift.id, e)}
                                            className="opacity-0 group-hover/shift:opacity-100 p-1 hover:bg-red-50 hover:text-red-500 rounded transition-all text-slate-400"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
