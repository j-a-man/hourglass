import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { verifyLocation } from '@/lib/services/location-service';
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
