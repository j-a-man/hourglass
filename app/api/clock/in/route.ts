import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { verifyLocation } from '@/lib/services/location-service';
import { isWithinOperatingHours } from '@/lib/services/schedule-service';
import { getEffectiveShifts } from '@/lib/services/schedule-utils';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
    try {
        const userId = await verifyAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { locationId, coordinates } = body;
        console.log(`[API/clock/in] Start for user ${userId} at location ${locationId}`);
        console.log(`[API/clock/in] Provided coordinates:`, coordinates);

        if (!locationId || !coordinates) {
            return NextResponse.json({ error: 'Missing locationId or coordinates' }, { status: 400 });
        }

        // 1. Fetch user data to get organizationId
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }
        const userData = userDoc.data();
        const orgId = userData.organizationId;

        if (!orgId) {
            return NextResponse.json({ error: 'User is not associated with any organization' }, { status: 403 });
        }

        // 2. Fetch location data from organization sub-collection
        const locDoc = await getDoc(doc(db, "organizations", orgId, "locations", locationId));
        if (!locDoc.exists()) {
            return NextResponse.json({ error: 'Location not found in your organization' }, { status: 404 });
        }
        const locationData = locDoc.data();
        console.log(`[API/clock/in] Found location:`, locationData.name);

        // 2.5 Validation: Strict Shift Enforcement
        // Strategy:
        // A. If user has a shift today: MUST be within that shift's time (with buffer).
        // B. If user has NO shift today: MUST be within Location Operating Hours.

        // Fetch today's effective shifts
        const now = new Date();
        // Look for shifts in a wide window for "today" to catch any edge cases
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

        // We need to import getEffectiveShifts dynamically or ensure it's available.
        // Importing at top of file is better, but for this edit we assume imports are added.
        console.log(`[API/clock/in] Fetching shifts for user ${userId} between ${todayStart.toISOString()} and ${todayEnd.toISOString()}`);
        let shifts: any[] = [];
        try {
            shifts = await getEffectiveShifts(orgId, userId, todayStart, todayEnd);
            console.log(`[API/clock/in] Found ${shifts.length} shifts`);
        } catch (error) {
            console.error("[API/clock/in] Error fetching shifts:", error);
        }

        // Check if there is a shift covering "now" or "soon"
        // We allow clocking in 15 mins before shift starts
        const EARLY_BUFFER_MINUTES = 15;
        const LATE_BUFFER_MINUTES = 30; // Can clock in up to 30 mins after shift ends? Or just strict end? 
        // Usually you can clock in LATE for a shift, but not AFTER it ends.

        const activeShift = shifts.find(s => {
            // Check if shift is for this location
            if (s.locationId !== locationId) return false;

            // Time check
            const startBuffer = new Date(s.startTime);
            startBuffer.setMinutes(startBuffer.getMinutes() - EARLY_BUFFER_MINUTES);

            const endBuffer = new Date(s.endTime);
            // endBuffer.setMinutes(endBuffer.getMinutes() + LATE_BUFFER_MINUTES); 

            return now >= startBuffer && now <= endBuffer;
        });

        const hasShiftToday = shifts.some(s => s.locationId === locationId);
        console.log(`[API/clock/in] hasShiftToday: ${hasShiftToday}, activeShift found: ${!!activeShift}`);

        if (hasShiftToday) {
            // User HAS a shift at this location today.
            // They MUST be clocking in for that shift.
            if (!activeShift) {
                // Determine why: Too early? Too late?
                // Find the closest shift
                const closest = shifts.find(s => s.locationId === locationId); // simplified
                let msg = "You have a scheduled shift today, but it is not currently active.";
                if (closest) {
                    const startBuffer = new Date(closest.startTime);
                    startBuffer.setMinutes(startBuffer.getMinutes() - EARLY_BUFFER_MINUTES);
                    if (now < startBuffer) {
                        msg = `You are too early for your shift. You can clock in starting at ${startBuffer.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`;
                    } else if (now > closest.endTime) {
                        msg = `Your scheduled shift (${closest.startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${closest.endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}) has ended.`;
                    }
                }

                console.log(`[API/clock/in] Blocking: Outside Shift Hours. Msg: ${msg}`);
                return NextResponse.json({
                    error: 'Outside Shift Hours',
                    details: msg
                }, { status: 403 });
            }
            // If activeShift is found, proceed.
        } else {
            // User has NO shift today at this location.
            // Fallback: Check Operating Hours
            if (locationData.operatingHours) {
                const scheduleCheck = isWithinOperatingHours(locationData.operatingHours);
                if (!scheduleCheck.isValid) {
                    console.log(`[API/clock/in] Blocking: Outside Operating Hours. Reason: ${scheduleCheck.reason}`);
                    return NextResponse.json({
                        error: 'Outside operating hours',
                        details: scheduleCheck.reason
                    }, { status: 403 });
                }
            }
        }

        // 3. Perform verification
        const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
        const siteCoords = locationData.coordinates || locationData.coords;
        const radius = locationData.geofenceRadius || 100;

        const verification = await verifyLocation(
            coordinates,
            siteCoords,
            radius,
            ipAddress,
            locationData.allowedIpRanges
        );

        if (!verification.isWithinGeofence) {
            console.log(`[API/clock/in] Blocking: Geofence failed. Dist: ${verification.distance}m`);
            return NextResponse.json(
                {
                    error: 'Location verification failed',
                    details: `You are ${verification.distance}m from the workplace. Please move closer.`
                },
                { status: 403 }
            );
        }

        // 4. Check for existing active time entry in organization sub-collection
        const q = query(
            collection(db, "organizations", orgId, "time_entries"),
            where("employeeId", "==", userId),
            where("clockOutTime", "==", null),
            limit(1)
        );
        const existing = await getDocs(q);
        if (!existing.empty) {
            console.log(`[API/clock/in] Blocking: Already clocked in`);
            return NextResponse.json({ error: 'Already clocked in' }, { status: 400 });
        }

        // 5. Create time entry in organization sub-collection
        const timeEntry = {
            employeeId: userId,
            userName: userData?.name || "Unknown Staff",
            locationId,
            locationName: locationData.name,
            clockInTime: serverTimestamp(),
            clockOutTime: null,
            clockInLocation: coordinates,
            clockInIp: ipAddress,
            isApproved: true,
            createdAt: serverTimestamp(),
            organizationId: orgId
        };

        const docRef = await addDoc(collection(db, "organizations", orgId, "time_entries"), timeEntry);
        console.log(`[API/clock/in] Created entry ${docRef.id} in org ${orgId}`);

        // Read back the document
        const createdDoc = await getDoc(docRef);
        const createdData = createdDoc.data();

        return NextResponse.json({
            success: true,
            entry: { id: docRef.id, ...createdData },
            message: 'Clocked in successfully'
        });
    } catch (error: any) {
        console.error('Clock-in error:', error);

        // Return detailed error for debugging (since it's dev/MVP)
        return NextResponse.json({
            error: error.code || 'Internal server error',
            message: error.message || 'An unexpected error occurred',
            details: error.details || null,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
