"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileSpreadsheet, Download, Calendar, Users, Filter, ArrowRight, Loader2, Info } from "lucide-react"
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { processPayroll, generatePayrollCSV, PayrollRecord } from "@/lib/services/payroll-service"
import { format, subDays, startOfDay, endOfDay } from "date-fns"
import { toast } from "sonner"
import { useAuth } from "@/components/auth-context"

export default function AdminPayrollPage() {
    const { userData } = useAuth()
    const [records, setRecords] = useState<PayrollRecord[]>([])
    const [loading, setLoading] = useState(false)
    const [dateRange, setDateRange] = useState({
        start: format(subDays(new Date(), 14), "yyyy-MM-dd"), // Last 14 days
        end: format(new Date(), "yyyy-MM-dd")
    })

    const fetchPayrollData = async () => {
        if (!userData?.organizationId) return
        const orgId = userData.organizationId
        setLoading(true)
        try {
            const startDate = startOfDay(new Date(dateRange.start))
            const endDate = endOfDay(new Date(dateRange.end))

            // 1. Fetch employees for this organization
            const empSnapshot = await getDocs(query(
                collection(db, "users"),
                where("organizationId", "==", orgId)
            ))
            const employees: Record<string, { name: string }> = {}
            empSnapshot.forEach(doc => {
                employees[doc.id] = { name: doc.data().name }
            })

            // 2. Fetch time entries for the period from sub-collection
            const entriesQuery = query(
                collection(db, "organizations", orgId, "time_entries"),
                where("clockInTime", ">=", Timestamp.fromDate(startDate)),
                where("clockInTime", "<=", Timestamp.fromDate(endDate)),
                orderBy("clockInTime", "desc")
            )
            const entrySnapshot = await getDocs(entriesQuery)
            const entries = entrySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as any[]

            // 3. Process records
            const results = processPayroll(entries, employees, startDate, endDate)
            setRecords(results)

            if (results.length === 0) {
                toast.info("No time entries found for the selected period.")
            }
        } catch (error) {
            console.error("Error processing payroll:", error)
            toast.error("Failed to generate payroll data.")
        } finally {
            setLoading(false)
        }
    }

    const handleExport = () => {
        if (records.length === 0) {
            toast.error("No data to export.")
            return
        }

        const csv = generatePayrollCSV(records)
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `payroll_report_${dateRange.start}_to_${dateRange.end}.csv`)
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success("CSV report downloaded!")
    }

    useEffect(() => {
        fetchPayrollData()
    }, [])

    return (
        <div className="space-y-10 max-w-7xl mx-auto px-4 lg:px-0 pb-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900 tracking-tight text-center lg:text-left">Payroll Automation</h1>
                    <p className="text-neutral-500 font-medium">Generate bi-weekly reports and export CSVs for your payroll provider.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex items-center gap-2 bg-white border border-neutral-100 rounded-xl p-1 shadow-sm">
                        <input
                            type="date"
                            className="text-sm font-bold border-0 focus:ring-0 p-2 rounded-lg bg-transparent"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        />
                        <ArrowRight className="h-4 w-4 text-neutral-300" />
                        <input
                            type="date"
                            className="text-sm font-bold border-0 focus:ring-0 p-2 rounded-lg bg-transparent"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        />
                    </div>
                    <Button
                        onClick={fetchPayrollData}
                        className="rounded-xl h-11 px-6 bg-primary hover:bg-primary-600 font-bold shadow-lg shadow-primary/10"
                    >
                        Apply
                    </Button>
                </div>
            </header>

            <div className="grid lg:grid-cols-12 gap-8">
                {/* Payroll Table */}
                <Card className="lg:col-span-12 rounded-[32px] border-neutral-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 p-6 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                <FileSpreadsheet className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold text-neutral-900">Calculated Payroll</CardTitle>
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">Period: {dateRange.start} to {dateRange.end}</p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            onClick={handleExport}
                            disabled={loading || records.length === 0}
                            className="rounded-xl border-neutral-200 h-10 px-4 font-bold text-neutral-700 hover:bg-neutral-100"
                        >
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-neutral-50/30">
                                <TableRow className="hover:bg-transparent border-neutral-100">
                                    <TableHead className="px-8 font-bold text-neutral-400 uppercase text-[10px] tracking-widest h-12">Employee</TableHead>
                                    <TableHead className="font-bold text-neutral-400 uppercase text-[10px] tracking-widest h-12 text-center">Regular Hrs</TableHead>
                                    <TableHead className="font-bold text-neutral-400 uppercase text-[10px] tracking-widest h-12 text-center">Overtime</TableHead>
                                    <TableHead className="font-bold text-neutral-400 uppercase text-[10px] tracking-widest h-12 text-center">Total Hrs</TableHead>
                                    <TableHead className="px-8 text-right font-bold text-neutral-400 uppercase text-[10px] tracking-widest h-12">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <TableRow key={i} className="animate-pulse">
                                            <TableCell colSpan={5} className="py-8 px-8"><div className="h-10 bg-neutral-50 rounded-lg w-full"></div></TableCell>
                                        </TableRow>
                                    ))
                                ) : records.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-24 text-center">
                                            <div className="flex flex-col items-center gap-3 text-neutral-300">
                                                <Info className="h-12 w-12 opacity-20" />
                                                <p className="font-bold text-neutral-400">No data available for this range.</p>
                                                <p className="text-xs max-w-xs mx-auto">Try selecting a different date range or ensure employees have clocked in during this period.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    records.map((record) => (
                                        <TableRow key={record.employeeId} className="hover:bg-neutral-50/30 transition-colors border-neutral-50">
                                            <TableCell className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 font-bold">
                                                        {record.employeeName[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-neutral-900">{record.employeeName}</p>
                                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">ID: {record.employeeId.slice(0, 8)}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-neutral-700">{record.regularHours}h</TableCell>
                                            <TableCell className="text-center">
                                                <span className={record.overtimeHours > 0 ? "font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg" : "text-neutral-400"}>
                                                    {record.overtimeHours > 0 ? `+${record.overtimeHours}h` : '0h'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="inline-flex flex-col items-center">
                                                    <span className="text-lg font-black text-neutral-900 tracking-tighter">{record.totalHours}h</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-8 text-right">
                                                <Button variant="ghost" size="sm" className="font-bold text-primary hover:text-primary-600 hover:bg-primary/5 rounded-lg">
                                                    Breakdown
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Automation Info */}
                <div className="lg:col-span-12 grid md:grid-cols-2 gap-6">
                    <Card className="rounded-[24px] bg-neutral-900 text-white p-6 border-0 shadow-lg shadow-neutral-200">
                        <div className="flex items-start gap-4">
                            <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                                <Users className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-lg mb-1">Payroll Integrity</h4>
                                <p className="text-neutral-400 text-sm leading-relaxed">
                                    All hours shown above have been verified via geofencing. Flagged entries are excluded by default to ensure audit compliance.
                                </p>
                            </div>
                        </div>
                    </Card>
                    <Card className="rounded-[24px] bg-emerald-500 text-white p-6 border-0 shadow-lg shadow-emerald-200">
                        <div className="flex items-start gap-4">
                            <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                                <Download className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-lg mb-1">Provider Integration</h4>
                                <p className="text-emerald-50 text-sm leading-relaxed">
                                    Your exported CSV is formatted for direct upload to Gusto, QuickBooks, and ADP. No manual mapping required.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
