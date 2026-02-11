import { Timestamp, collection, getDocs, doc, getDoc, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format, isSameDay, startOfDay, addDays } from "date-fns"

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
    let cursor = startOfDay(startDate)
    const end = startOfDay(endDate)

    while (cursor <= end) {
        const dayKey = format(cursor, "eeee").toLowerCase()

        // Determine which users to process
        const userIds = userId ? [userId] : Array.from(templatesMap.keys())

        for (const uid of userIds) {
            const template = templatesMap.get(uid)
            if (!template || !template[dayKey]?.enabled) continue

            // Check if this user already has a real shift today
            const hasRealShift = realShifts.some(s =>
                s.userId === uid && isSameDay(s.startTime, cursor)
            )

            if (!hasRealShift) {
                const dayTemplate = template[dayKey]
                const [startH, startM] = dayTemplate.start.split(":").map(Number)
                const [endH, endM] = dayTemplate.end.split(":").map(Number)

                const virtualStart = new Date(cursor)
                virtualStart.setHours(startH, startM, 0, 0)

                const virtualEnd = new Date(cursor)
                virtualEnd.setHours(endH, endM, 0, 0)

                effectiveShifts.push({
                    id: `virtual-${uid}-${format(cursor, "yyyy-MM-dd")}`,
                    userId: uid,
                    userName: users?.[uid]?.name || "User",
                    locationId: dayTemplate.locationId,
                    locationName: dayTemplate.locationName,
                    startTime: virtualStart,
                    endTime: virtualEnd,
                    isVirtual: true,
                    status: "scheduled"
                })
            }
        }
        cursor = addDays(cursor, 1)
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
    date: Date = new Date()
): Promise<Date | null> {
    const dayStart = startOfDay(date)
    const dayEnd = new Date(dayStart)
    dayEnd.setHours(23, 59, 59, 999)

    const shifts = await getEffectiveShifts(organizationId, userId, dayStart, dayEnd)

    // If there's an active shift today, use its end time
    if (shifts.length > 0) {
        // Find the latest shift end time today
        return shifts[shifts.length - 1].endTime
    }

    // Fallback: Use Location Operating Hours
    try {
        const locationDoc = await getDocs(query(
            collection(db, "organizations", organizationId, "locations"),
            where("__name__", "==", locationId)
        ))

        if (!locationDoc.empty) {
            const locData = locationDoc.docs[0].data()
            const dayKey = format(date, "eeee").toLowerCase()
            const dayHours = locData.operatingHours?.[dayKey]

            if (dayHours?.isOpen && dayHours.close) {
                const [h, m] = dayHours.close.split(":").map(Number)
                const closeTime = new Date(date)
                closeTime.setHours(h, m, 0, 0)
                return closeTime
            }
        }
    } catch (e) {
        console.error("Error fetching location hours for auto clock-out:", e)
    }

    return null
}
