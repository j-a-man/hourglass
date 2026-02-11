"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
    Calendar,
    Loader2,
    DollarSign,
    ChevronDown
} from "lucide-react"
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns"
import { analyticsService, ReportStats, DailyActivity, EmployeePerformance } from "@/lib/services/analytics-service"
import { useAuth } from "@/components/auth-context"
import { toast } from "sonner"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from "recharts"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { DateRange } from "react-day-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function AdminReportsPage() {
    const { userData } = useAuth()
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 30),
        to: new Date()
    })
    const [locations, setLocations] = useState<{ id: string, name: string }[]>([])
    const [selectedLocation, setSelectedLocation] = useState<string>("all")

    const [stats, setStats] = useState<ReportStats | null>(null)
    const [dailyData, setDailyData] = useState<DailyActivity[]>([])
    const [employeeData, setEmployeeData] = useState<EmployeePerformance[]>([])

    // Fetch Locations
    useEffect(() => {
        if (!userData?.organizationId) return
        async function fetchLocations() {
            const q = query(collection(db, "organizations", userData!.organizationId, "locations"))
            const snapshot = await getDocs(q)
            const locs = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }))
            setLocations(locs)
        }
        fetchLocations()
    }, [userData?.organizationId])

    // Fetch Data
    useEffect(() => {
        async function fetchData() {
            if (!userData?.organizationId || !dateRange?.from || !dateRange?.to) return

            setLoading(true)
            try {
                const data = await analyticsService.getReportData(
                    userData.organizationId,
                    dateRange.from,
                    dateRange.to,
                    selectedLocation
                )
                setStats(data.stats)
                setDailyData(data.dailyActivity)
                setEmployeeData(data.employeePerformance)
            } catch (error) {
                console.error("Failed to load report data:", error)
                toast.error("Failed to load reports")
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [userData?.organizationId, dateRange, selectedLocation])

    const handleExport = () => {
        if (!employeeData.length) return

        // Simple CSV Export
        const headers = ["Employee Name", "Role", "Total Shifts", "Total Hours", "Est. Pay", "Last Active"]
        const rows = employeeData.map(e => [
            e.name,
            e.role,
            e.totalShifts,
            e.totalHours.toFixed(2),
            e.estPay.toFixed(2),
            e.lastActive
        ])

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `reports_${format(new Date(), "yyyy-MM-dd")}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success("Report exported successfully")
    }

    return (
        <div className="space-y-10 max-w-7xl mx-auto px-4 lg:px-0 pb-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Intelligence & Reports</h1>
                    <p className="text-neutral-500 font-medium">Deep dive into attendance data, staff performance, and operational trends.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                        <SelectTrigger className="w-[180px] h-11 rounded-xl bg-white border-neutral-200 font-bold text-neutral-600 shadow-sm">
                            <SelectValue placeholder="All Locations" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-neutral-200">
                            <SelectItem value="all" className="font-medium">All Locations</SelectItem>
                            {locations.map(loc => (
                                <SelectItem key={loc.id} value={loc.id} className="font-medium">
                                    {loc.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="rounded-xl border-neutral-200 font-bold text-neutral-600 h-11 px-4 shadow-sm bg-white min-w-[240px] justify-between">
                                <span className="flex items-center">
                                    <Calendar className="mr-2 h-4 w-4" />
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
                                </span>
                                <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <CalendarComponent
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                                className="rounded-xl border-neutral-200"
                            />
                        </PopoverContent>
                    </Popover>

                    <Button
                        className="rounded-xl px-6 h-11 bg-primary hover:bg-primary-600 shadow-lg shadow-primary/20 font-bold"
                        onClick={handleExport}
                        disabled={loading || !employeeData.length}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Export Data
                    </Button>
                </div>
            </header>

            {loading ? (
                <div className="h-64 w-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm font-medium text-neutral-500">Crunching the numbers...</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="rounded-3xl border-neutral-100 shadow-sm overflow-hidden border">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
                                <CardTitle className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Total Hours</CardTitle>
                                <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                    <Clock className="h-5 w-5" />
                                </div>
                            </CardHeader>
                            <CardContent className="pb-6">
                                <div className="text-3xl font-black text-neutral-900 tracking-tighter">{stats?.totalHours || 0} hrs</div>
                                <p className="text-xs text-neutral-500 font-medium mt-1">Recorded in selected period</p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-3xl border-neutral-100 shadow-sm overflow-hidden border">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
                                <CardTitle className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Est. Payroll</CardTitle>
                                <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                            </CardHeader>
                            <CardContent className="pb-6">
                                <div className="text-3xl font-black text-neutral-900 tracking-tighter">${stats?.estPayroll.toLocaleString() || "0.00"}</div>
                                <p className="text-xs text-neutral-500 font-medium mt-1">Based on hourly rates</p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-3xl border-neutral-100 shadow-sm overflow-hidden border">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
                                <CardTitle className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Active Staff</CardTitle>
                                <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-primary/5 text-primary">
                                    <Users className="h-5 w-5" />
                                </div>
                            </CardHeader>
                            <CardContent className="pb-6">
                                <div className="text-3xl font-black text-neutral-900 tracking-tighter">{stats?.activeEmployees || 0}</div>
                                <p className="text-xs text-neutral-500 font-medium mt-1">With at least 1 shift</p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-3xl border-neutral-100 shadow-sm overflow-hidden border">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
                                <CardTitle className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Avg Shift</CardTitle>
                                <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                            </CardHeader>
                            <CardContent className="pb-6">
                                <div className="text-3xl font-black text-neutral-900 tracking-tighter">{stats?.avgShiftDuration || 0} hrs</div>
                                <p className="text-xs text-neutral-500 font-medium mt-1">Average duration per shift</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid lg:grid-cols-12 gap-8">
                        {/* Reports List */}
                        <div className="lg:col-span-8 space-y-8">
                            {/* Activity Chart */}
                            <Card className="rounded-[32px] border-neutral-100 shadow-sm overflow-hidden">
                                <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 p-6 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-bold text-neutral-900">Activity Trends</CardTitle>
                                        <CardDescription>Daily hours worked across the organization.</CardDescription>
                                    </div>
                                    <BarChart3 className="h-5 w-5 text-neutral-400" />
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={dailyData}>
                                                <defs>
                                                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                                                <XAxis
                                                    dataKey="date"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tickMargin={10}
                                                    tickFormatter={(val) => format(parseISO(val), "MMM d")}
                                                    style={{ fontSize: '12px', fill: '#737373', fontWeight: 600 }}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tickMargin={10}
                                                    style={{ fontSize: '12px', fill: '#737373', fontWeight: 600 }}
                                                />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    labelStyle={{ fontWeight: 'bold', color: '#171717', marginBottom: '4px' }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="hours"
                                                    stroke="#8b5cf6"
                                                    strokeWidth={3}
                                                    fillOpacity={1}
                                                    fill="url(#colorHours)"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Employee Performance Table */}
                            <Card className="rounded-[32px] border-neutral-100 shadow-sm overflow-hidden">
                                <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 p-6 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-bold text-neutral-900">Employee Performance</CardTitle>
                                        <CardDescription>Breakdown by staff member for selected period.</CardDescription>
                                    </div>
                                    <Filter className="h-5 w-5 text-neutral-400" />
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-neutral-50/50 hover:bg-neutral-50/50 border-neutral-100">
                                                    <TableHead className="font-bold text-neutral-400 uppercase text-xs tracking-wider pl-6">Employee</TableHead>
                                                    <TableHead className="font-bold text-neutral-400 uppercase text-xs tracking-wider text-right">Role</TableHead>
                                                    <TableHead className="font-bold text-neutral-400 uppercase text-xs tracking-wider text-right">Shifts</TableHead>
                                                    <TableHead className="font-bold text-neutral-400 uppercase text-xs tracking-wider text-right">Hours</TableHead>
                                                    <TableHead className="font-bold text-neutral-400 uppercase text-xs tracking-wider text-right pr-6">Est. Pay</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {employeeData.map((emp) => (
                                                    <TableRow key={emp.userId} className="hover:bg-neutral-50/50 border-neutral-50 transition-colors">
                                                        <TableCell className="font-bold text-neutral-900 pl-6">
                                                            {emp.name}
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs font-semibold uppercase text-neutral-500">
                                                            <span className="bg-neutral-100 px-2 py-1 rounded-md">{emp.role}</span>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium text-neutral-600">
                                                            {emp.totalShifts}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-neutral-900">
                                                            {emp.totalHours.toFixed(1)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-emerald-600 pr-6">
                                                            ${emp.estPay.toFixed(2)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {employeeData.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="h-32 text-center text-neutral-500 font-medium">
                                                            No data available for this period.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Insights */}
                        <div className="lg:col-span-4 space-y-8">
                            <Card className="rounded-[32px] border-neutral-100 bg-neutral-900 text-white shadow-xl p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-lg font-bold">Top Performer</h3>
                                </div>
                                <div className="space-y-4">
                                    {employeeData.length > 0 ? (
                                        <>
                                            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                                <span className="text-sm text-white/60 font-medium">Most Hours</span>
                                                <span className="text-lg font-black text-white">
                                                    {[...employeeData].sort((a, b) => b.totalHours - a.totalHours)[0]?.name || "N/A"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                                <span className="text-sm text-white/60 font-medium">Most Shifts</span>
                                                <span className="text-lg font-black text-emerald-400">
                                                    {[...employeeData].sort((a, b) => b.totalShifts - a.totalShifts)[0]?.name || "N/A"}
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-white/40 italic">No data to analyze.</p>
                                    )}
                                </div>
                            </Card>

                            <Card className="rounded-[32px] border-amber-100 bg-amber-50/50 p-6 border">
                                <div className="flex items-center gap-3 mb-2 text-amber-700">
                                    <Filter className="h-4 w-4" />
                                    <h4 className="font-black text-xs uppercase tracking-widest">Reports Tip</h4>
                                </div>
                                <p className="text-amber-800 text-sm font-medium leading-relaxed">
                                    Export data to CSV to perform deep-dive analysis in Excel or connect with external payroll systems.
                                </p>
                            </Card>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
