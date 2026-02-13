import { Timestamp, collection, getDocs, doc, getDoc, query, where, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format, isSameDay, startOfDay, addDays } from "date-fns"
import { getIanaTz, getTzDayRange } from "./timezone-utils"

export interface ShiftTemplate {
    enabled: boolean
    start: string // HH:mm
    end: string   // HH:mm
    locationId: string
    locationName: string
}

export interface WeeklyTemplate {
    [key: string]: ShiftTemplate // monday, tuesday, etc.
}

export interface EffectiveShift {
    id: string
    userId: string
    userName: string
    locationId: string
    locationName: string
    startTime: Date
    endTime: Date
    isVirtual: boolean // true if from template, false if one-off
    status: string
    recurrenceGroupId?: string | null
}

/**
 * Reconciles one-off shifts with weekly templates to get the "Effective Schedule"
 */
export async function getEffectiveShifts(
    organizationId: string,
    userId: string | null, // null for all users
    startDate: Date,
    endDate: Date,
    ianaTz: string = "America/New_York",
    users?: Record<string, { name: string }> // Optional user map for names
): Promise<EffectiveShift[]> {
    const effectiveShifts: EffectiveShift[] = []

    // 1. Fetch all one-off shifts in range
    let shiftsQuery = query(
        collection(db, "organizations", organizationId, "shifts"),
        where("startTime", ">=", Timestamp.fromDate(startDate)),
        where("startTime", "<=", Timestamp.fromDate(endDate))
    )

    if (userId) {
        shiftsQuery = query(shiftsQuery, where("userId", "==", userId))
    }

    const shiftsSnapshot = await getDocs(shiftsQuery)
    const realShifts = shiftsSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
            id: doc.id,
            userId: data.userId,
            userName: data.userName || (users && data.userId ? users[data.userId]?.name : "User"),
            locationId: data.locationId,
            locationName: data.locationName,
            isVirtual: false,
            startTime: data.startTime.toDate(),
            endTime: data.endTime.toDate(),
            status: data.status || "scheduled",
            recurrenceGroupId: data.recurrenceGroupId || null
        }
    }) as EffectiveShift[]

    // 2. Fetch Weekly Templates
    const templatesMap = new Map<string, WeeklyTemplate>()

    if (userId) {
        const docRef = doc(db, "organizations", organizationId, "weeklyTemplates", userId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
            templatesMap.set(userId, docSnap.data() as WeeklyTemplate)
        }
    } else {
        const templatesSnapshot = await getDocs(
            collection(db, "organizations", organizationId, "weeklyTemplates")
        )
        templatesSnapshot.docs.forEach(doc => {
            templatesMap.set(doc.id, doc.data() as WeeklyTemplate)
        })
    }

    // 3. Generate Virtual Shifts for days without real shifts
    // We iterate day-by-day in the target timezone
    let current = new Date(startDate)
    while (current <= endDate) {
        // Get the local day name for 'current' in target TZ
        const dayKey = new Intl.DateTimeFormat('en-US', {
            timeZone: ianaTz,
            weekday: 'long'
        }).format(current).toLowerCase()

        // Determine which users to process
        const userIds = userId ? [userId] : Array.from(templatesMap.keys())

        for (const uid of userIds) {
            const template = templatesMap.get(uid)
            if (!template || !template[dayKey]?.enabled) continue

            // Check if this user already has a real shift on this specific calendar day in that TZ
            const hasRealShift = realShifts.some(s => {
                const sDate = new Intl.DateTimeFormat('en-CA', { timeZone: ianaTz }).format(s.startTime);
                const cDate = new Intl.DateTimeFormat('en-CA', { timeZone: ianaTz }).format(current);
                return s.userId === uid && sDate === cDate;
            })

            if (!hasRealShift) {
                const dayTemplate = template[dayKey]
                const [startH, startM] = dayTemplate.start.split(":").map(Number)
                const [endH, endM] = dayTemplate.end.split(":").map(Number)

                // Create the start/end as naive Date objects then adjust for TZ
                const localDateStr = new Intl.DateTimeFormat('en-CA', {
                    timeZone: ianaTz,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).format(current)

                const virtualStart = new Date(`${localDateStr}T${dayTemplate.start}:00`)
                const virtualEnd = new Date(`${localDateStr}T${dayTemplate.end}:00`)

                // Final adjustment: These Date objects are currently "local to server". 
                // We need them to be "local to IANA TZ" but correctly stored in UTC.
                // The most reliable way is using a formatter-based builder or a library.
                // Since we have getTzDayRange logic, we can use that pattern:

                const constructTzDate = (isoStr: string) => {
                    const temp = new Date(isoStr);
                    const tzDate = new Date(temp.toLocaleString('en-US', { timeZone: ianaTz }))
                    const utcDate = new Date(temp.toLocaleString('en-US', { timeZone: 'UTC' }))
                    const offset = (tzDate.getTime() - utcDate.getTime()) / 60000
                    return new Date(temp.getTime() - offset * 60 * 1000)
                }

                effectiveShifts.push({
                    id: `virtual-${uid}-${localDateStr}`,
                    userId: uid,
                    userName: users?.[uid]?.name || "User",
                    locationId: dayTemplate.locationId,
                    locationName: dayTemplate.locationName,
                    startTime: constructTzDate(`${localDateStr}T${dayTemplate.start}:00`),
                    endTime: constructTzDate(`${localDateStr}T${dayTemplate.end}:00`),
                    isVirtual: true,
                    status: "scheduled"
                })
            }
        }
        current = addDays(current, 1)
    }

    return [...realShifts, ...effectiveShifts].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
}

