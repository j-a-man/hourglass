import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, Timestamp, orderBy } from "firebase/firestore"
import { UserData } from "@/components/auth-context"
import { startOfDay, endOfDay, differenceInMinutes, format, parseISO, isWithinInterval } from "date-fns"

// Correct Type Definition based on actual Firestore data
interface TimeEntry {
    id: string
    employeeId: string
    clockInTime: Timestamp
    clockOutTime: Timestamp | null
    locationId: string
    locationName?: string
    clockInLocation?: any
    clockOutLocation?: any
    clockOutReason?: string
    isApproved?: boolean
    flags?: any[]
}

export interface ReportStats {
    totalHours: number
    activeEmployees: number
    estPayroll: number
    avgShiftDuration: number // in hours
    completionRate: number // % of shifts with clock-out
}

export interface DailyActivity {
    date: string // YYYY-MM-DD
    hours: number
    employeeCount: number
}

export interface EmployeePerformance {
    userId: string
    name: string
    role: string
    totalShifts: number
    totalHours: number
    estPay: number
    lastActive: string
}

export const analyticsService = {
    async getReportData(organizationId: string, startDate: Date, endDate: Date, locationId?: string) {
        if (!organizationId) throw new Error("Organization ID is required")

        // 1. Fetch Users
        const usersRef = collection(db, "users")
        const qUsers = query(usersRef, where("organizationId", "==", organizationId))
        const userDocs = await getDocs(qUsers)
        const users: UserData[] = []
        userDocs.forEach(doc => users.push(doc.data() as UserData))

        // 2. Fetch Time Entries from correct sub-collection
        const entriesRef = collection(db, "organizations", organizationId, "time_entries")

        let qConstraints = [
            where("clockInTime", ">=", Timestamp.fromDate(startOfDay(startDate))),
            where("clockInTime", "<=", Timestamp.fromDate(endOfDay(endDate))),
            orderBy("clockInTime", "asc")
        ]

        if (locationId && locationId !== "all") {
            qConstraints = [
                where("locationId", "==", locationId),
                ...qConstraints
            ]
        }

        const qEntries = query(entriesRef, ...qConstraints)

        const entryDocs = await getDocs(qEntries)
        const entries: TimeEntry[] = []
        entryDocs.forEach(doc => {
            const data = doc.data()
            entries.push({ id: doc.id, ...data } as TimeEntry)
        })

        // 3. Process Data
        return processAnalytics(users, entries, startDate, endDate)
    }
}

function processAnalytics(users: UserData[], entries: TimeEntry[], start: Date, end: Date) {
    const userMap = new Map(users.map(u => [u.uid, u]))

    let totalMinutes = 0
    let completedShifts = 0
    let totalShifts = 0
    let totalPayroll = 0

    const dailyMap = new Map<string, { minutes: number, userIds: Set<string> }>()
    const employeeStats = new Map<string, EmployeePerformance>()

    // Initialize Employee Stats
    users.forEach(u => {
        employeeStats.set(u.uid, {
            userId: u.uid,
            name: u.name,
            role: u.role || 'staff',
            totalShifts: 0,
            totalHours: 0,
            estPay: 0,
            lastActive: "N/A"
        })
    })

    // Process Entries
    // Accessing directly since entries are now correct TimeEntry objects

    for (const entry of entries) {
        const user = userMap.get(entry.employeeId)
        if (!user) continue

        // Count every entry as a shift attempt
        totalShifts++

        if (entry.clockOutTime) {
            const duration = differenceInMinutes(entry.clockOutTime.toDate(), entry.clockInTime.toDate())

            // Basic validation: 1 min to 24 hours
            if (duration > 0 && duration < 1440) {
                completedShifts++
                totalMinutes += duration

                // Daily Stats
                const dayKey = format(entry.clockInTime.toDate(), "yyyy-MM-dd")
                const dayStat = dailyMap.get(dayKey) || { minutes: 0, userIds: new Set<string>() }
                dayStat.minutes += duration
                dayStat.userIds.add(entry.employeeId)
                dailyMap.set(dayKey, dayStat)

                // Payroll
                // Check hourlyRate (standard), payRate (legacy/misnamed), or employeeDetails.payRate (nested)
                const hourlyRate = user.hourlyRate || (user as any).payRate || user.employeeDetails?.payRate || 0
                const pay = (duration / 60) * hourlyRate
                totalPayroll += pay

                // Employee Stats
                const empStat = employeeStats.get(entry.employeeId)
                if (empStat) {
                    empStat.totalShifts += 1
                    empStat.totalHours += (duration / 60)
                    empStat.estPay += pay
                    empStat.lastActive = format(entry.clockInTime.toDate(), "MMM d")
                }
            }
        }
    }

    // Format Outputs
    const stats: ReportStats = {
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        activeEmployees: new Set(entries.map(e => e.employeeId)).size,
        estPayroll: Math.round(totalPayroll * 100) / 100,
        avgShiftDuration: completedShifts > 0 ? Math.round((totalMinutes / completedShifts / 60) * 10) / 10 : 0,
        completionRate: totalShifts > 0 ? Math.round((completedShifts / totalShifts) * 100) : 0
    }

    const dailyActivity: DailyActivity[] = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        hours: Math.round((data.minutes / 60) * 10) / 10,
        employeeCount: data.userIds.size
    })).sort((a, b) => a.date.localeCompare(b.date))

    return {
        stats,
        dailyActivity,
        employeePerformance: Array.from(employeeStats.values())
            .filter(e => {
                const user = users.find(u => u.uid === e.userId)
                if (!user) return false
                // Exclude administrative roles from performance reports
                const role = user.role as string
                const isAdminRole = role === 'admin' || role === 'owner' || role === 'manager'
                const isActive = user.status === 'active'
                const hasShifts = e.totalShifts > 0

                return !isAdminRole && (isActive || hasShifts)
            })
            .sort((a, b) => b.totalHours - a.totalHours)
    }
}
