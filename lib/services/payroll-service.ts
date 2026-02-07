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
 * Groups time entries by employee and calculates totals for a payroll period
 */
export function processPayroll(
    entries: TimeEntry[],
    employees: Record<string, { name: string }>,
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

        return {
            employeeId: empId,
            employeeName: employees[empId]?.name || "Unknown Employee",
            totalHours: total,
            regularHours: regular,
            overtimeHours: overtime,
            periodStart,
            periodEnd
        };
    });
}

/**
 * Generates a CSV string from payroll records
 */
export function generatePayrollCSV(records: PayrollRecord[]): string {
    const headers = ["Employee Name", "External ID", "Period Start", "Period End", "Regular Hours", "Overtime Hours", "Total Hours"];
    const rows = records.map(r => [
        r.employeeName,
        r.employeeId,
        formatDate(r.periodStart),
        formatDate(r.periodEnd),
        r.regularHours.toString(),
        r.overtimeHours.toString(),
        r.totalHours.toString()
    ]);

    return [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
}

function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}
