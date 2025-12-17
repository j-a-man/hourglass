"use client"

import { useState } from "react"
import { UpcomingShifts } from "@/components/upcoming-shifts"
import { TechnicianScheduleCalendar } from "@/components/technician-schedule-calendar"
import { useRouter } from "next/navigation"
import { ArrowLeft, Calendar as CalendarIcon, List } from "lucide-react"

export default function TechnicianSchedulePage() {
    const router = useRouter()
    const [view, setView] = useState<"calendar" | "list">("calendar")

    return (
        <div className="min-h-screen p-6 font-sans">
            <div className="max-w-4xl mx-auto space-y-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-slate-500 hover:text-slate-800 transition-colors mb-4"
                >
                    <ArrowLeft size={16} className="mr-2" />
                    Back to Dashboard
                </button>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Full Schedule</h1>
                        <p className="text-slate-500 font-medium">All upcoming shifts assigned to you.</p>
                    </div>

                    <div className="flex items-center p-1 bg-white/50 backdrop-blur-sm rounded-lg border border-slate-200/60 shadow-sm">
                        <button
                            onClick={() => setView("calendar")}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${view === "calendar"
                                    ? "bg-indigo-600 text-white shadow-md"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                                }`}
                        >
                            <CalendarIcon size={14} />
                            Calendar
                        </button>
                        <button
                            onClick={() => setView("list")}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${view === "list"
                                    ? "bg-indigo-600 text-white shadow-md"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                                }`}
                        >
                            <List size={14} />
                            List
                        </button>
                    </div>
                </div>

                <div className="min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {view === "calendar" ? (
                        <TechnicianScheduleCalendar />
                    ) : (
                        <UpcomingShifts />
                    )}
                </div>
            </div>
        </div>
    )
}
