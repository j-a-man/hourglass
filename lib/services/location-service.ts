/**
 * Location Service
 * Handles geofencing calculations and IP verification for clock-ins
 */

interface Coordinates {
    latitude: number;
    longitude: number;
}

interface VerificationResult {
    isWithinGeofence: boolean;
    distance: number; // in meters
    isIpVerified: boolean;
}

/**
 * Normalizes coordinate objects to use latitude/longitude
 */
function normalizeCoords(coords: any): Coordinates | null {
    if (!coords) return null;
    const lat = typeof coords.latitude === 'number' ? coords.latitude : coords.lat;
    const lng = typeof coords.longitude === 'number' ? coords.longitude : coords.lng;

    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    return { latitude: lat, longitude: lng };
}

/**
 * Calculates the distance between two points on Earth using the Haversine formula
 */
export function calculateDistance(p1: any, p2: any): number {
    const point1 = normalizeCoords(p1);
    const point2 = normalizeCoords(p2);

    if (!point1 || !point2) return 0;

    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

/**
 * Verifies if the user's current location and IP are valid for the given pharmacy location
 */
export async function verifyLocation(
    userCoordsRaw: any,
    siteCoordsRaw: any,
    geofenceRadius: number = 100, // default 100 meters
    userIp?: string,
    allowedIpRanges?: string[]
): Promise<VerificationResult> {
    const userCoords = normalizeCoords(userCoordsRaw);
    const siteCoords = normalizeCoords(siteCoordsRaw);

    if (!siteCoords) {
        throw new Error("Invalid workplace coordinates. Please contact your administrator.");
    }

    if (!userCoords) {
        throw new Error("Your device provided invalid coordinates. Please check your GPS settings.");
    }

    const distance = calculateDistance(userCoords, siteCoords);
    const isWithinGeofence = distance <= geofenceRadius;

    // Basic IP verification if ranges are provided
    let isIpVerified = true;
    if (allowedIpRanges && allowedIpRanges.length > 0 && userIp) {
        isIpVerified = allowedIpRanges.some(range => {
            // Very basic check, in production use CIDR matching
            return userIp === range || userIp.startsWith(range);
        });
    }

    return {
        isWithinGeofence,
        distance: Math.round(distance),
        isIpVerified
    };
}
