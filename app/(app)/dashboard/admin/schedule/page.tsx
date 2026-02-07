"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, User, Filter, MoreHorizontal } from "lucide-react"
import { format, startOfWeek, addDays, isSameDay } from "date-fns"
import { cn } from "@/lib/utils"

export default function AdminSchedulePage() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const startOfCurrentWeek = startOfWeek(currentDate)

    // Mock shifts for UI demonstration
    const mockShifts = [
        { id: 1, employee: "John Doe", start: "09:00 AM", end: "05:00 PM", date: new Date() },
        { id: 2, employee: "Sarah Connor", start: "10:00 AM", end: "06:00 PM", date: addDays(new Date(), 1) },
        { id: 3, employee: "Mike Ross", start: "08:00 AM", end: "04:00 PM", date: new Date() },
    ]

    const days = Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i))

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 lg:px-0 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Staff Schedule</h1>
                    <p className="text-neutral-500 font-medium">Plan and manage shifts across all your workplace sites.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="rounded-xl border-neutral-200 font-bold text-neutral-600 h-11 px-4">
                        <Filter className="mr-2 h-4 w-4" /> Filter
                    </Button>
                    <Button className="rounded-xl px-6 h-11 bg-primary hover:bg-primary-600 shadow-lg shadow-primary/20 font-bold">
                        <Plus className="mr-2 h-5 w-5" />
                        Create Shift
                    </Button>
                </div>
            </div>

            {/* Calendar Header */}
            <div className="flex items-center justify-between bg-white rounded-3xl border border-neutral-100 p-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-black text-neutral-900 tracking-tighter">
                        {format(currentDate, "MMMM yyyy")}
                    </h2>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
                            <ChevronLeft className="h-5 w-5 text-neutral-400" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
                            <ChevronRight className="h-5 w-5 text-neutral-400" />
                        </Button>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
                    <Button variant="ghost" size="sm" className="rounded-lg font-bold text-[10px] uppercase tracking-wider px-4 bg-white text-primary shadow-sm">Week</Button>
                    <Button variant="ghost" size="sm" className="rounded-lg font-bold text-[10px] uppercase tracking-wider px-4 text-neutral-500">Day</Button>
                    <Button variant="ghost" size="sm" className="rounded-lg font-bold text-[10px] uppercase tracking-wider px-4 text-neutral-500">Month</Button>
                </div>
            </div>

            {/* Weekly Grid */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {days.map((day, idx) => {
                    const isToday = isSameDay(day, new Date())
                    const shiftsForDay = mockShifts.filter(s => isSameDay(s.date, day))

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
                                    <div key={shift.id} className="group relative bg-white border border-neutral-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <User className="h-3 w-3" />
                                            </div>
                                            <p className="text-xs font-bold text-neutral-900 truncate">{shift.employee}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400">
                                                <Clock className="h-3 w-3" />
                                                <span>{shift.start} - {shift.end}</span>
                                            </div>
                                        </div>
                                        <button className="absolute top-2 right-2 h-6 w-6 rounded-lg bg-neutral-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <MoreHorizontal className="h-3 w-3 text-neutral-400" />
                                        </button>
                                    </div>
                                ))}
                                {shiftsForDay.length === 0 && (
                                    <div className="h-24 border border-dashed border-neutral-200 rounded-2xl flex items-center justify-center">
                                        <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">Free Day</p>
                                    </div>
                                )}
                                <Button variant="ghost" className="w-full h-10 border border-dashed border-neutral-100 rounded-2xl text-[10px] font-bold text-neutral-400 uppercase tracking-widest hover:bg-neutral-50 hover:border-neutral-200">
                                    + Add Shift
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
