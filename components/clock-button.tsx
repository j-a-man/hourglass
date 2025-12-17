"use client"

import { useState } from "react"
import { AlertCircle } from "lucide-react"
import { logTime } from "@/lib/firebase-service"

interface ClockButtonProps {
  isClockedIn: boolean
  onToggle: () => void
  location: string
  userId: string // added userId prop for Firebase logging
}

// Hardcoded pharmacy locations (Lat/Lng)
const PHARMACY_LOCATIONS: Record<string, { lat: number; lng: number; name: string }> = {
  Downtown: { lat: 42.087730, lng: -75.969754, name: "Downtown Pharmacy" },
  Uptown: { lat: 42.087730, lng: -75.969754, name: "Uptown Pharmacy" },
}

// Calculate distance between two points in meters using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export default function ClockButton({ isClockedIn, onToggle, location, userId }: ClockButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setError(null)
    setLoading(true)

    try {
      const position = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          (err) => reject(err),
        )
      })

      const pharmacyLocation = PHARMACY_LOCATIONS[location]
      if (!pharmacyLocation) {
        setError("Location not configured")
        setLoading(false)
        return
      }

      const distance = calculateDistance(
        position.latitude,
        position.longitude,
        pharmacyLocation.lat,
        pharmacyLocation.lng,
      )

      console.log(`[v0] Distance to ${location}: ${distance.toFixed(1)}m, threshold: 100m`)

      if (distance > 100) {
        setError(`You are ${Math.round(distance)}m away. Please get within 100m of the store.`)
        setLoading(false)
        return
      }

      const logType = isClockedIn ? "clock-out" : "clock-in"
      await logTime(userId, logType, location)

      onToggle()
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        setError("Location access denied. Please enable geolocation.")
      } else {
        setError("Failed to get location. Try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`w-full py-20 px-6 rounded-2xl font-bold text-2xl transition-all duration-200 active:scale-95 shadow-lg disabled:opacity-75 disabled:cursor-not-allowed ${isClockedIn
          ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          : "bg-accent hover:bg-accent/90 text-accent-foreground"
          }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="text-4xl">{loading ? "📍" : isClockedIn ? "⏹" : "▶"}</div>
          <div>{loading ? "Checking location..." : isClockedIn ? "Clock Out" : "Clock In"}</div>
        </div>
      </button>

      {error && (
        <div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="text-sm text-destructive">{error}</div>
        </div>
      )}
    </div>
  )
}
