"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DollarSign, Download, MapPin, Filter, Clock, Users, Calendar, Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { collection, query, where, getDocs, onSnapshot, orderBy, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, subDays } from "date-fns"
import { roundToNearest15, formatHoursMinutes, applyRounding, PayrollSettings } from "@/lib/services/payroll-service"

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

interface TimeEntryRow {
    id: string
    employeeId: string
    employeeName: string
    locationId: string
    locationName: string
    clockInTime: Date
    clockOutTime: Date | null
    rawMinutes: number
    roundedMinutes: number
}

interface LocationTab {
    id: string
    name: string
}

type DatePreset = "today" | "thisWeek" | "last7" | "last14" | "last30" | "custom"

export default function PayrollPage() {
    const { userData } = useAuth()
    const [loading, setLoading] = useState(true)
    const [entries, setEntries] = useState<TimeEntryRow[]>([])
    const [locations, setLocations] = useState<LocationTab[]>([])
    const [selectedLocationId, setSelectedLocationId] = useState<string>("all")
    const [datePreset, setDatePreset] = useState<DatePreset>("thisWeek")
    const [customStart, setCustomStart] = useState("")
    const [customEnd, setCustomEnd] = useState("")

    const [payrollSettings, setPayrollSettings] = useState<PayrollSettings>({ roundingInterval: 15, roundingBuffer: 5 })

    // Fetch org settings
    useEffect(() => {
        if (!userData?.organizationId) return
        getDoc(doc(db, "organizations", userData.organizationId)).then(snap => {
            if (snap.exists()) {
                const data = snap.data()
                if (data.payrollSettings) {
                    setPayrollSettings(data.payrollSettings)
                }
            }
        })
    }, [userData?.organizationId])

    // Compute date range from preset
    const dateRange = useMemo(() => {
        const now = new Date()
        switch (datePreset) {
            case "today":
                return { start: startOfDay(now), end: endOfDay(now) }
            case "thisWeek":
                return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfDay(now) }
            case "last7":
                return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) }
            case "last14":
                return { start: startOfDay(subDays(now, 13)), end: endOfDay(now) }
            case "last30":
                return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) }
            case "custom":
                return {
                    start: customStart ? startOfDay(new Date(customStart + "T00:00:00")) : startOfDay(subDays(now, 6)),
                    end: customEnd ? endOfDay(new Date(customEnd + "T00:00:00")) : endOfDay(now)
                }
        }
    }, [datePreset, customStart, customEnd])

    // Fetch locations once
    useEffect(() => {
        if (!userData?.organizationId) return
        const orgId = userData.organizationId

        getDocs(collection(db, "organizations", orgId, "locations")).then(snap => {
            setLocations(snap.docs.map(d => ({ id: d.id, name: (d.data() as any).name })))
        })
    }, [userData?.organizationId])

    // Listen for time entries based on date range
    useEffect(() => {
        if (!userData?.organizationId) return
        const orgId = userData.organizationId
        setLoading(true)

        const q = query(
            collection(db, "organizations", orgId, "time_entries"),
            where("clockInTime", ">=", dateRange.start),
            where("clockInTime", "<=", dateRange.end),
            orderBy("clockInTime", "desc")
        )

        const unsub = onSnapshot(q, (snapshot) => {
            const now = new Date()
            const rows: TimeEntryRow[] = snapshot.docs.map(doc => {
                const data = doc.data()
                const clockIn = toJsDate(data.clockInTime) || new Date()
                const clockOut = toJsDate(data.clockOutTime)

                let rawMinutes = 0
                if (clockOut) {
                    rawMinutes = Math.max(0, (clockOut.getTime() - clockIn.getTime()) / (1000 * 60))
                } else {
                    // Active entry — compute running time
                    rawMinutes = Math.max(0, (now.getTime() - clockIn.getTime()) / (1000 * 60))
                }

                return {
                    id: doc.id,
                    employeeId: data.employeeId,
                    employeeName: data.userName || "Unknown",
                    locationId: data.locationId || "",
                    locationName: data.locationName || "Unknown",
                    clockInTime: clockIn,
                    clockOutTime: clockOut,
                    rawMinutes,
                    roundedMinutes: applyRounding(rawMinutes, payrollSettings.roundingInterval, payrollSettings.roundingBuffer),
                }
            })
            setEntries(rows)
            setLoading(false)
        })

        return () => unsub()
    }, [userData?.organizationId, dateRange.start.getTime(), dateRange.end.getTime(), payrollSettings.roundingInterval, payrollSettings.roundingBuffer])

    // Fetch employees to get pay rates
    const [employeesMap, setEmployeesMap] = useState<Record<string, { payRate: number }>>({})
    useEffect(() => {
        if (!userData?.organizationId) return
        const fetchEmployees = async () => {
            const empSnapshot = await getDocs(query(
                collection(db, "users"),
                where("organizationId", "==", userData.organizationId)
            ))
            const map: Record<string, { payRate: number }> = {}
            empSnapshot.docs.forEach(doc => {
                map[doc.id] = { payRate: doc.data().payRate || 0 }
            })
            setEmployeesMap(map)
        }
        fetchEmployees()
    }, [userData?.organizationId])

    // Filter entries by selected location
    const filtered = useMemo(() => {
        let res = entries

        // Filter out "invalid" entries (completed but 0 minutes)
        // This hides entries where auto-clock-out might have triggered immediately
        res = res.filter(e => {
            if (!e.clockOutTime) return true // Keep active
            return e.rawMinutes >= 1 // Must be at least 1 minute
        })

        if (selectedLocationId === "all") return res
        return res.filter(e => e.locationId === selectedLocationId)
    }, [entries, selectedLocationId])

    // Employee summaries
    const employeeSummaries = useMemo(() => {
        const map: Record<string, { name: string; rawMinutes: number; roundedMinutes: number; entries: number; payRate: number }> = {}
        filtered.forEach(e => {
            if (!map[e.employeeId]) {
                map[e.employeeId] = {
                    name: e.employeeName,
                    rawMinutes: 0,
                    roundedMinutes: 0,
                    entries: 0,
                    payRate: employeesMap[e.employeeId]?.payRate || 0
                }
            }
            map[e.employeeId].rawMinutes += e.rawMinutes
            map[e.employeeId].roundedMinutes += e.roundedMinutes
            map[e.employeeId].entries += 1
        })
        return Object.entries(map)
            .map(([id, data]) => ({
                id,
                ...data,
                totalPay: (data.roundedMinutes / 60) * data.payRate
            }))
            .sort((a, b) => b.roundedMinutes - a.roundedMinutes)
    }, [filtered, employeesMap])

    const totalRoundedMinutes = employeeSummaries.reduce((sum, e) => sum + e.roundedMinutes, 0)
    const totalAmountDue = employeeSummaries.reduce((sum, e) => sum + e.totalPay, 0)

    const selectedLocationName = selectedLocationId === "all"
        ? "All Locations"
        : locations.find(l => l.id === selectedLocationId)?.name || "Location"

    const roundingDescription = useMemo(() => {
        if (payrollSettings.roundingInterval === 0) return "Exact time (No Rounding)"
        return `Rounded to nearest ${payrollSettings.roundingInterval} min`
    }, [payrollSettings.roundingInterval])

    // CSV export
    const handleExportCSV = () => {
        const headers = ["Employee Name", "Location", "Date", "Clock In", "Clock Out", "Raw Hours", "Rounded Hours", "Pay Rate", "Total Pay"]
        const rows: (string | number)[][] = filtered.map(e => {
            const rate = employeesMap[e.employeeId]?.payRate || 0
            // Recalculate based on current settings for consistency (though filtered should already be proper)
            // But relying on e.roundedMinutes is safer if we ensure it's up to date.
            // Since we updated 'entries' effect to depend on settings, e.roundedMinutes IS up to date.
            const roundedMins = e.roundedMinutes

            return [
                e.employeeName,
                e.locationName,
                format(e.clockInTime, "yyyy-MM-dd"),
                format(e.clockInTime, "h:mm a"),
                e.clockOutTime ? format(e.clockOutTime, "h:mm a") : "Active",
                (e.rawMinutes / 60).toFixed(2),
                (roundedMins / 60).toFixed(2),
                rate.toFixed(2),
                ((roundedMins / 60) * rate).toFixed(2)
            ]
        })

        // Add summary section
        rows.push([])
        rows.push(["--- EMPLOYEE TOTALS ---", "", "", "", "", "", "", "", ""])
        employeeSummaries.forEach(s => {
            rows.push([s.name, "", "", "", "", (s.rawMinutes / 60).toFixed(2), (s.roundedMinutes / 60).toFixed(2), s.payRate.toFixed(2), s.totalPay.toFixed(2)])
        })
        rows.push(["TOTAL", "", "", "", "", "", (totalRoundedMinutes / 60).toFixed(2), "", totalAmountDue.toFixed(2)])

        const csv = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n")

        const blob = new Blob([csv], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `payroll_${format(dateRange.start, "yyyy-MM-dd")}_to_${format(dateRange.end, "yyyy-MM-dd")}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 lg:px-0 pb-12">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Payroll</h1>
                    <div className="flex items-center gap-2">
                        <p className="text-neutral-500 font-medium">
                            {format(dateRange.start, "MMM d")} – {format(dateRange.end, "MMM d, yyyy")} •
                        </p>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-auto p-0 hover:bg-transparent text-primary font-bold flex items-center gap-1 group">
                                    <MapPin className="h-4 w-4" />
                                    {selectedLocationName}
                                    <Filter className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="rounded-xl border-neutral-100 shadow-xl w-56">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-3 py-2">Filter by Location</DropdownMenuLabel>
                                <DropdownMenuItem
                                    className="rounded-lg mx-1 font-bold py-2 px-3 focus:bg-primary/5 focus:text-primary"
                                    onClick={() => setSelectedLocationId("all")}
                                >
                                    All Locations
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
                <Button
                    onClick={handleExportCSV}
                    className="rounded-xl px-6 h-12 bg-primary hover:bg-primary-600 shadow-lg shadow-primary/20 font-bold"
                    disabled={filtered.length === 0}
                >
                    <Download className="mr-2 h-5 w-5" />
                    Export CSV
                </Button>
            </header>

            {/* Date Range Presets */}
            <div className="flex flex-wrap items-center gap-2">
                {([
                    { key: "today", label: "Today" },
                    { key: "thisWeek", label: "This Week" },
                    { key: "last7", label: "Last 7 Days" },
                    { key: "last14", label: "Last 14 Days" },
                    { key: "last30", label: "Last 30 Days" },
                    { key: "custom", label: "Custom" },
                ] as { key: DatePreset; label: string }[]).map(preset => (
                    <Button
                        key={preset.key}
                        variant={datePreset === preset.key ? "default" : "outline"}
                        size="sm"
                        className={`rounded-xl font-bold text-xs ${datePreset === preset.key
                            ? "bg-primary text-white shadow-md shadow-primary/20"
                            : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                            }`}
                        onClick={() => setDatePreset(preset.key)}
                    >
                        {preset.label}
                    </Button>
                ))}
                {datePreset === "custom" && (
                    <div className="flex items-center gap-2 ml-2">
                        <Input
                            type="date"
                            value={customStart}
                            onChange={e => setCustomStart(e.target.value)}
                            className="rounded-xl border-neutral-200 w-40 text-sm font-medium"
                        />
                        <span className="text-neutral-400 font-bold text-sm">to</span>
                        <Input
                            type="date"
                            value={customEnd}
                            onChange={e => setCustomEnd(e.target.value)}
                            className="rounded-xl border-neutral-200 w-40 text-sm font-medium"
                        />
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-4">
                <Card className="rounded-[24px] border-neutral-100 shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
                        <CardTitle className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Total Amount Due</CardTitle>
                        <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                            <DollarSign className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-6">
                        <div className="text-3xl font-black text-neutral-900 tracking-tighter">
                            ${totalAmountDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-neutral-500 font-medium mt-2">Estimated payroll cost</p>
                        <div className="h-1.5 w-full bg-emerald-500/10 mt-4 -mb-2 rounded-full" />
                    </CardContent>
                </Card>

                <Card className="rounded-[24px] border-neutral-100 shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
                        <CardTitle className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Total Hours</CardTitle>
                        <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-primary/5 text-primary">
                            <Clock className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-6">
                        <div className="text-3xl font-black text-neutral-900 tracking-tighter">
                            {formatHoursMinutes(totalRoundedMinutes)}
                        </div>
                        <p className="text-xs text-neutral-500 font-medium mt-2">{roundingDescription}</p>
                        <div className="h-1.5 w-full bg-primary/5 mt-4 -mb-2 rounded-full" />
                    </CardContent>
                </Card>

                <Card className="rounded-[24px] border-neutral-100 shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
                        <CardTitle className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Employees</CardTitle>
                        <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-primary/5 text-primary">
                            <Users className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-6">
                        <div className="text-3xl font-black text-neutral-900 tracking-tighter">
                            {employeeSummaries.length}
                        </div>
                        <p className="text-xs text-neutral-500 font-medium mt-2">With recorded entries</p>
                        <div className="h-1.5 w-full bg-primary/5 mt-4 -mb-2 rounded-full" />
                    </CardContent>
                </Card>

                <Card className="rounded-[24px] border-neutral-100 shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
                        <CardTitle className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Total Entries</CardTitle>
                        <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-primary/5 text-primary">
                            <Calendar className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-6">
                        <div className="text-3xl font-black text-neutral-900 tracking-tighter">
                            {filtered.length}
                        </div>
                        <p className="text-xs text-neutral-500 font-medium mt-2">Clock-in/out records</p>
                        <div className="h-1.5 w-full bg-primary/5 mt-4 -mb-2 rounded-full" />
                    </CardContent>
                </Card>
            </div>

            {/* Employee Summary Table */}
            {employeeSummaries.length > 0 && (
                <Card className="rounded-[32px] border-neutral-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 pb-4 pt-6 px-8">
                        <CardTitle className="text-lg font-bold text-neutral-900">Employee Totals</CardTitle>
                        <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1">
                            {selectedLocationName} • {format(dateRange.start, "MMM d")} – {format(dateRange.end, "MMM d")}
                        </p>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-neutral-50/30 hover:bg-neutral-50/30">
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-neutral-400 pl-8">Employee</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-neutral-400 text-center">Entries</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-neutral-400 text-right">Raw Hours</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-neutral-400 text-right">Rounded Hours</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-neutral-400 text-right">Pay Rate</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-neutral-400 text-right pr-8">Total Pay</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employeeSummaries.map(emp => (
                                        <TableRow key={emp.id} className="hover:bg-neutral-50/50">
                                            <TableCell className="font-bold text-neutral-900 pl-8">{emp.name}</TableCell>
                                            <TableCell className="text-center text-neutral-500 font-medium">{emp.entries}</TableCell>
                                            <TableCell className="text-right text-neutral-400 font-medium">{formatHoursMinutes(emp.rawMinutes)}</TableCell>
                                            <TableCell className="text-right font-bold text-neutral-900">{formatHoursMinutes(emp.roundedMinutes)}</TableCell>
                                            <TableCell className="text-right text-neutral-500 font-medium">${emp.payRate.toFixed(2)}/hr</TableCell>
                                            <TableCell className="text-right font-black text-emerald-600 pr-8">
                                                ${emp.totalPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-neutral-50/50 hover:bg-neutral-50/50 border-t-2 border-neutral-200">
                                        <TableCell className="font-black text-neutral-900 pl-8">Total</TableCell>
                                        <TableCell className="text-center font-bold text-neutral-500">{filtered.length}</TableCell>
                                        <TableCell className="text-right font-medium text-neutral-400">
                                            {formatHoursMinutes(filtered.reduce((s, e) => s + e.rawMinutes, 0))}
                                        </TableCell>
                                        <TableCell className="text-right font-black text-neutral-900">
                                            {formatHoursMinutes(totalRoundedMinutes)}
                                        </TableCell>
                                        <TableCell className="text-right text-neutral-400">—</TableCell>
                                        <TableCell className="text-right font-black text-emerald-700 pr-8 text-lg">
                                            ${totalAmountDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Detailed Time Entries */}
            <Card className="rounded-[32px] border-neutral-100 shadow-sm overflow-hidden">
                <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 pb-4 pt-6 px-8">
                    <CardTitle className="text-lg font-bold text-neutral-900">Time Entries</CardTitle>
                    <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1">
                        Detailed clock-in / clock-out records
                    </p>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="py-16 text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                            <p className="text-sm font-bold text-neutral-400 mt-3">Loading entries...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-16 text-center">
                            <DollarSign className="h-10 w-10 text-neutral-200 mx-auto mb-3" />
                            <p className="text-sm font-bold text-neutral-400">No time entries found</p>
                            <p className="text-xs text-neutral-300 mt-1">Adjust the date range or location filter.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-neutral-50/30 hover:bg-neutral-50/30">
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-neutral-400 pl-8">Employee</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-neutral-400">Location</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-neutral-400">Date</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-neutral-400">Clock In</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-neutral-400">Clock Out</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-neutral-400 text-right">Raw</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-neutral-400 text-right pr-8">Rounded</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map(entry => (
                                        <TableRow key={entry.id} className="hover:bg-neutral-50/50">
                                            <TableCell className="font-bold text-neutral-900 pl-8">{entry.employeeName}</TableCell>
                                            <TableCell className="text-neutral-500 font-medium">{entry.locationName}</TableCell>
                                            <TableCell className="text-neutral-500 font-medium">{format(entry.clockInTime, "MMM d, yyyy")}</TableCell>
                                            <TableCell className="text-neutral-600 font-medium">{format(entry.clockInTime, "h:mm a")}</TableCell>
                                            <TableCell className="font-medium">
                                                {entry.clockOutTime ? (
                                                    <span className="text-neutral-600">{format(entry.clockOutTime, "h:mm a")}</span>
                                                ) : (
                                                    <span className="text-emerald-600 font-bold">Active</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right text-neutral-400 font-medium">
                                                {entry.clockOutTime ? formatHoursMinutes(entry.rawMinutes) : "—"}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-neutral-900 pr-8">
                                                {entry.clockOutTime ? formatHoursMinutes(entry.roundedMinutes) : "—"}
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
    )
}
