"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, User, MoreHorizontal, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-context"
import { getEffectiveShifts, EffectiveShift } from "@/lib/services/schedule-utils"
import { collection, query, getDocs, where, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format, startOfWeek, addDays, isSameDay, endOfWeek, startOfMonth, endOfMonth, addMonths, eachDayOfInterval, isSameMonth } from "date-fns"
import { Loader2 } from "lucide-react"
import { AddShiftDialog } from "@/components/add-shift-dialog"
import { EditShiftDialog } from "@/components/edit-shift-dialog"
import { getIanaTz } from "@/lib/services/timezone-utils"

type ViewMode = "week" | "month"

interface LocationTab {
    id: string
    name: string
}

export default function AdminSchedulePage() {
    const { userData } = useAuth()
    const [loading, setLoading] = useState(true)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [shifts, setShifts] = useState<EffectiveShift[]>([])
    const [users, setUsers] = useState<Record<string, { name: string }>>({})
    const [viewMode, setViewMode] = useState<ViewMode>("week")
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())

    // Location tabs
    const [locationTabs, setLocationTabs] = useState<LocationTab[]>([])
    const [selectedLocationTab, setSelectedLocationTab] = useState<string>("all")

    // Edit dialog
    const [editingShift, setEditingShift] = useState<EffectiveShift | null>(null)
    const [editDialogOpen, setEditDialogOpen] = useState(false)

    const dateRange = (() => {
        if (viewMode === "week") {
            return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) }
        }
        return { start: startOfWeek(startOfMonth(currentDate)), end: endOfWeek(endOfMonth(currentDate)) }
    })()

    const startOfCurrentRange = dateRange.start
    const endOfCurrentRange = dateRange.end

    useEffect(() => {
        if (!userData?.organizationId) return

        const fetchData = async () => {
            setLoading(true)
            try {
                // 1. Fetch users
                const usersSnap = await getDocs(query(
                    collection(db, "users"),
                    where("organizationId", "==", userData.organizationId)
                ))
                const userMap: Record<string, { name: string }> = {}
                usersSnap.docs.forEach(doc => {
                    userMap[doc.id] = { name: doc.data().name }
                })
                setUsers(userMap)

                // 2. Fetch locations for tabs
                const locsSnap = await getDocs(collection(db, "organizations", userData.organizationId, "locations"))
                const locs = locsSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name }))
                setLocationTabs(locs)

                // 2.2 Fetch Organization Timezone
                const orgDoc = await getDoc(doc(db, "organizations", userData.organizationId))
                const ianaTz = getIanaTz(orgDoc.data()?.timezone || "Eastern Standard Time (EST)")

                // 3. Fetch effective shifts
                const effectiveShifts = await getEffectiveShifts(
                    userData.organizationId,
                    null,
                    startOfCurrentRange,
                    endOfCurrentRange,
                    ianaTz,
                    userMap
                )
                setShifts(effectiveShifts)
            } catch (error) {
                console.error("Error fetching schedule data:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [userData?.organizationId, currentDate])

    const days = viewMode === "month"
        ? eachDayOfInterval({ start: startOfCurrentRange, end: endOfCurrentRange })
        : Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentRange, i))

    const refetchShifts = async () => {
        if (!userData?.organizationId) return
        setLoading(true)
        try {
            const orgDoc = await getDoc(doc(db, "organizations", userData.organizationId))
            const ianaTz = getIanaTz(orgDoc.data()?.timezone || "Eastern Standard Time (EST)")

            const effectiveShifts = await getEffectiveShifts(
                userData.organizationId,
                null,
                startOfCurrentRange,
                endOfCurrentRange,
                ianaTz,
                users
            )
            setShifts(effectiveShifts)
        } catch (error) {
            console.error("Error refetching shifts:", error)
        } finally {
            setLoading(false)
        }
    }

    // Filter shifts by selected location tab
    const filteredShifts = useMemo(() => {
        if (selectedLocationTab === "all") return shifts
        return shifts.filter(s => s.locationId === selectedLocationTab)
    }, [shifts, selectedLocationTab])

    const handlePrev = () => {
        if (viewMode === "week") setCurrentDate(addDays(currentDate, -7))
        else setCurrentDate(addMonths(currentDate, -1))
    }

    const handleNext = () => {
        if (viewMode === "week") setCurrentDate(addDays(currentDate, 7))
        else setCurrentDate(addMonths(currentDate, 1))
    }

    const handleShiftClick = (shift: EffectiveShift) => {
        setEditingShift(shift)
        setEditDialogOpen(true)
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 lg:px-0 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Staff Schedule</h1>
                    <p className="text-neutral-500 font-medium">Plan and manage shifts across all your workplace sites.</p>
                </div>
                <div className="flex items-center gap-3">
                    <AddShiftDialog
                        defaultLocationId={selectedLocationTab !== "all" ? selectedLocationTab : undefined}
                        onSuccess={refetchShifts}
                        trigger={
                            <Button className="rounded-xl px-6 h-11 bg-primary hover:bg-primary-600 shadow-lg shadow-primary/20 font-bold">
                                <Plus className="mr-2 h-5 w-5" />
                                Create Shift
                            </Button>
                        }
                    />
                </div>
            </div>

            {/* Location Tabs */}
            {locationTabs.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setSelectedLocationTab("all")}
                        className={cn(
                            "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border",
                            selectedLocationTab === "all"
                                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                                : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                        )}
                    >
                        <MapPin className="inline h-3 w-3 mr-1.5 -mt-0.5" />
                        All Locations
                    </button>
                    {locationTabs.map(loc => (
                        <button
                            key={loc.id}
                            onClick={() => setSelectedLocationTab(loc.id)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border",
                                selectedLocationTab === loc.id
                                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                                    : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                            )}
                        >
                            {loc.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Calendar Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white rounded-3xl border border-neutral-100 p-4 shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-black text-neutral-900 tracking-tighter">
                        {format(currentDate, "MMMM yyyy")}
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

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}

            {/* Grid Views */}
            {!loading && (
                <div className="space-y-6">
                    {viewMode === "month" ? (
                        <div className="space-y-8">
                            {/* Compact Month Grid */}
                            <div className="bg-white rounded-3xl border border-neutral-100 p-6 shadow-sm">
                                <div className="overflow-x-auto">
                                    <div className="min-w-[700px] grid grid-cols-7 gap-px bg-neutral-100 border border-neutral-100 rounded-2xl overflow-hidden">
                                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                                            <div key={day} className="bg-neutral-50 py-2 text-center">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{day}</span>
                                            </div>
                                        ))}
                                        {days.map((day, idx) => {
                                            const isToday = isSameDay(day, new Date())
                                            const isSelected = isSameDay(day, selectedDate)
                                            const isCurrentMonth = isSameMonth(day, currentDate)
                                            const shiftsForDay = filteredShifts.filter(s => isSameDay(s.startTime, day))

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
                                                    <span className={cn(
                                                        "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                                                        isToday ? "bg-primary text-white" : "text-neutral-900",
                                                        !isCurrentMonth && !isToday && "text-neutral-300",
                                                        isSelected && !isToday && "text-primary bg-primary/10"
                                                    )}>
                                                        {format(day, "d")}
                                                    </span>

                                                    {shiftsForDay.length > 0 && (
                                                        <div className="flex -space-x-1 overflow-hidden">
                                                            {shiftsForDay.slice(0, 3).map((_, i) => (
                                                                <div key={i} className="h-1.5 w-1.5 rounded-full bg-primary/40 ring-1 ring-white" />
                                                            ))}
                                                            {shiftsForDay.length > 3 && (
                                                                <div className="text-[8px] font-black text-neutral-400 ml-1">+{shiftsForDay.length - 3}</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Day Details */}
                            <div className="bg-white rounded-3xl border border-neutral-100 p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center">
                                            <Calendar className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-neutral-900 tracking-tighter">
                                                {format(selectedDate, "EEEE, MMMM do")}
                                            </h3>
                                            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Selected Day Details</p>
                                        </div>
                                    </div>
                                    <AddShiftDialog defaultDate={selectedDate} defaultLocationId={selectedLocationTab !== "all" ? selectedLocationTab : undefined} onSuccess={refetchShifts} trigger={
                                        <Button className="rounded-xl px-5 h-10 border-2 border-primary/10 bg-white text-primary hover:bg-primary/5 font-black text-[10px] uppercase tracking-widest shadow-none">
                                            <Plus className="mr-2 h-4 w-4" /> Add Shift
                                        </Button>
                                    } />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredShifts.filter(s => isSameDay(s.startTime, selectedDate)).map(shift => (
                                        <div key={shift.id} onClick={() => handleShiftClick(shift)} className={cn(
                                            "group relative border-2 rounded-2xl p-5 transition-all hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 cursor-pointer",
                                            shift.isVirtual ? "bg-neutral-50/50 border-dashed border-neutral-200" : "bg-white border-neutral-50 shadow-sm"
                                        )}>
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "h-10 w-10 rounded-xl flex items-center justify-center transition-colors group-hover:scale-110 duration-300",
                                                        shift.isVirtual ? "bg-neutral-100 text-neutral-400" : "bg-primary/10 text-primary"
                                                    )}>
                                                        <User className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-neutral-900">{shift.userName}</p>
                                                        {shift.isVirtual && <p className="text-[9px] font-black text-primary uppercase tracking-tighter">Recurring</p>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-xs font-bold text-neutral-400">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    <span>{format(shift.startTime, "h:mm a")} - {format(shift.endTime, "h:mm a")}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-neutral-400">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    <span className="truncate">{shift.locationName}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredShifts.filter(s => isSameDay(s.startTime, selectedDate)).length === 0 && (
                                        <div className="col-span-full py-16 flex flex-col items-center justify-center bg-neutral-50/50 rounded-3xl border-2 border-dashed border-neutral-100">
                                            <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-4">
                                                <Calendar className="h-8 w-8 text-neutral-200" />
                                            </div>
                                            <p className="text-sm font-black text-neutral-400 uppercase tracking-widest">No shifts scheduled</p>
                                            <p className="text-xs font-bold text-neutral-300 mt-1">Ready for assignments</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-7">
                            {days.map((day, idx) => {
                                const isToday = isSameDay(day, new Date())
                                const shiftsForDay = filteredShifts.filter(s => isSameDay(s.startTime, day))

                                return (
                                    <div key={idx} className="space-y-4">
                                        <div className={cn(
                                            "text-center py-2 rounded-2xl border",
                                            isToday ? "bg-primary/5 border-primary/10" : "bg-neutral-50 border-transparent"
                                        )}>
                                            <p className={cn("text-[10px] font-black uppercase tracking-widest", isToday ? "text-primary" : "text-neutral-400")}>
                                                {format(day, "EEE")}
                                            </p>
                                            <p className={cn("text-lg font-black tracking-tighter", isToday ? "text-primary" : "text-neutral-900")}>
                                                {format(day, "d")}
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            {shiftsForDay.map(shift => (
                                                <div key={shift.id} onClick={() => handleShiftClick(shift)} className={cn(
                                                    "group relative border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer",
                                                    shift.isVirtual ? "bg-neutral-50/50 border-dashed border-neutral-200" : "bg-white border-neutral-100"
                                                )}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className={cn(
                                                            "h-6 w-6 rounded-full flex items-center justify-center",
                                                            shift.isVirtual ? "bg-neutral-200 text-neutral-400" : "bg-primary/10 text-primary"
                                                        )}>
                                                            <User className="h-3 w-3" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-bold text-neutral-900 truncate">{shift.userName}</p>
                                                            {shift.isVirtual && <p className="text-[8px] font-black text-neutral-400 uppercase tracking-tighter -mt-0.5">Recurring</p>}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400">
                                                            <Clock className="h-3 w-3" />
                                                            <span>{format(shift.startTime, "h:mm a")} - {format(shift.endTime, "h:mm a")}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 truncate">
                                                            <MapPin className="h-3 w-3" />
                                                            <span className="truncate">{shift.locationName}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {shiftsForDay.length === 0 && (
                                                <div className="h-24 border border-dashed border-neutral-200 rounded-2xl flex items-center justify-center">
                                                    <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">Free Day</p>
                                                </div>
                                            )}
                                            <AddShiftDialog defaultDate={day} defaultLocationId={selectedLocationTab !== "all" ? selectedLocationTab : undefined} onSuccess={refetchShifts} trigger={
                                                <Button variant="ghost" className="w-full h-10 border border-dashed border-neutral-100 rounded-2xl text-[10px] font-bold text-neutral-400 uppercase tracking-widest hover:bg-neutral-50 hover:border-neutral-200">
                                                    + Add Shift
                                                </Button>
                                            } />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Edit Shift Dialog */}
            <EditShiftDialog
                shift={editingShift}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onSuccess={refetchShifts}
            />
        </div>
    )
}
