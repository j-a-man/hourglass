"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, MapPin, AlertCircle, Navigation, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { calculateDistance } from "@/lib/services/location-service"

interface ClockButtonProps {
    status: "clocked-in" | "clocked-out"
    loading?: boolean
    pharmacyLocation?: { latitude: number; longitude: number }
    geofenceRadius?: number
    onClockIn: (coords: GeolocationCoordinates) => Promise<void>
    onClockOut: (coords: GeolocationCoordinates) => Promise<void>
}

export function ClockButton({
    status,
    loading: parentLoading,
    pharmacyLocation,
    geofenceRadius = 100,
    onClockIn,
    onClockOut
}: ClockButtonProps) {
    const [loading, setLoading] = useState(false)
    const [locationError, setLocationError] = useState<string | null>(null)
    const [currentCoords, setCurrentCoords] = useState<GeolocationCoordinates | null>(null)
    const [distance, setDistance] = useState<number | null>(null)

    // Track user location in real-time using network-based positioning
    useEffect(() => {
        if (!navigator.geolocation || !pharmacyLocation) return

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                setCurrentCoords(position.coords)
                setLocationError(null)

                const d = calculateDistance(
                    { latitude: position.coords.latitude, longitude: position.coords.longitude },
                    pharmacyLocation
                )
                setDistance(Math.round(d))
            },
            (error) => {
                console.error(`[ClockButton] Location tracking error:`, {
                    code: error.code,
                    message: error.message
                });

                if (error.code === 1) {
                    setLocationError("Location access blocked. Click the 'Lock' icon in your browser address bar to allow location access.")
                } else if (error.code === 3) {
                    setLocationError("Location unavailable. Please check your device settings.")
                } else {
                    setLocationError(`Location error: ${error.message}`)
                }
            },
            {
                enableHighAccuracy: false, // Network location for speed
                timeout: 20000,
                maximumAge: 30000
            }
        )

        return () => navigator.geolocation.clearWatch(watchId)
    }, [pharmacyLocation])

    const handleClick = async () => {
        setLoading(true)
        setLocationError(null)

        if (!navigator.geolocation) {
            setLocationError("Geolocation not supported")
            setLoading(false)
            return
        }

        // Use the location we're already tracking from watchPosition
        if (!currentCoords) {
            setLocationError("Waiting for location... Please allow a moment for your location to be detected.")
            setLoading(false)
            return
        }

        try {
            if (status === "clocked-out") {
                await onClockIn(currentCoords)
            } else {
                await onClockOut(currentCoords)
            }
        } catch (error: any) {
            console.error("Clock action error detail:", error)
            let msg = error.message || "Action failed"

            // 1 = PERMISSION_DENIED, 3 = TIMEOUT (Geolocation specific codes)
            if (error.code === 1) {
                msg = "Please allow location access in your browser to clock in."
            } else if (error.code === 3) {
                msg = "Location request timed out. Please check if your GPS has a clear signal."
            }

            setLocationError(msg)
        } finally {
            setLoading(false)
        }
    }

    const isClockedIn = status === "clocked-in"
    const isWithinRange = distance !== null && distance <= geofenceRadius

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
            {/* Precision Indicator Card */}
            <div className="w-full bg-white border border-neutral-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                        isWithinRange ? "bg-emerald-50 text-emerald-600" : "bg-neutral-50 text-neutral-400"
                    )}>
                        <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-neutral-900">
                            {pharmacyLocation ? "Workplace Location" : "Locating Site..."}
                        </p>
                        <p className="text-xs text-neutral-500 font-medium">
                            {distance !== null ? `${distance} meters away` : "Wait for GPS..."}
                        </p>
                    </div>
                </div>
                <div className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider transition-colors",
                    isWithinRange ? "bg-emerald-500 text-white" : "bg-neutral-200 text-neutral-500"
                )}>
                    {isWithinRange ? "IN RANGE" : "OUT OF RANGE"}
                </div>
            </div>

            {/* Main Clock Button */}
            <button
                onClick={handleClick}
                disabled={loading || parentLoading}
                className={cn(
                    "group relative h-72 w-72 rounded-full flex flex-col items-center justify-center gap-3 border-[12px] transition-all duration-300 active:scale-95 disabled:grayscale disabled:opacity-50",
                    isClockedIn
                        ? "bg-white border-primary border-opacity-10 text-primary shadow-2xl hover:bg-neutral-50"
                        : isWithinRange
                            ? "bg-primary border-primary border-opacity-10 text-white shadow-2xl shadow-primary/20 hover:bg-primary-600"
                            : "bg-neutral-100 border-neutral-200 text-neutral-400 cursor-not-allowed"
                )}
            >
                {loading || parentLoading ? (
                    <div className="flex flex-col items-center gap-3 animate-pulse">
                        <Loader2 className="h-10 w-10 animate-spin" />
                        <span className="text-sm font-bold">VERIFYING...</span>
                    </div>
                ) : (
                    <>
                        <div className={cn(
                            "p-4 rounded-3xl transition-colors",
                            isClockedIn ? "bg-primary/5" : "bg-white/10"
                        )}>
                            {isClockedIn ? <Navigation className="h-10 w-10 rotate-180" /> : <Clock className="h-10 w-10" />}
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-3xl font-black tracking-tighter">
                                {isClockedIn ? "CLOCK OUT" : "CLOCK IN"}
                            </span>
                            <span className="text-xs font-bold opacity-60 tracking-widest mt-1">
                                {isClockedIn ? "END SHIFT" : "START SHIFT"}
                            </span>
                        </div>
                    </>
                )}
            </button>

            {locationError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm font-bold border border-red-100 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="h-4 w-4" />
                    {locationError}
                </div>
            )}

            {!isWithinRange && !isClockedIn && (
                <p className="text-xs text-neutral-400 font-medium text-center px-4">
                    You must be within {geofenceRadius}m of the workplace to clock in. Currently: {distance !== null ? `${distance}m` : "unknown distance"}.
                </p>
            )}
        </div>
    )
}
