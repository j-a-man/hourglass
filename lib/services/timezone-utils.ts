/**
 * Timezone Utilities
 * Handles mapping of UI timezone strings to IANA names and calculating local date windows.
 */

const TZ_MAP: Record<string, string> = {
    "Eastern Standard Time (EST)": "America/New_York",
    "Pacific Standard Time (PST)": "America/Los_Angeles",
    "Central Standard Time (CST)": "America/Chicago",
    "Mountain Standard Time (MST)": "America/Denver",
}

/**
 * Returns the IANA timezone name for a given display string
 */
export function getIanaTz(tzString: string): string {
    return TZ_MAP[tzString] || "America/New_York"
}

/**
 * Returns the "Local Day" window in UTC for a specific timezone.
 * Useful for querying Firebase for "Today's shifts" correctly.
 */
export function getTzDayRange(ianaTz: string, date: Date = new Date()) {
    // Get the local day string (YYYY-MM-DD) in that timezone
    const localDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: ianaTz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date) // Returns "YYYY-MM-DD"

    // Create a UTC start date representing 00:00:00 in that local zone
    const start = new Date(`${localDateStr}T00:00:00`)
    // We need to convert this "naive" date to the actual UTC point it represents in the target TZ
    // A trick: use formatToParts or just manual offset calculation, 
    // but Date.toLocaleString/Intl is easiest for "what time is it there"

    // Better way: Create a formatter that returns parts
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: ianaTz,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    })

    // To get the UTC boundaries of the local day:
    // 1. Find what the local time is "now"
    // 2. Determine the date
    // 3. Create UTC dates for 00:00 and 23:59 in that zone

    const parts = formatter.formatToParts(date)
    const getPart = (type: string) => parts.find(p => p.type === type)?.value

    const year = parseInt(getPart('year')!)
    const month = parseInt(getPart('month')!)
    const day = parseInt(getPart('day')!)

    // Start of local day in UTC
    // We can use a strings-to-date approach with a timezone offset calculation
    // or just use luxon/moment if they were here. Since they aren't:

    const localStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
    // This is NOT the UTC start. This is 00:00 UTC on that day.
    // To get the actual UTC start:
    const offset = getTzOffset(ianaTz, localStart)
    const utcStart = new Date(localStart.getTime() - offset * 60 * 1000)

    const utcEnd = new Date(utcStart.getTime() + 24 * 60 * 60 * 1000 - 1)

    return { start: utcStart, end: utcEnd }
}

/**
 * Returns the current local time string (HH:mm) and day name for a timezone
 */
export function getLocalTime(ianaTz: string, date: Date = new Date()) {
    const time = new Intl.DateTimeFormat('en-GB', {
        timeZone: ianaTz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date)

    const day = new Intl.DateTimeFormat('en-US', {
        timeZone: ianaTz,
        weekday: 'long'
    }).format(date).toLowerCase()

    return { time, day }
}

/**
 * Helper to get timezone offset in minutes
 */
function getTzOffset(ianaTz: string, date: Date): number {
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: ianaTz }))
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
    return (tzDate.getTime() - utcDate.getTime()) / 60000
}
