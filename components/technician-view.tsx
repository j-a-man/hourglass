"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import ClockButton from "@/components/clock-button"
import PunchHistory from "@/components/punch-history"
import LocationSelector from "@/components/location-selector"

interface TimeEntry {
  id: string
  timestamp: Date
  type: "clock-in" | "clock-out"
  location: string
}

interface TechnicianViewProps {
  user?: any
  userData?: any
}

export default function TechnicianView({ user, userData }: TechnicianViewProps) {
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [punches, setPunches] = useState<TimeEntry[]>([])
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const [location, setLocation] = useState<string>("Downtown")
  const [technicianName, setTechnicianName] = useState<string>("")
  const [userId, setUserId] = useState<string>("") // added userId state for Firebase
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedPunches = localStorage.getItem("punches")
    const savedLocation = localStorage.getItem("selectedLocation")
    const savedName = localStorage.getItem("technicianName")
    const savedUserId = localStorage.getItem("userId")

    if (savedPunches) {
      setPunches(JSON.parse(savedPunches))
      const lastPunch = JSON.parse(savedPunches)[0]
      setIsClockedIn(lastPunch?.type === "clock-in")
    }
    if (savedLocation) setLocation(savedLocation)

    if (userData?.name) {
      setTechnicianName(userData.name)
    } else if (savedName) {
      setTechnicianName(savedName)
    } else {
      setTechnicianName("Alex Rodriguez")
      localStorage.setItem("technicianName", "Alex Rodriguez")
    }

    if (user?.uid) {
      setUserId(user.uid)
    } else if (savedUserId) {
      setUserId(savedUserId)
    } else {
      const newUserId = `tech-${Math.random().toString(36).substr(2, 9)}`
      setUserId(newUserId)
      localStorage.setItem("userId", newUserId)
    }
  }, [user, userData])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleClockToggle = () => {
    const newEntry: TimeEntry = {
      id: Math.random().toString(),
      timestamp: new Date(),
      type: isClockedIn ? "clock-out" : "clock-in",
      location,
    }

    const updated = [newEntry, ...punches]
    setPunches(updated)
    localStorage.setItem("punches", JSON.stringify(updated))
    setIsClockedIn(!isClockedIn)
  }

  const handleLocationChange = (newLocation: string) => {
    setLocation(newLocation)
    localStorage.setItem("selectedLocation", newLocation)
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-border z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Welcome</h1>
              <p className="text-sm text-muted-foreground">{technicianName}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-primary">
                {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="text-xs text-muted-foreground">
                {currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 mt-8">
        {/* Status Card */}
        <Card className="mb-8 border-2 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 mb-4">
                <div className={`w-3 h-3 rounded-full animate-pulse ${isClockedIn ? "bg-accent" : "bg-muted"}`} />
                <span className="text-sm font-medium text-muted-foreground">
                  Status:{" "}
                  <span className={isClockedIn ? "text-accent" : "text-muted-foreground"}>
                    {isClockedIn ? "Clocked In" : "Clocked Out"}
                  </span>
                </span>
              </div>
            </div>

            <LocationSelector value={location} onChange={handleLocationChange} />

            <ClockButton isClockedIn={isClockedIn} onToggle={handleClockToggle} location={location} userId={userId} />
          </CardContent>
        </Card>

        {/* Today's Punches */}
        <PunchHistory punches={punches} />
      </div>
    </div>
  )
}