/**
 * Returns the expected clock-out time for a user on a given day
 */
export async function getAutoClockOutTime(
    organizationId: string,
    userId: string,
    locationId: string,
    date: Date = new Date(),
    ianaTz?: string
): Promise<Date | null> {

    // Resolve TZ if not provided
    let finalTz = ianaTz
    if (!finalTz) {
        const orgDoc = await getDoc(doc(db, "organizations", organizationId))
        finalTz = getIanaTz(orgDoc.data()?.timezone || "Eastern Standard Time (EST)")
    }

    const { start: dayStart, end: dayEnd } = getTzDayRange(finalTz, date)

    const shifts = await getEffectiveShifts(organizationId, userId, dayStart, dayEnd, finalTz)

    // If there's an active shift today, use its end time
    if (shifts.length > 0) {
        return shifts[shifts.length - 1].endTime
    }

    // Fallback: Use Location Operating Hours
    try {
        const locDoc = await getDoc(doc(db, "organizations", organizationId, "locations", locationId))

        if (locDoc.exists()) {
            const locData = locDoc.data()
            const dayKey = new Intl.DateTimeFormat('en-US', {
                timeZone: finalTz,
                weekday: 'long'
            }).format(date).toLowerCase()

            const dayHours = locData.operatingHours?.[dayKey]

            if (dayHours?.isOpen && dayHours.close) {
                const localDateStr = new Intl.DateTimeFormat('en-CA', {
                    timeZone: finalTz,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).format(date)

                const constructTzDate = (isoStr: string) => {
                    const temp = new Date(isoStr);
                    const tzDate = new Date(temp.toLocaleString('en-US', { timeZone: finalTz! }))
                    const utcDate = new Date(temp.toLocaleString('en-US', { timeZone: 'UTC' }))
                    const offset = (tzDate.getTime() - utcDate.getTime()) / 60000
                    return new Date(temp.getTime() - offset * 60 * 1000)
                }

                return constructTzDate(`${localDateStr}T${dayHours.close}:00`)
            }
        }
    } catch (e) {
        console.error("Error fetching location hours for auto clock-out:", e)
    }

    return null
}
