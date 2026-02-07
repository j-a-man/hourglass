"use client"

import { useEffect, useState } from "react"
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard"
import { Users, Clock, CalendarDays, MapPin, Plus, ArrowUpRight, AlertCircle, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { collection, query, where, getDocs, onSnapshot, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format } from "date-fns"
import { useAuth } from "@/components/auth-context"

export default function AdminDashboardPage() {
    const { userData } = useAuth()
    const [metrics, setMetrics] = useState({
        clockedIn: {
            label: "Clocked In Now",
            value: "0",
            icon: Users,
            description: "Currently on site"
        },
        todayHours: {
            label: "Total Today",
            value: "0.0",
            icon: Clock,
            description: "Hours logged today"
        },
        activeEmployees: {
            label: "Staff Count",
            value: "0",
            icon: CalendarDays,
            description: "Active employees"
        },
        locations: {
            label: "Active Sites",
            value: "0",
            icon: MapPin,
            description: "Monitored locations"
        }
    })

    const [recentActivity, setRecentActivity] = useState<any[]>([])
    const [activeClockins, setActiveClockins] = useState<any[]>([])
    const [locations, setLocations] = useState<any[]>([])
    const [selectedLocationId, setSelectedLocationId] = useState<string>("all")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!userData?.organizationId) return
        const orgId = userData.organizationId

        // Fetch locations list from organization sub-collection
        getDocs(collection(db, "organizations", orgId, "locations")).then(snapshot => {
            const locs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            setLocations(locs)

            setMetrics(prev => ({
                ...prev,
                locations: { ...prev.locations, value: snapshot.size.toString() }
            }))
        })
    }, [userData?.organizationId])

    useEffect(() => {
        if (!userData?.organizationId) return
        const orgId = userData.organizationId
        setLoading(true)

        // 1. Listen for active clock-ins in organization sub-collection
        let activeClockinsQuery = query(
            collection(db, "organizations", orgId, "time_entries"),
            where("clockOutTime", "==", null)
        )
        if (selectedLocationId !== "all") {
            activeClockinsQuery = query(activeClockinsQuery, where("locationId", "==", selectedLocationId))
        }

        const unsubActive = onSnapshot(activeClockinsQuery, (snapshot) => {
            setMetrics(prev => ({
                ...prev,
                clockedIn: { ...prev.clockedIn, value: snapshot.size.toString() }
            }))

            const activeList = snapshot.docs.map(doc => {
                const data = doc.data()
                return {
                    id: doc.id,
                    employeeName: data.userName || 'Unknown',
                    clockInTime: data.clockInTime,
                    locationId: data.locationId,
                }
            })
            setActiveClockins(activeList)
        })

        // 2. Count active employees for this organization
        let employeesQuery = query(
            collection(db, "users"),
            where("organizationId", "==", orgId),
            where("status", "==", "active")
        )
        if (selectedLocationId !== "all") {
            employeesQuery = query(employeesQuery, where("locationId", "==", selectedLocationId))
        }

        getDocs(employeesQuery).then(snapshot => {
            setMetrics(prev => ({
                ...prev,
                activeEmployees: { ...prev.activeEmployees, value: snapshot.size.toString() }
            }))
        })

        // 4. Fetch recent activity from organization sub-collection
        let recentQuery = query(
            collection(db, "organizations", orgId, "time_entries"),
            orderBy("clockInTime", "desc"),
            limit(10)
        )
        if (selectedLocationId !== "all") {
            recentQuery = query(
                collection(db, "organizations", orgId, "time_entries"),
                where("locationId", "==", selectedLocationId),
                orderBy("clockInTime", "desc"),
                limit(10)
            )
        }

        const unsubRecent = onSnapshot(recentQuery, (snapshot) => {
            const activities = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            setRecentActivity(activities)
            setLoading(false)
        })

        // 5. Calculate today's total hours
        const startOfToday = new Date()
        startOfToday.setHours(0, 0, 0, 0)

        let todayQuery = query(
            collection(db, "organizations", orgId, "time_entries"),
            where("clockInTime", ">=", startOfToday)
        )
        if (selectedLocationId !== "all") {
            todayQuery = query(todayQuery, where("locationId", "==", selectedLocationId))
        }

        const unsubToday = onSnapshot(todayQuery, (snapshot) => {
            let total = 0
            snapshot.docs.forEach(doc => {
                const data = doc.data()
                if (data.clockInTime && data.clockOutTime) {
                    const start = data.clockInTime.toDate ? data.clockInTime.toDate() : new Date(data.clockInTime);
                    const end = data.clockOutTime.toDate ? data.clockOutTime.toDate() : new Date(data.clockOutTime);

                    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                        const diff = end.getTime() - start.getTime();
                        total += diff / (1000 * 60 * 60);
                    }
                }
            })
            setMetrics(prev => ({
                ...prev,
                todayHours: { ...prev.todayHours, value: total.toFixed(1) }
            }))
        })

        return () => {
            unsubActive()
            unsubRecent()
            unsubToday()
        }
    }, [selectedLocationId, userData?.organizationId])

    const selectedLocationName = selectedLocationId === "all"
        ? "All Locations"
        : locations.find(l => l.id === selectedLocationId)?.name || "Location"

    const getLocationName = (locationId?: string) => {
        if (!locationId) return "Unknown Site"
        return locations.find(l => l.id === locationId)?.name || "Other Site"
    }

    return (
        <div className="space-y-10 max-w-7xl mx-auto px-4 lg:px-0 pb-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Executive Overview</h1>
                    <div className="flex items-center gap-2">
                        <p className="text-neutral-500 font-medium">{format(new Date(), "MMMM d, yyyy")} •</p>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-auto p-0 hover:bg-transparent text-primary font-bold flex items-center gap-1 group">
                                    <MapPin className="h-4 w-4" />
                                    {selectedLocationName}
                                    <Filter className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="rounded-xl border-neutral-100 shadow-xl w-56">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-3 py-2">Select View</DropdownMenuLabel>
                                <DropdownMenuItem
                                    className="rounded-lg mx-1 font-bold py-2 px-3 focus:bg-primary/5 focus:text-primary"
                                    onClick={() => setSelectedLocationId("all")}
                                >
                                    Global View (All Sites)
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-neutral-50" />
                                {locations.map(loc => (
                                    <DropdownMenuItem
                                        key={loc.id}
                                        className="rounded-lg mx-1 font-bold py-2 px-3 focus:bg-primary/5 focus:text-primary"
                                        onClick={() => setSelectedLocationId(loc.id)}
                                    >
                                        {loc.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/admin/employees/new">
                        <Button className="rounded-xl px-6 h-12 bg-primary hover:bg-primary-600 shadow-lg shadow-primary/20 font-bold">
                            <Plus className="mr-2 h-5 w-5" />
                            Add Staff
                        </Button>
                    </Link>
                </div>
            </header>

            <AnalyticsDashboard metrics={metrics as any} />

            {/* Currently Clocked In Section */}
            <Card className="rounded-[32px] border-neutral-100 shadow-sm overflow-hidden">
                <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 pb-4 pt-6 px-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-bold text-neutral-900">Currently Clocked In</CardTitle>
                            <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1">
                                {selectedLocationName}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full">
                            <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-xs font-bold text-emerald-700">{activeClockins.length} Active</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    {activeClockins.length > 0 ? (
                        <div className="grid md:grid-cols-2 gap-4">
                            {activeClockins.map((employee) => (
                                <div key={employee.id} className="flex items-center gap-3 p-4 rounded-2xl border border-neutral-100 bg-white hover:border-primary/20 hover:shadow-sm transition-all">
                                    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                                        {employee.employeeName?.charAt(0) || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-neutral-900 truncate">{employee.employeeName}</p>
                                        <p className="text-xs text-neutral-500 font-medium">
                                            Started at {(() => {
                                                const date = employee.clockInTime;
                                                if (!date) return "Just now";
                                                const parsed = date.toDate ? date.toDate() : new Date(date);
                                                return !isNaN(parsed.getTime()) ? format(parsed, "h:mm a") : "Recently";
                                            })()}
                                        </p>
                                    </div>
                                    {selectedLocationId === "all" && employee.locationId && (
                                        <div className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 text-xs font-bold">
                                            {getLocationName(employee.locationId)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="h-16 w-16 rounded-full bg-neutral-100 mx-auto mb-4 flex items-center justify-center">
                                <Clock className="h-8 w-8 text-neutral-400" />
                            </div>
                            <p className="text-neutral-500 font-medium">No one is currently clocked in</p>
                            <p className="text-xs text-neutral-400 mt-1">Clock-ins will appear here in real-time</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid lg:grid-cols-12 gap-8">
                {/* Main Activity Feed */}
                <Card className="lg:col-span-8 rounded-[32px] border-neutral-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 pb-4 pt-6 px-8 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-bold text-neutral-900">Live Activity Feed</CardTitle>
                            <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1">Recent clock actions</p>
                        </div>
                        <Link href="/dashboard/admin/reports" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                            View All <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        {recentActivity.length > 0 ? (
                            <div className="divide-y divide-neutral-50">
                                {recentActivity.map((activity) => (
                                    <div key={activity.id} className="p-6 flex items-start justify-between hover:bg-neutral-50/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-bold text-lg shadow-sm border border-primary/10">
                                                {activity.userName?.[0] || "?"}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-neutral-900">{activity.userName || `Staff Member (${activity.userId?.slice(0, 5)})`}</p>
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-neutral-100 text-[10px] font-bold text-neutral-500">
                                                        <MapPin className="h-3 w-3" />
                                                        {getLocationName(activity.locationId)}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-neutral-500 font-medium">
                                                    {activity.clockOutTime ? "Finished shift" : "Started shift"} • {(() => {
                                                        const date = activity.clockInTime;
                                                        if (!date) return "Recently";
                                                        const parsed = date.toDate ? date.toDate() : new Date(date);
                                                        return !isNaN(parsed.getTime()) ? format(parsed, "h:mm a") : "Recently";
                                                    })()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {activity.flags && (
                                                <div className="flex items-center gap-1 text-red-500 bg-red-50 px-2 py-1 rounded-full text-[10px] font-black uppercase">
                                                    <AlertCircle className="h-3 w-3" />
                                                    Flagged
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center space-y-3">
                                <div className="h-16 w-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto text-neutral-300">
                                    <Clock className="h-8 w-8" />
                                </div>
                                <p className="text-neutral-400 font-bold">No activity recorded yet today.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Side Actions / Insights */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="rounded-[32px] border-neutral-100 shadow-sm overflow-hidden bg-neutral-900 text-white">
                        <CardHeader className="pb-4 pt-8 px-8">
                            <CardTitle className="text-xl font-bold">Quick Management</CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8 space-y-3">
                            {[
                                { label: "Generate Payroll", href: "/dashboard/admin/payroll" },
                                { label: "Staff Scheduling", href: "/dashboard/admin/schedule" },
                                { label: "Review Time Off", href: "/dashboard/admin/time-off" },
                                { label: "Workplace Settings", href: "/dashboard/admin/settings" }
                            ].map((btn) => (
                                <Link key={btn.label} href={btn.href}>
                                    <Button variant="outline" className="w-full justify-between h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold group">
                                        {btn.label}
                                        <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Button>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="rounded-[32px] border-emerald-100 bg-emerald-50/50 shadow-sm overflow-hidden p-8 border">
                        <h4 className="font-black text-emerald-800 text-sm uppercase tracking-widest mb-2">Pro Tip</h4>
                        <p className="text-emerald-700 text-sm font-medium leading-relaxed">
                            Employees within 50 meters of the center point have 99% accuracy. Check "Flagged" events for distance warnings.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    )
}