import { Timestamp } from "firebase/firestore";

export interface TimeEntry {
    id: string;
    employeeId: string;
    clockInTime: Timestamp | any;
    clockOutTime: Timestamp | any;
    locationId: string;
}

export interface PayrollRecord {
    employeeId: string;
    employeeName: string;
    totalHours: number;
    regularHours: number;
    overtimeHours: number;
    payRate: number;
    totalPay: number;
    periodStart: Date;
    periodEnd: Date;
}

/**
 * Calculates duration between two timestamps in hours
 */
export function calculateDuration(start: any, end: any): number {
    if (!start || !end) return 0;

    const startTime = start.toDate ? start.toDate().getTime() : new Date(start).getTime();
    const endTime = end.toDate ? end.toDate().getTime() : new Date(end).getTime();

    const diffMs = endTime - startTime;
    return Math.max(0, diffMs / (1000 * 60 * 60));
}

/**
 * settings for payroll calculations
 */
export interface PayrollSettings {
    roundingInterval: number; // 0 (none), 15, 30
    roundingBuffer: number;   // Minutes (e.g. 5)
}

/**
 * Applies customizable rounding logic.
 * Default corresponds to "nearest 15 minutes from 5 minutes away" behavior.
 */
export function applyRounding(totalMinutes: number, interval: number = 15, buffer: number = 5): number {
    if (interval <= 0) return totalMinutes;

    const blocks = Math.floor(totalMinutes / interval);
    const remainder = totalMinutes % interval;

    // "from X minutes away from the next period" means if we are within X minutes of the next block
    // e.g. interval 15, buffer 5. Threshold = 15 - 5 = 10.
    // if remainder >= 10, round up.
    const threshold = interval - buffer;

    if (remainder >= threshold) {
        return (blocks + 1) * interval;
    }
    return blocks * interval;
}

/**
 * Legacy wrapper for backward compatibility
 */
export function roundToNearest15(totalMinutes: number): number {
    return applyRounding(totalMinutes, 15, 5);
}

/**
 * Formats total minutes into "Xh Ym" display string
 */
export function formatHoursMinutes(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60);
    const m = Math.round(totalMinutes % 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

/**
 * Groups time entries by employee and calculates totals for a payroll period
 */
export function processPayroll(
    entries: TimeEntry[],
    employees: Record<string, { name: string; payRate?: number }>,
    periodStart: Date,
    periodEnd: Date,
    overtimeThreshold: number = 40 // Weekly threshold
): PayrollRecord[] {
    const employeeTotals: Record<string, { total: number; entries: TimeEntry[] }> = {};

    entries.forEach(entry => {
        if (!employeeTotals[entry.employeeId]) {
            employeeTotals[entry.employeeId] = { total: 0, entries: [] };
        }
        const duration = calculateDuration(entry.clockInTime, entry.clockOutTime);
        employeeTotals[entry.employeeId].total += duration;
        employeeTotals[entry.employeeId].entries.push(entry);
    });

    return Object.entries(employeeTotals).map(([empId, data]) => {
        const total = Number(data.total.toFixed(2));
        const overtime = total > overtimeThreshold ? Number((total - overtimeThreshold).toFixed(2)) : 0;
        const regular = Number((total - overtime).toFixed(2));
        const payRate = employees[empId]?.payRate || 0;
        const totalPay = Number((total * payRate).toFixed(2));

        return {
            employeeId: empId,
            employeeName: employees[empId]?.name || "Unknown Employee",
            totalHours: total,
            regularHours: regular,
            overtimeHours: overtime,
            payRate,
            totalPay,
            periodStart,
            periodEnd
        };
    });
}

/**
 * Generates a CSV string from payroll records
 */
export function generatePayrollCSV(records: PayrollRecord[]): string {
    const headers = ["Employee Name", "External ID", "Period Start", "Period End", "Regular Hours", "Overtime Hours", "Total Hours", "Pay Rate", "Total Pay"];
    const rows = records.map(r => [
        r.employeeName,
        r.employeeId,
        formatDate(r.periodStart),
        formatDate(r.periodEnd),
        r.regularHours.toString(),
        r.overtimeHours.toString(),
        r.totalHours.toString(),
        r.payRate.toFixed(2),
        r.totalPay.toFixed(2)
    ]);

    return [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
}

function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}
