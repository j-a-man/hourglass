"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    FileText,
    Download,
    TrendingUp,
    Clock,
    Users,
    AlertCircle,
    Filter,
    BarChart3,
    Calendar
} from "lucide-react"
import { format, subDays } from "date-fns"

export default function AdminReportsPage() {
    const [dateRange, setDateRange] = useState({
        start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
        end: format(new Date(), "yyyy-MM-dd")
    })

    const stats = [
        { label: "Completion Rate", value: "98.2%", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Avg Shift Duration", value: "7.8 hrs", icon: Clock, color: "text-primary", bg: "bg-primary/5" },
        { label: "Staff Utilization", value: "84%", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Discrepancy Alerts", value: "12", icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
    ]

    return (
        <div className="space-y-10 max-w-7xl mx-auto px-4 lg:px-0 pb-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Intelligence & Reports</h1>
                    <p className="text-neutral-500 font-medium">Deep dive into attendance data, staff performance, and operational trends.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="rounded-xl border-neutral-200 font-bold text-neutral-600 h-11 px-4 shadow-sm bg-white">
                        <Calendar className="mr-2 h-4 w-4" /> Custom Range
                    </Button>
                    <Button className="rounded-xl px-6 h-11 bg-primary hover:bg-primary-600 shadow-lg shadow-primary/20 font-bold">
                        <Download className="mr-2 h-4 w-4" />
                        Export All Data
                    </Button>
                </div>
            </header>

            {/* Quick Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <Card key={i} className="rounded-3xl border-neutral-100 shadow-sm overflow-hidden border">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
                            <CardTitle className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{stat.label}</CardTitle>
                            <div className={`h-10 w-10 flex items-center justify-center rounded-2xl ${stat.bg} ${stat.color}`}>
                                <stat.icon className="h-5 w-5" />
                            </div>
                        </CardHeader>
                        <CardContent className="pb-6">
                            <div className="text-3xl font-black text-neutral-900 tracking-tighter">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
                {/* Reports List */}
                <div className="lg:col-span-8 space-y-6">
                    <Card className="rounded-[32px] border-neutral-100 shadow-sm overflow-hidden">
                        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 p-6">
                            <CardTitle className="text-lg font-bold text-neutral-900">Standard Reports</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {[
                                { title: "Monthly Attendance Summary", desc: "Detailed breakdown of all clock-in/out events per employee.", date: "Feb 1, 2026" },
                                { title: "Geofence Compliance Audit", desc: "Analysis of flagged events and GPS variance across all sites.", date: "Jan 28, 2026" },
                                { title: "Staff Overtime Projections", desc: "Predicted overtime costs based on current scheduling trends.", date: "Jan 15, 2026" },
                                { title: "Site Activity Heatmap", desc: "Peak attendance times and staff density per location.", date: "Dec 30, 2025" }
                            ].map((report, i) => (
                                <div key={i} className="p-6 flex items-center justify-between hover:bg-neutral-50/50 transition-colors border-b border-neutral-50 last:border-0">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-white border border-neutral-100 flex items-center justify-center text-neutral-400">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-neutral-900 leading-tight">{report.title}</p>
                                            <p className="text-sm text-neutral-500 font-medium mt-1">{report.desc}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" className="rounded-xl h-10 px-4 font-bold text-primary group">
                                        Generate <Download className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-all translate-x-1" />
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Analytics Visualization Placeholder */}
                <div className="lg:col-span-4 space-y-8">
                    <Card className="rounded-[32px] border-neutral-100 bg-neutral-900 text-white shadow-xl p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center">
                                <BarChart3 className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-bold">Trend Analysis</h3>
                        </div>
                        <div className="h-48 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <p className="text-white/40 font-bold text-sm tracking-widest uppercase italic">Visual data coming soon</p>
                        </div>
                        <div className="mt-8 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-white/60 font-medium">Efficiency Growth</span>
                                <span className="text-sm font-black text-emerald-400">+14%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full w-2/3 bg-emerald-500 rounded-full" />
                            </div>
                        </div>
                    </Card>

                    <Card className="rounded-[32px] border-amber-100 bg-amber-50/50 p-6 border">
                        <div className="flex items-center gap-3 mb-2 text-amber-700">
                            <Filter className="h-4 w-4" />
                            <h4 className="font-black text-xs uppercase tracking-widest">Smart Filter</h4>
                        </div>
                        <p className="text-amber-800 text-sm font-medium leading-relaxed">
                            Use advanced filters to drill down into specific departments or locations to identify high-performance zones.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    )
}
