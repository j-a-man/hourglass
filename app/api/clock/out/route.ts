import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { verifyLocation } from '@/lib/services/location-service';
import { db } from '@/lib/firebase';
import { updateDoc, collection, serverTimestamp, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
    try {
        const userId = await verifyAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { coordinates, reason } = body;

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

        // 2. Get active time entry from organization sub-collection
        const q = query(
            collection(db, "organizations", orgId, "time_entries"),
            where("employeeId", "==", userId),
            where("clockOutTime", "==", null),
            limit(1)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return NextResponse.json({ error: 'No active clock-in found' }, { status: 400 });
        }

        const timeEntryDoc = querySnapshot.docs[0];
        const timeEntry = timeEntryDoc.data();

        // 3. Optional verification for clock-out
        const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
        let verificationFlags = [];

        if (timeEntry.locationId && coordinates) {
            try {
                // Fetch location from organization sub-collection
                const locDoc = await getDoc(doc(db, "organizations", orgId, "locations", timeEntry.locationId));
                if (locDoc.exists()) {
                    const locationData = locDoc.data();
                    const siteCoords = locationData.coordinates || locationData.coords;

                    if (siteCoords) {
                        const verification = await verifyLocation(
                            coordinates,
                            siteCoords,
                            locationData.geofenceRadius || 100,
                            ipAddress,
                            locationData.allowedIpRanges
                        );

                        if (!verification.isWithinGeofence) {
                            verificationFlags.push({
                                type: 'out_of_range',
                                message: `Clocked out ${verification.distance}m from location`,
                                timestamp: new Date().toISOString()
                            });
                        }
                    } else {
                        console.warn(`[Clock-out] Location ${timeEntry.locationId} has no coordinates`);
                    }
                }
            } catch (e) {
                console.error("Clock-out verification error:", e);
                // Don't fail the clock-out if verification fails
            }
        }

        // 4. Update time entry
        const updateData: any = {
            clockOutTime: serverTimestamp(),
            clockOutLocation: coordinates,
            clockOutIp: ipAddress,
            clockOutReason: reason || "manual"
        };

        // Only add flags if there are any
        if (verificationFlags.length > 0) {
            updateData.flags = verificationFlags;
        }

        await updateDoc(timeEntryDoc.ref, updateData);

        return NextResponse.json({
            success: true,
            message: 'Clocked out successfully'
        });
    } catch (error: any) {
        console.error('Clock-out error:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            name: error.name
        });
        return NextResponse.json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}
