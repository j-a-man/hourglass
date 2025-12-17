"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-context"
import { Clock, MapPin, AlertCircle, CheckCircle2, Loader2, History, Bell, Settings, LogOut, User } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore"
import { TechnicianStats } from "@/components/technician-stats"
import { UpcomingShifts } from "@/components/upcoming-shifts"
import { WeeklyCalendar } from "@/components/weekly-calendar"

// 📍 PHARMACY COORDINATES

const MAX_DISTANCE_METERS = 500

export default function TechnicianDashboard() {
    const { userData, user } = useAuth()
    const router = useRouter()

    const handleLogout = async () => {
        await signOut(auth)
        router.push("/login")
    }

    const [status, setStatus] = useState<"in" | "out" | "loading">("loading")
    const [lastLog, setLastLog] = useState<any>(null)
    const [loadingLocation, setLoadingLocation] = useState(false)
    const [error, setError] = useState("")
    const [recentLogs, setRecentLogs] = useState<any[]>([])
    const [locations, setLocations] = useState<Record<string, any>>({})

    // 1. FETCH STATUS & LOCATIONS
    useEffect(() => {
        const initData = async () => {
            if (!user) return

            // A. Fetch Locations
            try {
                const locQ = query(collection(db, "locations"))
                const locSnap = await getDocs(locQ)
                const locs = locSnap.docs.reduce((acc, doc) => {
                    const data = doc.data()
                    acc[doc.id] = { ...data, id: doc.id }
                    return acc
                }, {} as Record<string, any>)
                setLocations(locs)
            } catch (err) {
                console.error("Error fetching locations:", err)
            }

            // B. Fetch Logs
            try {
                const q = query(
                    collection(db, "time_logs"),
                    where("userId", "==", user.uid)
                )
                const snapshot = await getDocs(q)

                if (!snapshot.empty) {
                    const logs = snapshot.docs.map(d => d.data())
                    logs.sort((a, b) => {
                        const t1 = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0
                        const t2 = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0
                        return t2 - t1
                    })
                    setRecentLogs(logs.slice(0, 5))
                    setLastLog(logs[0])
                    setStatus(logs[0].type === "in" ? "in" : "out")
                } else {
                    setStatus("out")
                }
            } catch (err) {
                console.error("Error fetching status:", err)
            }
        }
        initData()
    }, [user])

    if (!userData || !user) return null

    // 2. GEOLOCATION MATH (Haversine Formula)
    const getDistanceFromLatLonInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3
        const dLat = (lat2 - lat1) * (Math.PI / 180)
        const dLon = (lon2 - lon1) * (Math.PI / 180)
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
    }

    // 3. HANDLE CLOCK IN/OUT
    const handlePunch = async () => {
        setError("")
        setLoadingLocation(true)

        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser.")
            setLoadingLocation(false)
            return
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const userLat = position.coords.latitude
                const userLng = position.coords.longitude
                console.log("User Coords:", userLat, userLng) // Debugging

                const assignedLoc = locations[userData.locationId]

                if (assignedLoc) {
                    // Firestore stores coords as a map { lat, lng } inside the doc
                    const targetLat = assignedLoc.coords?.lat || assignedLoc.lat
                    const targetLng = assignedLoc.coords?.lng || assignedLoc.lng

                    const distance = getDistanceFromLatLonInMeters(userLat, userLng, targetLat, targetLng)
                    console.log(`Distance to ${assignedLoc.name}: ${distance.toFixed(0)}m`)

                    const maxDist = assignedLoc.radius || MAX_DISTANCE_METERS

                    if (distance > maxDist) {
                        setError(`You are too far from ${assignedLoc.name} (${distance.toFixed(0)}m). You must be within ${maxDist}m.`)
                        setLoadingLocation(false)
                        return
                    }
                } else {
                    console.warn("Location not found in DB:", userData.locationId)
                }

                try {
                    const newType = status === "in" ? "out" : "in"
                    await addDoc(collection(db, "time_logs"), {
                        userId: user.uid,
                        userName: userData.name,
                        locationId: userData.locationId,
                        type: newType,
                        timestamp: serverTimestamp(),
                        coords: { lat: userLat, lng: userLng }
                    })

                    setStatus(newType)
                    setLastLog({ type: newType, timestamp: { toDate: () => new Date() } })
                } catch (err) {
                    console.error("Firebase Error:", err)
                    setError("Failed to save time log. Check your internet.")
                } finally {
                    setLoadingLocation(false)
                }
            },
            (err) => {
                console.error("Geo Error:", err)
                setError("Unable to retrieve location. Please allow GPS access.")
                setLoadingLocation(false)
            },
            { enableHighAccuracy: true }
        )
    }

    const formatTime = (date: any) => {
        if (!date) return "--:--"
        const d = date.toDate ? date.toDate() : date
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="min-h-screen p-6 font-sans relative z-0">
            {/* --- FLOATING STICKY HEADER --- */}
            <div className="sticky top-6 z-50 flex flex-col lg:flex-row items-center justify-between gap-4 mb-8 pointer-events-none">

                {/* BRAND */}
                <div className="flex items-center justify-center lg:justify-start gap-4 w-full lg:w-auto pointer-events-auto bg-white/40 backdrop-blur-md p-2 rounded-full border border-white/50 shadow-sm">
                    <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
                        P
                    </div>
                    <div className="pr-4 hidden sm:block">
                        <h1 className="text-sm font-bold text-slate-800 leading-tight">PharmaClock</h1>
                        <p className="text-[10px] text-slate-500 font-medium tracking-wide">TECHNICIAN</p>
                    </div>
                </div>

                {/* RIGHT CONTROLS */}
                <div className="flex items-center justify-center lg:justify-end gap-3 w-full lg:w-auto pointer-events-auto">
                    <div className="glass-nav px-4 py-2 flex items-center gap-2 bg-white/40">
                        <MapPin size={14} className="text-indigo-600" />
                        <span className="text-xs font-bold text-slate-700 capitalize">{userData.locationId} Store</span>
                    </div>

                    <button className="h-10 w-10 flex items-center justify-center glass-nav bg-white/40 hover:bg-white transition-colors">
                        <Bell size={18} className="text-slate-600" />
                    </button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Avatar className="h-10 w-10 border-2 border-white shadow-md cursor-pointer hover:scale-105 transition-transform">
                                <AvatarFallback className="bg-indigo-600 text-white font-bold">
                                    {userData?.name?.[0] || "T"}
                                </AvatarFallback>
                            </Avatar>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 glass-card border-white/50 bg-white/80 backdrop-blur-xl">
                            <DropdownMenuLabel>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800">{userData.name}</span>
                                    <span className="text-xs text-slate-500 font-normal">{userData.email || "Technician"}</span>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-200/50" />
                            <DropdownMenuItem className="cursor-pointer text-slate-600 focus:text-indigo-600 focus:bg-indigo-50">
                                <User className="mr-2 h-4 w-4" />
                                <span>My Account</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-slate-600 focus:text-indigo-600 focus:bg-indigo-50">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-200/50" />
                            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

                {/* WELCOME HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-2">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard</h2>
                        <p className="text-slate-500 font-medium">Overview for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>

                {/* ERROR MESSAGE */}
                {error && (
                    <div className="glass-card p-4 border-l-4 border-l-red-500 flex items-start gap-3 animate-in slide-in-from-top-2 bg-red-50/50 backdrop-blur-sm">
                        <AlertCircle className="text-red-500 shrink-0" size={20} />
                        <div>
                            <p className="font-bold text-red-700 text-sm">Location Error</p>
                            <p className="text-xs text-red-600/80 leading-relaxed">{error}</p>
                        </div>
                    </div>
                )}

                {/* TOP STATS ROW */}
                <TechnicianStats />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT COL: CLOCK IN & CALENDAR */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* MAIN CLOCK CARD */}
                        <div className="glass-card p-8 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[400px]">
                            {/* Background Glow */}
                            <div className={`absolute inset-0 opacity-20 blur-3xl transition-colors duration-700 ${status === 'in' ? 'bg-green-400' : 'bg-indigo-200'
                                }`} />

                            <h3 className="text-slate-500 font-semibold text-xs mb-8 uppercase tracking-widest relative z-10">
                                Time Clock
                            </h3>

                            {/* THE BIG BUTTON */}
                            <button
                                onClick={handlePunch}
                                disabled={loadingLocation}
                                className={`
                                    relative z-10 w-40 h-40 sm:w-48 sm:h-48 rounded-full flex flex-col items-center justify-center 
                                    transition-all duration-500 shadow-2xl
                                    ${status === 'in'
                                        ? 'bg-gradient-to-br from-white to-green-50 border-4 border-green-200 shadow-green-300/50 scale-105'
                                        : 'bg-gradient-to-br from-white to-indigo-50 border-4 border-white shadow-indigo-200/50 hover:scale-[1.02]'
                                    }
                                `}
                            >
                                {loadingLocation ? (
                                    <>
                                        <Loader2 className="h-10 w-10 animate-spin text-slate-400 mb-3" />
                                        <span className="text-xs font-bold text-slate-400">Locating...</span>
                                    </>
                                ) : (
                                    <>
                                        {status === 'in' ? (
                                            <CheckCircle2 className="h-12 w-12 text-green-500 mb-2 drop-shadow-md" />
                                        ) : (
                                            <MapPin className="h-12 w-12 text-indigo-500 mb-2 drop-shadow-md" />
                                        )}

                                        <span className={`text-xl font-black tracking-tight ${status === 'in' ? 'text-green-600' : 'text-indigo-700'
                                            }`}>
                                            {status === 'in' ? 'CLOCKED IN' : 'CLOCKED OUT'}
                                        </span>

                                        {status === 'in' && (
                                            <span className="text-[10px] font-medium text-green-600/70 mt-1">
                                                Since {formatTime(lastLog?.timestamp)}
                                            </span>
                                        )}
                                    </>
                                )}
                            </button>

                            <p className="relative z-10 text-[10px] text-slate-400 mt-8 font-medium">
                                {status === 'in' ? 'Tap to end shift' : 'Tap to start shift'} • GPS Verified
                            </p>
                        </div>

                        {/* WEEKLY ACTIVITY */}
                        <WeeklyCalendar />
                    </div>

                    {/* RIGHT COL: SHIFTS */}
                    <div className="space-y-6">
                        <UpcomingShifts limit={3} />

                        {/* HELPER CARD */}
                        <div className="glass-card p-6 bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-none">
                            <h4 className="font-bold text-lg mb-2">Need Help?</h4>
                            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                                If you have issues with your timesheet or location, please contact your store manager immediately.
                            </p>
                            <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors">
                                Contact Support
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
