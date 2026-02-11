"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/components/auth-context"
import { getEffectiveShifts, EffectiveShift } from "@/lib/services/schedule-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    format,
    startOfWeek,
    endOfWeek,
    addDays,
    isSameDay,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    addWeeks,
    subWeeks,
    addMonths,
    subMonths,
    differenceInMinutes,
    startOfDay,
    endOfDay,
    isAfter,
    isBefore,
} from "date-fns"
import {
    Calendar,
    Clock,
    MapPin,
    ChevronLeft,
    ChevronRight,
    Briefcase,
    TrendingUp,
    Sun,
    Moon,
    Sunrise,
} from "lucide-react"

type ViewMode = "week" | "month"

export default function EmployeeSchedulePage() {
    const { user, userData } = useAuth()
    const [loading, setLoading] = useState(true)
    const [shifts, setShifts] = useState<EffectiveShift[]>([])
    const [currentDate, setCurrentDate] = useState(new Date())
    const [viewMode, setViewMode] = useState<ViewMode>("week")
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())

    // Date ranges
    const dateRange = useMemo(() => {
        if (viewMode === "week") {
            return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) }
        }
        return {
            start: startOfWeek(startOfMonth(currentDate)),
            end: endOfWeek(endOfMonth(currentDate)),
        }
    }, [viewMode, currentDate])

    const days = useMemo(() => {
        if (viewMode === "week") {
            return Array.from({ length: 7 }, (_, i) => addDays(dateRange.start, i))
        }
        return eachDayOfInterval({ start: dateRange.start, end: dateRange.end })
    }, [viewMode, dateRange])

    useEffect(() => {
        if (!user || !userData?.organizationId) return

        const fetchShifts = async () => {
            setLoading(true)
            try {
                const effective = await getEffectiveShifts(
                    userData.organizationId,
                    user.uid,
                    dateRange.start,
                    dateRange.end
                )
                setShifts(effective)
            } catch (error) {
                console.error("Error fetching schedule:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchShifts()
    }, [user, userData?.organizationId, dateRange.start.getTime(), dateRange.end.getTime()])

    // Navigation
    const handlePrev = () => {
        if (viewMode === "week") setCurrentDate(subWeeks(currentDate, 1))
        else setCurrentDate(subMonths(currentDate, 1))
    }
    const handleNext = () => {
        if (viewMode === "week") setCurrentDate(addWeeks(currentDate, 1))
        else setCurrentDate(addMonths(currentDate, 1))
    }

    // Stats
    const weekShifts = useMemo(() => {
        const ws = startOfWeek(currentDate)
        const we = endOfWeek(currentDate)
        return shifts.filter(
            (s) => s.startTime >= ws && s.startTime <= we
        )
    }, [shifts, currentDate])

    const totalMinutesThisWeek = useMemo(
        () => weekShifts.reduce((acc, s) => acc + differenceInMinutes(s.endTime, s.startTime), 0),
        [weekShifts]
    )
    const totalHoursThisWeek = (totalMinutesThisWeek / 60).toFixed(1)
    const totalShiftsThisWeek = weekShifts.length

    const nextUpcomingShift = useMemo(
        () => shifts.find((s) => isAfter(s.startTime, new Date())),
        [shifts]
    )

    // Shift time of day helper
    const getTimeOfDay = (date: Date) => {
        const h = date.getHours()
        if (h < 12) return { label: "Morning", icon: Sunrise, color: "text-amber-500" }
        if (h < 17) return { label: "Afternoon", icon: Sun, color: "text-orange-500" }
        return { label: "Evening", icon: Moon, color: "text-indigo-500" }
    }

    // Selected day shifts
    const selectedDayShifts = useMemo(
        () => shifts.filter((s) => isSameDay(s.startTime, selectedDate)),
        [shifts, selectedDate]
    )

    return (
        <div className="space-y-8 max-w-6xl mx-auto px-4 lg:px-0 pb-12">
            {/* Header */}
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
                    My Schedule
                </h1>
                <p className="text-neutral-500 font-medium tracking-tight">
                    {format(new Date(), "EEEE, MMMM do")} • Your upcoming shifts and hours.
                </p>
            </header>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="rounded-2xl border-neutral-100 shadow-sm overflow-hidden">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Clock className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                Hours This Week
                            </p>
                            <p className="text-2xl font-black text-neutral-900 tracking-tighter">
                                {loading ? "—" : `${totalHoursThisWeek}h`}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-neutral-100 shadow-sm overflow-hidden">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <Briefcase className="h-6 w-6 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                Shifts This Week
                            </p>
                            <p className="text-2xl font-black text-neutral-900 tracking-tighter">
                                {loading ? "—" : totalShiftsThisWeek}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-neutral-100 shadow-sm overflow-hidden">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-violet-500/10 flex items-center justify-center shrink-0">
                            <TrendingUp className="h-6 w-6 text-violet-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                Next Shift
                            </p>
                            <p className="text-lg font-black text-neutral-900 tracking-tighter">
                                {loading
                                    ? "—"
                                    : nextUpcomingShift
                                        ? isSameDay(nextUpcomingShift.startTime, new Date())
                                            ? "Today"
                                            : format(nextUpcomingShift.startTime, "EEE, MMM d")
                                        : "None"}
                            </p>
                            {nextUpcomingShift && (
                                <p className="text-[10px] font-bold text-neutral-400">
                                    {format(nextUpcomingShift.startTime, "h:mm a")} • {nextUpcomingShift.locationName}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Calendar Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white rounded-3xl border border-neutral-100 p-4 shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-black text-neutral-900 tracking-tighter">
                        {viewMode === "week"
                            ? `${format(startOfWeek(currentDate), "MMM d")} – ${format(endOfWeek(currentDate), "MMM d, yyyy")}`
                            : format(currentDate, "MMMM yyyy")}
                    </h2>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={handlePrev}>
                            <ChevronLeft className="h-5 w-5 text-neutral-400" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg font-bold text-[10px] uppercase tracking-wider h-8 px-3 border-neutral-200"
                            onClick={() => {
                                const today = new Date()
                                setCurrentDate(today)
                                setSelectedDate(today)
                            }}
                        >
                            Today
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={handleNext}>
                            <ChevronRight className="h-5 w-5 text-neutral-400" />
                        </Button>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "rounded-lg font-bold text-[10px] uppercase tracking-wider px-4",
                            viewMode === "week" ? "bg-white text-primary shadow-sm" : "text-neutral-500"
                        )}
                        onClick={() => setViewMode("week")}
                    >
                        Week
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "rounded-lg font-bold text-[10px] uppercase tracking-wider px-4",
                            viewMode === "month" ? "bg-white text-primary shadow-sm" : "text-neutral-500"
                        )}
                        onClick={() => setViewMode("month")}
                    >
                        Month
                    </Button>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-16">
                    <div className="h-8 w-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
            )}

            {/* Week View */}
            {!loading && viewMode === "week" && (
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                    {days.map((day, idx) => {
                        const isToday = isSameDay(day, new Date())
                        const dayShifts = shifts.filter((s) => isSameDay(s.startTime, day))
                        const isPast = isBefore(endOfDay(day), new Date()) && !isToday

                        return (
                            <div key={idx} className={cn("space-y-3", isPast && "opacity-40")}>
                                {/* Day Header */}
                                <div
                                    className={cn(
                                        "text-center py-3 rounded-2xl border transition-colors",
                                        isToday
                                            ? "bg-primary/5 border-primary/10"
                                            : "bg-neutral-50 border-transparent"
                                    )}
                                >
                                    <p
                                        className={cn(
                                            "text-[10px] font-black uppercase tracking-widest",
                                            isToday ? "text-primary" : "text-neutral-400"
                                        )}
                                    >
                                        {format(day, "EEE")}
                                    </p>
                                    <p
                                        className={cn(
                                            "text-lg font-black tracking-tighter",
                                            isToday ? "text-primary" : "text-neutral-900"
                                        )}
                                    >
                                        {format(day, "d")}
                                    </p>
                                </div>

                                {/* Shift Cards */}
                                {dayShifts.map((shift) => {
                                    const tod = getTimeOfDay(shift.startTime)
                                    const duration = differenceInMinutes(shift.endTime, shift.startTime)
                                    const hours = Math.floor(duration / 60)
                                    const mins = duration % 60

                                    return (
                                        <div
                                            key={shift.id}
                                            className={cn(
                                                "group relative border rounded-2xl p-4 transition-all hover:shadow-md cursor-default",
                                                shift.isVirtual
                                                    ? "bg-neutral-50/50 border-dashed border-neutral-200"
                                                    : "bg-white border-neutral-100 shadow-sm"
                                            )}
                                        >
                                            {/* Time Badge */}
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <tod.icon className={cn("h-3 w-3", tod.color)} />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                                    {tod.label}
                                                </span>
                                            </div>

                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
                                                    <Clock className="h-3 w-3 text-neutral-400" />
                                                    <span>
                                                        {format(shift.startTime, "h:mm a")} – {format(shift.endTime, "h:mm a")}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 truncate">
                                                    <MapPin className="h-3 w-3" />
                                                    <span className="truncate">{shift.locationName}</span>
                                                </div>
                                                <div className="text-[10px] font-bold text-neutral-300">
                                                    {hours > 0 ? `${hours}h` : ""}{mins > 0 ? ` ${mins}m` : ""}
                                                </div>
                                            </div>

                                            {shift.isVirtual && (
                                                <div className="absolute top-2 right-2 text-[8px] font-black text-primary uppercase tracking-tighter bg-primary/5 px-1.5 py-0.5 rounded-md">
                                                    Recurring
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}

                                {dayShifts.length === 0 && (
                                    <div className="h-20 border border-dashed border-neutral-200 rounded-2xl flex items-center justify-center">
                                        <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">
                                            Off
                                        </p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Month View */}
            {!loading && viewMode === "month" && (
                <div className="space-y-8">
                    {/* Compact Grid */}
                    <div className="bg-white rounded-3xl border border-neutral-100 p-4 md:p-6 shadow-sm">
                        <div className="grid grid-cols-7 gap-px bg-neutral-100 border border-neutral-100 rounded-2xl overflow-hidden">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                                <div key={d} className="bg-neutral-50 py-2 text-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                        {d}
                                    </span>
                                </div>
                            ))}
                            {days.map((day, idx) => {
                                const isToday = isSameDay(day, new Date())
                                const isSelected = isSameDay(day, selectedDate)
                                const isCurrentMonth = isSameMonth(day, currentDate)
                                const dayShifts = shifts.filter((s) => isSameDay(s.startTime, day))

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedDate(day)}
                                        className={cn(
                                            "bg-white h-16 md:h-24 p-2 transition-all hover:bg-neutral-50 flex flex-col items-center justify-between group relative",
                                            !isCurrentMonth && "bg-neutral-50/50",
                                            isSelected && "bg-primary/5 ring-2 ring-inset ring-primary/20 z-10"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                                                isToday ? "bg-primary text-white" : "text-neutral-900",
                                                !isCurrentMonth && !isToday && "text-neutral-300",
                                                isSelected && !isToday && "text-primary bg-primary/10"
                                            )}
                                        >
                                            {format(day, "d")}
                                        </span>

                                        {dayShifts.length > 0 && (
                                            <div className="flex -space-x-1 overflow-hidden">
                                                {dayShifts.slice(0, 3).map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className="h-1.5 w-1.5 rounded-full bg-primary/40 ring-1 ring-white"
                                                    />
                                                ))}
                                                {dayShifts.length > 3 && (
                                                    <div className="text-[8px] font-black text-neutral-400 ml-1">
                                                        +{dayShifts.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Selected Day Detail */}
                    <div className="bg-white rounded-3xl border border-neutral-100 p-6 md:p-8 shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center">
                                <Calendar className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-neutral-900 tracking-tighter">
                                    {format(selectedDate, "EEEE, MMMM do")}
                                </h3>
                                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                                    {selectedDayShifts.length} shift{selectedDayShifts.length !== 1 ? "s" : ""} scheduled
                                </p>
                            </div>
                        </div>

                        {selectedDayShifts.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center bg-neutral-50/50 rounded-3xl border-2 border-dashed border-neutral-100">
                                <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-4">
                                    <Calendar className="h-8 w-8 text-neutral-200" />
                                </div>
                                <p className="text-sm font-black text-neutral-400 uppercase tracking-widest">
                                    No shifts scheduled
                                </p>
                                <p className="text-xs font-bold text-neutral-300 mt-1">
                                    Enjoy your day off!
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedDayShifts.map((shift) => {
                                    const tod = getTimeOfDay(shift.startTime)
                                    const duration = differenceInMinutes(shift.endTime, shift.startTime)
                                    const hours = Math.floor(duration / 60)
                                    const mins = duration % 60

                                    return (
                                        <div
                                            key={shift.id}
                                            className={cn(
                                                "group border-2 rounded-2xl p-5 transition-all hover:border-primary/20 hover:shadow-lg",
                                                shift.isVirtual
                                                    ? "bg-neutral-50/50 border-dashed border-neutral-200"
                                                    : "bg-white border-neutral-50 shadow-sm"
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <tod.icon className={cn("h-4 w-4", tod.color)} />
                                                    <span className="text-xs font-black text-neutral-400 uppercase tracking-widest">
                                                        {tod.label} Shift
                                                    </span>
                                                </div>
                                                {shift.isVirtual && (
                                                    <span className="text-[9px] font-black text-primary uppercase tracking-tighter bg-primary/5 px-2 py-1 rounded-lg">
                                                        Recurring
                                                    </span>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2.5 text-sm font-bold text-neutral-900">
                                                    <Clock className="h-4 w-4 text-neutral-400" />
                                                    <span>
                                                        {format(shift.startTime, "h:mm a")} – {format(shift.endTime, "h:mm a")}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2.5 text-sm font-bold text-neutral-500">
                                                    <MapPin className="h-4 w-4 text-neutral-400" />
                                                    <span>{shift.locationName}</span>
                                                </div>
                                                <div className="flex items-center gap-2.5 text-xs font-bold text-neutral-400">
                                                    <Briefcase className="h-3.5 w-3.5" />
                                                    <span>
                                                        {hours > 0 ? `${hours} hour${hours !== 1 ? "s" : ""}` : ""}
                                                        {mins > 0 ? ` ${mins} min` : ""}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
