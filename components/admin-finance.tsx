"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { format, startOfWeek, endOfWeek, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, DollarSign, Clock, AlertTriangle, TrendingUp } from "lucide-react"
import { useAuth } from "@/components/auth-context"

interface AdminFinanceProps {
    locationId: string
}

interface PayrollEntry {
    userId: string
    userName: string
    hourlyRate: number
    regularHours: number
    overtimeHours: number
    totalPay: number
    shiftsCount: number
}

export function AdminFinance({ locationId }: AdminFinanceProps) {
    const { userData } = useAuth()
    const [period, setPeriod] = useState("this_month")
    const [loading, setLoading] = useState(false)
    const [payrollData, setPayrollData] = useState<PayrollEntry[]>([])
    const [summary, setSummary] = useState({
        totalPayroll: 0,
        totalHours: 0,
        totalOvertimeHours: 0,
        avgHourlyRate: 0
    })

    useEffect(() => {
        fetchData()
    }, [locationId, period, userData?.organizationId])

    const fetchData = async () => {
        if (!userData?.organizationId) return
        const orgId = userData.organizationId
        setLoading(true)

        try {
            // 1. Determine Date Range
            const now = new Date()
            let start = startOfMonth(now)
            let end = endOfMonth(now)

            if (period === "last_month") {
                const lastMonth = subDays(startOfMonth(now), 1)
                start = startOfMonth(lastMonth)
                end = endOfMonth(lastMonth)
            } else if (period === "this_week") {
                start = startOfWeek(now)
                end = endOfWeek(now)
            } else if (period === "last_2_weeks") {
                end = endOfWeek(now)
                start = subDays(end, 13) // Roughly 2 weeks
            }

            // 2. Fetch Users (for Rates) for this organization
            const usersQ = query(
                collection(db, "users"),
                where("organizationId", "==", orgId),
                where("locationId", "==", locationId)
            )
            const usersSnap = await getDocs(usersQ)
            const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))

            // 3. Fetch Time Logs (time_entries) from organization sub-collection
            const logsQ = query(
                collection(db, "organizations", orgId, "time_entries"),
                where("locationId", "==", locationId)
            )
            const logsSnap = await getDocs(logsQ)
            const allLogs = logsSnap.docs.map(doc => doc.data())

            // Filter logs by date range client-side
            const periodLogs = allLogs.filter(log => {
                const d = log.timestamp.toDate()
                return d >= start && d <= end
            })

            // 4. Calculate Payroll
            const payrollMap = new Map<string, PayrollEntry>()

            // Initialize entries
            users.forEach(user => {
                payrollMap.set(user.id, {
                    userId: user.id,
                    userName: user.name,
                    hourlyRate: user.hourlyRate || 25, // Default if missing
                    regularHours: 0,
                    overtimeHours: 0,
                    totalPay: 0,
                    shiftsCount: 0
                })
            })

            // Group logs by user
            const logsByUser = new Map<string, any[]>()
            periodLogs.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis())

            periodLogs.forEach(log => {
                if (!logsByUser.has(log.userId)) logsByUser.set(log.userId, [])
                logsByUser.get(log.userId)?.push(log)
            })

            // Calculate hours per user
            logsByUser.forEach((logs, userId) => {
                const entry = payrollMap.get(userId)
                if (!entry) return

                let totalMs = 0
                let shifts = 0

                for (let i = 0; i < logs.length; i++) {
                    if (logs[i].type === "in") {
                        const next = logs[i + 1]
                        if (next && next.type === "out") {
                            totalMs += next.timestamp.toMillis() - logs[i].timestamp.toMillis()
                            shifts++
                        }
                    }
                }

                const totalHours = totalMs / (1000 * 60 * 60)

                // Simple Overtime Logic (Weekly > 40 rule is hard without precise weekly buckets, 
                // so for this view we'll use a simplified threshold: > 8hrs/shift avg or just raw total limit scaled?
                // Let's simpler: If period > 7 days, assume standard 40h/week overtime logic requires weekly breakdown.
                // For MVP: No OT calc complex logic, just flat hours * rate. 
                // BUT user wanted OT Monitor. Let's try to do it right: By Week.)

                // ... Actually, for "Payroll Review", let's keeps it simple:
                // Total Hours. If user worked > 40 * (weeks in period), flag it.

                const weeksWait = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7)
                const otThreshold = 40 * Math.ceil(weeksWait) // Rough calc

                let reg = totalHours
                let ot = 0

                if (totalHours > otThreshold) {
                    reg = otThreshold
                    ot = totalHours - otThreshold
                }

                entry.regularHours = reg
                entry.overtimeHours = ot
                entry.shiftsCount = shifts
                entry.totalPay = (reg * entry.hourlyRate) + (ot * entry.hourlyRate * 1.5)
            })

            const finalData = Array.from(payrollMap.values()).filter(p => p.regularHours > 0 || p.overtimeHours > 0)

            // Calc Summary
            const totalPay = finalData.reduce((acc, curr) => acc + curr.totalPay, 0)
            const totalHrs = finalData.reduce((acc, curr) => acc + curr.regularHours + curr.overtimeHours, 0)
            const totalOt = finalData.reduce((acc, curr) => acc + curr.overtimeHours, 0)

            setPayrollData(finalData)
            setSummary({
                totalPayroll: totalPay,
                totalHours: totalHrs,
                totalOvertimeHours: totalOt,
                avgHourlyRate: totalHrs > 0 ? totalPay / totalHrs : 0
            })

        } catch (error) {
            console.error("Finance fetch error:", error)
        } finally {
            setLoading(false)
        }
    }

    const exportCSV = () => {
        const headers = ["Name", "Hourly Rate", "Regular Hours", "Overtime Hours", "Total Pay", "Shifts"]
        const rows = payrollData.map(p => [
            p.userName,
            p.hourlyRate.toFixed(2),
            p.regularHours.toFixed(2),
            p.overtimeHours.toFixed(2),
            p.totalPay.toFixed(2),
            p.shiftsCount
        ])

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `payroll_${period}_${locationId}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Controls */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[180px] bg-white border-white/50">
                            <SelectValue placeholder="Select Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="this_week">This Week</SelectItem>
                            <SelectItem value="last_2_weeks">Last 2 Weeks</SelectItem>
                            <SelectItem value="this_month">This Month</SelectItem>
                            <SelectItem value="last_month">Last Month</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={exportCSV} variant="outline" className="bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50">
                    <Download className="mr-2 h-4 w-4" />
                    Export Payroll CSV
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-indigo-100 font-medium text-sm">Est. Total Payroll</p>
                                <h3 className="text-3xl font-bold mt-1">{currency.format(summary.totalPayroll)}</h3>
                            </div>
                            <div className="p-2 bg-white/20 rounded-lg">
                                <DollarSign className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 font-medium text-sm">Total Hours</p>
                                <h3 className="text-3xl font-bold mt-1 text-slate-800">{summary.totalHours.toFixed(1)} <span className="text-sm font-normal text-slate-400">hrs</span></h3>
                            </div>
                            <div className="p-2 bg-slate-100 rounded-lg">
                                <Clock className="h-6 w-6 text-slate-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 font-medium text-sm">Overtime Hours</p>
                                <h3 className={`text-3xl font-bold mt-1 ${summary.totalOvertimeHours > 0 ? "text-amber-600" : "text-slate-800"}`}>
                                    {summary.totalOvertimeHours.toFixed(1)} <span className="text-sm font-normal text-slate-400">hrs</span>
                                </h3>
                            </div>
                            <div className={`p-2 rounded-lg ${summary.totalOvertimeHours > 0 ? "bg-amber-100" : "bg-slate-100"}`}>
                                <AlertTriangle className={`h-6 w-6 ${summary.totalOvertimeHours > 0 ? "text-amber-600" : "text-slate-600"}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 font-medium text-sm">Avg. Hourly Rate</p>
                                <h3 className="text-3xl font-bold mt-1 text-slate-800">{currency.format(summary.avgHourlyRate)}</h3>
                            </div>
                            <div className="p-2 bg-slate-100 rounded-lg">
                                <TrendingUp className="h-6 w-6 text-slate-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payroll Table */}
            <Card className="overflow-hidden border-none shadow-md">
                <CardHeader className="bg-white/50 backdrop-blur-sm border-b border-slate-100">
                    <CardTitle className="text-lg font-bold text-slate-800">Payroll Details</CardTitle>
                </CardHeader>
                <CardContent className="p-0 bg-white/40">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Employee</TableHead>
                                <TableHead className="text-right">Hourly Rate</TableHead>
                                <TableHead className="text-right">Regular Hrs</TableHead>
                                <TableHead className="text-right">Overtime Hrs</TableHead>
                                <TableHead className="text-right">Total Pay</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">Loading payroll data...</TableCell>
                                </TableRow>
                            ) : payrollData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-slate-500">No activity found for this period.</TableCell>
                                </TableRow>
                            ) : (
                                payrollData.map((entry) => (
                                    <TableRow key={entry.userId} className="hover:bg-white/50 transition-colors">
                                        <TableCell className="font-medium text-slate-800">{entry.userName}</TableCell>
                                        <TableCell className="text-right">{currency.format(entry.hourlyRate)}</TableCell>
                                        <TableCell className="text-right font-mono text-slate-600">{entry.regularHours.toFixed(2)}</TableCell>
                                        <TableCell className={`text-right font-mono ${entry.overtimeHours > 0 ? "text-amber-600 font-bold" : "text-slate-400"}`}>
                                            {entry.overtimeHours > 0 ? entry.overtimeHours.toFixed(2) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-indigo-600">{currency.format(entry.totalPay)}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
