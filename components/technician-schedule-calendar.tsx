"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns"
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

import { getEffectiveShifts, EffectiveShift } from "@/lib/services/schedule-utils"

export function TechnicianScheduleCalendar() {
    const { user, userData } = useAuth()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [shifts, setShifts] = useState<EffectiveShift[]>([])
    const [loading, setLoading] = useState(true)

    const fetchShifts = async () => {
        if (!user || !userData?.organizationId) return
        const orgId = userData.organizationId
        setLoading(true)
        try {
            const start = startOfMonth(currentDate)
            const end = endOfMonth(currentDate)
            const queryStart = startOfWeek(start)
            const queryEnd = endOfWeek(end)

            const effectiveShifts = await getEffectiveShifts(
                orgId,
                user.uid,
                queryStart,
                queryEnd
            )

            setShifts(effectiveShifts)
        } catch (error) {
            console.error("Error fetching shifts:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchShifts()
    }, [currentDate, user, userData?.organizationId])

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
                    const dayShifts = shifts.filter(s => isSameDay(s.startTime, day))
                    dayShifts.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

                    return (
                        <div
                            key={day.toString()}
                            className={cn(
                                "min-h-[100px] p-2 border-b border-r border-slate-200/50 relative group transition-colors",
                                !isSameMonth(day, monthStart) ? 'bg-slate-50/50 text-slate-400' : 'bg-white/20 text-slate-800',
                                isSameDay(day, new Date()) ? 'bg-indigo-50/80 ring-inset ring-2 ring-indigo-400' : ''
                            )}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={cn("text-sm font-semibold ml-1", !isSameMonth(day, monthStart) && 'opacity-50')}>
                                    {format(day, "d")}
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                {dayShifts.map(shift => (
                                    <div
                                        key={shift.id}
                                        className={cn(
                                            "text-xs p-2.5 rounded-lg border transition-colors cursor-default shadow-sm group/shift",
                                            shift.isVirtual
                                                ? "bg-neutral-50 border-neutral-200 text-neutral-600 border-dashed"
                                                : "bg-indigo-50 border-indigo-100/50 hover:bg-indigo-100 text-indigo-900"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 font-bold mb-1">
                                            <Clock size={12} className={cn("shrink-0", shift.isVirtual ? "text-neutral-400" : "text-indigo-500")} />
                                            <span>
                                                {format(shift.startTime, "h:mm a")} - {format(shift.endTime, "h:mm a")}
                                            </span>
                                        </div>
                                        <div className={cn(
                                            "flex items-center gap-1.5 text-[11px] font-medium ml-0.5",
                                            shift.isVirtual ? "text-neutral-500" : "text-indigo-700/80"
                                        )}>
                                            <MapPin size={10} className="shrink-0" />
                                            <span className="truncate">{shift.locationName || "Workplace"}</span>
                                        </div>
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
