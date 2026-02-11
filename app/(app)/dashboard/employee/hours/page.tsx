"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download, Filter, DollarSign, MapPin } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { collection, query, where, getDocs, onSnapshot, orderBy, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, subDays, addDays, isSameDay, eachDayOfInterval } from "date-fns"
import { formatHoursMinutes, applyRounding } from "@/lib/services/payroll-service"
import { cn } from "@/lib/utils"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from "recharts"

/** Safely convert any Firestore timestamp variant to a JS Date */
function toJsDate(val: any): Date | null {
    if (!val) return null
    if (val.toDate && typeof val.toDate === "function") return val.toDate()
    if (typeof val.seconds === "number") return new Date(val.seconds * 1000)
    try {
        const d = new Date(val)
        return isNaN(d.getTime()) ? null : d
    } catch { return null }
}

interface TimeEntry {
    id: string
    locationName: string
    clockInTime: Date
    clockOutTime: Date | null
    rawMinutes: number
    roundedMinutes: number
    status: "completed" | "active"
}

export default function EmployeeHoursPage() {
    const { user, userData } = useAuth()
    const [loading, setLoading] = useState(true)
    const [entries, setEntries] = useState<TimeEntry[]>([])
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: startOfWeek(new Date(), { weekStartsOn: 0 }),
        to: endOfDay(new Date())
    })
    const [payRate, setPayRate] = useState<number>(0)
    const [showPay, setShowPay] = useState(false) // Toggle privacy

    // Fetch user pay rate
    useEffect(() => {
        if (userData?.payRate) {
            setPayRate(userData.payRate)
        }
    }, [userData])

    // Listen for time entries
    useEffect(() => {
        if (!user || !userData?.organizationId) return

        setLoading(true)
        const orgId = userData.organizationId

        // Query needs to be careful with composite indexes. 
        // Simple query by employeeId first, then correct date filtering in client if index is missing.
        // Best practice: Query by employeeId and range if index exists.
        // For now, let's try querying by range and filtering by employee, or vice versa.
        // Given 'time_entries' has composite index 'employeeId ASC + clockInTime DESC' (likely), we can do:
        const q = query(
            collection(db, "organizations", orgId, "time_entries"),
            where("employeeId", "==", user.uid),
            where("clockInTime", ">=", startOfDay(dateRange.from)),
            where("clockInTime", "<=", endOfDay(dateRange.to)),
            orderBy("clockInTime", "desc")
        )

        const unsub = onSnapshot(q, (snapshot) => {
            const now = new Date()
            const rows: TimeEntry[] = snapshot.docs.map(doc => {
                const data = doc.data()
                const clockIn = toJsDate(data.clockInTime) || new Date()
                const clockOut = toJsDate(data.clockOutTime)

                let rawMinutes = 0
                if (clockOut) {
                    rawMinutes = Math.max(0, (clockOut.getTime() - clockIn.getTime()) / (1000 * 60))
                } else {
                    rawMinutes = Math.max(0, (now.getTime() - clockIn.getTime()) / (1000 * 60))
                }

                return {
                    id: doc.id,
                    locationName: data.locationName || "Unknown Location",
                    clockInTime: clockIn,
                    clockOutTime: clockOut,
                    rawMinutes,
                    roundedMinutes: rawMinutes, // MVP: Client side rounding viewing isn't strictly enforced here unless we fetch settings
                    status: clockOut ? "completed" : "active"
                }
            })
            setEntries(rows)
            setLoading(false)
        }, (error) => {
            console.error("Error fetching time entries:", error)
            setLoading(false)
        })

        return () => unsub()
    }, [user, userData?.organizationId, dateRange])

    // Calculations
    const totalMinutes = entries.reduce((acc, curr) => acc + curr.rawMinutes, 0)
    const totalHours = totalMinutes / 60
    const estimatedPay = totalHours * payRate

    // Daily Chart Data
    const chartData = useMemo(() => {
        if (!dateRange.from || !dateRange.to) return []

        // Generate all days in interval
        const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to })

        return days.map(day => {
            const dayEntries = entries.filter(e => isSameDay(e.clockInTime, day))
            const dayMinutes = dayEntries.reduce((acc, curr) => acc + curr.rawMinutes, 0)
            return {
                name: format(day, "EEE"), // Mon, Tue
                fullDate: format(day, "MMM d"),
                hours: Number((dayMinutes / 60).toFixed(2)),
                isToday: isSameDay(day, new Date())
            }
        })
    }, [dateRange, entries])

    const handlePreviousWeek = () => {
        setDateRange(prev => ({
            from: subDays(prev.from, 7),
            to: subDays(prev.to, 7)
        }))
    }

    const handleNextWeek = () => {
        setDateRange(prev => ({
            from: addDays(prev.from, 7),
            to: addDays(prev.to, 7)
        }))
    }

    const handleThisWeek = () => {
        setDateRange({
            from: startOfWeek(new Date(), { weekStartsOn: 0 }),
            to: endOfDay(new Date())
        })
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto px-4 md:px-0 pb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">My Hours</h1>
                    <p className="text-neutral-500 font-medium">
                        Track your time, attendance, and earnings.
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-neutral-100 shadow-sm">
                    <Button variant="ghost" size="icon" onClick={handlePreviousWeek} className="rounded-xl hover:bg-neutral-50">
                        <ChevronLeft className="h-4 w-4 text-neutral-400" />
                    </Button>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-[240px] justify-start text-left font-bold text-sm",
                                    !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "LLL dd, y")} -{" "}
                                            {format(dateRange.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(dateRange.from, "LLL dd, y")
                                    )
                                ) : (
                                    <span>Pick a date</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={(range: any) => {
                                    if (range?.from) {
                                        setDateRange({ from: range.from, to: range.to || range.from })
                                    }
                                }}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="icon" onClick={handleNextWeek} className="rounded-xl hover:bg-neutral-50">
                        <ChevronRight className="h-4 w-4 text-neutral-400" />
                    </Button>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-2 gap-6">
                <Card className="rounded-[24px] border-neutral-100 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
                        <CardTitle className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Total Hours</CardTitle>
                        <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-primary/5 text-primary group-hover:scale-110 transition-transform">
                            <Clock className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-6">
                        <div className="text-3xl font-black text-neutral-900 tracking-tighter">
                            {formatHoursMinutes(totalMinutes)}
                        </div>
                        <p className="text-xs text-neutral-500 font-medium mt-2">
                            Recorded in this period
                        </p>
                        <div className="h-1.5 w-full bg-primary/5 mt-4 -mb-2 rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-full origin-left scale-x-[0.2]" />
                            {/* Note: scale-x is placeholder animation, real width would need max-hours context */}
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-[24px] border-neutral-100 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
                        <CardTitle className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Days Worked</CardTitle>
                        <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                            <CalendarIcon className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-6">
                        <div className="text-3xl font-black text-neutral-900 tracking-tighter">
                            {new Set(entries.map(e => format(e.clockInTime, 'yyyy-MM-dd'))).size}
                        </div>
                        <p className="text-xs text-neutral-500 font-medium mt-2">
                            Active days in period
                        </p>
                        <div className="h-1.5 w-full bg-indigo-50 mt-4 -mb-2 rounded-full" />
                    </CardContent>
                </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Chart Section */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="rounded-[32px] border-neutral-100 shadow-sm overflow-hidden border-0 bg-gradient-to-br from-white to-neutral-50/50">
                        <CardHeader className="px-8 pt-8">
                            <CardTitle className="text-lg font-bold text-neutral-900">Activity Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8">
                            <div className="h-[250px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#a3a3a3', fontSize: 12, fontWeight: 600 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#a3a3a3', fontSize: 12 }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-neutral-900 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl">
                                                            <div>{data.fullDate}</div>
                                                            <div className="text-lg">{data.hours} hrs</div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="hours" radius={[6, 6, 6, 6]} barSize={40}>
                                            {chartData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.isToday ? '#F59E0B' : '#E5E5E5'}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Entry List */}
                    <Card className="rounded-[32px] border-neutral-100 shadow-sm overflow-hidden">
                        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 pb-4 pt-6 px-8">
                            <CardTitle className="text-lg font-bold text-neutral-900">Timesheet</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {entries.length === 0 ? (
                                <div className="py-12 text-center">
                                    <p className="text-neutral-400 font-bold text-sm">No entries found for this period.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-neutral-400 pl-8">Date</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-neutral-400">Location</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-neutral-400">Time</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-neutral-400 text-right pr-8">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {entries.map((entry) => (
                                                <TableRow key={entry.id} className="hover:bg-neutral-50/50 group transition-colors">
                                                    <TableCell className="pl-8 font-bold text-neutral-900">
                                                        <div className="flex flex-col">
                                                            <span>{format(entry.clockInTime, "MMM d")}</span>
                                                            <span className="text-[10px] text-neutral-400 uppercase font-black">{format(entry.clockInTime, "EEE")}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-neutral-500 font-medium text-xs">
                                                        <div className="flex items-center gap-1.5">
                                                            <MapPin className="h-3 w-3 text-neutral-300" />
                                                            {entry.locationName}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col text-xs font-semibold">
                                                            <span className="text-neutral-700">
                                                                {format(entry.clockInTime, "h:mm a")}
                                                            </span>
                                                            <span className="text-neutral-400">
                                                                {entry.clockOutTime ? format(entry.clockOutTime, "h:mm a") : "Active"}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-8">
                                                        {entry.status === 'active' ? (
                                                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 animate-pulse">
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="font-bold text-neutral-900 bg-neutral-100 px-2 py-1 rounded-lg">
                                                                {formatHoursMinutes(entry.rawMinutes)}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Sidebar Info */}
                <div className="space-y-6">
                    <Card className="rounded-[24px] bg-primary text-white border-0 shadow-xl shadow-primary/20 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Clock className="w-32 h-32" />
                        </div>
                        <CardHeader className="pb-2 pt-8 px-6 relative z-10">
                            <CardTitle className="text-sm font-bold opacity-80 uppercase tracking-widest">This Week</CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-8 relative z-10">
                            <div className="text-4xl font-black tracking-tighter">
                                {formatHoursMinutes(entries.filter(e => isSameDay(e.clockInTime, new Date()) || (e.clockInTime > startOfWeek(new Date(), { weekStartsOn: 0 }))).reduce((a, b) => a + b.rawMinutes, 0))}
                            </div>
                            <p className="text-sm font-medium opacity-80 mt-2">
                                Total hours since Sunday
                            </p>
                        </CardContent>
                    </Card>

                    <div className="bg-neutral-50 rounded-[24px] p-6 text-center space-y-4">
                        <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm text-neutral-400">
                            <Download className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-neutral-900">Need a Repoort?</h3>
                            <p className="text-xs text-neutral-500 font-medium mt-1 px-4">
                                You can export your timesheet data for any period.
                            </p>
                        </div>
                        <Button variant="outline" className="w-full rounded-xl font-bold bg-white hover:bg-neutral-100 border-neutral-200">
                            Download CSV
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
