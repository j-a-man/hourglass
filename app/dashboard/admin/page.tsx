"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-context"
import { Users, Clock, Activity, CreditCard, Bell, MapPin } from "lucide-react"
import { InviteUserDialog } from "@/components/invite-user-dialog"
import { EmployeeList } from "@/components/employee-list"
import { RecentActivity } from "@/components/recent-activity"
import { SeedDataButton } from "@/components/seed-data-button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings, LogOut, User as UserIcon } from "lucide-react"
import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"

const LOCATIONS = [
    { id: "north", label: "Roslyn Pharmacy" },
    { id: "south", label: "South Store" }
]

interface ClockedInUser {
    userId: string
    userName: string
    role?: string
    clockInTime: Date
    timeElapsed: string
}

export default function AdminDashboard() {
    const { userData } = useAuth()
    const [selectedLocation, setSelectedLocation] = useState<string>(userData?.locationId || "north")
    const [activeTab, setActiveTab] = useState("dashboard")
    const [totalEmployees, setTotalEmployees] = useState(0)
    const [activeStaff, setActiveStaff] = useState(0)
    const [clockedInUsers, setClockedInUsers] = useState<ClockedInUser[]>([])
    const [loading, setLoading] = useState(true)

    // Fetch real-time data
    useEffect(() => {
        fetchDashboardData()
    }, [selectedLocation])

    const fetchDashboardData = async () => {
        setLoading(true)
        try {
            // 1. Fetch total employees at selected location
            const usersQuery = query(
                collection(db, "users"),
                where("locationId", "==", selectedLocation)
            )
            const usersSnapshot = await getDocs(usersQuery)
            setTotalEmployees(usersSnapshot.size)

            // 2. Fetch all time logs to find currently clocked-in staff
            // 2. Fetch all time logs to find currently clocked-in staff request
            const logsQuery = query(
                collection(db, "time_logs"),
                where("locationId", "==", selectedLocation)
                // orderBy("timestamp", "desc") // Removed to avoid composite index requirement
            )
            const logsSnapshot = await getDocs(logsQuery)

            const allLogs = logsSnapshot.docs.map(doc => doc.data())

            // Sort client-side
            allLogs.sort((a, b) => {
                const t1 = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0
                const t2 = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0
                return t2 - t1
            })

            // Build map of latest log per user
            const latestLogPerUser = new Map()
            allLogs.forEach(log => {
                if (!latestLogPerUser.has(log.userId)) {
                    latestLogPerUser.set(log.userId, log)
                }
            })

            // Filter for currently clocked-in users
            const clockedIn: ClockedInUser[] = []
            latestLogPerUser.forEach((log) => {
                if (log.type === "in") {
                    const clockInTime = log.timestamp?.toDate() || new Date()
                    clockedIn.push({
                        userId: log.userId,
                        userName: log.userName || "Unknown",
                        role: "Technician",
                        clockInTime,
                        timeElapsed: calculateTimeElapsed(clockInTime)
                    })
                }
            })

            setClockedInUsers(clockedIn)
            setActiveStaff(clockedIn.length)

        } catch (error) {
            console.error("Error fetching dashboard data:", error)
        } finally {
            setLoading(false)
        }
    }

    const calculateTimeElapsed = (clockInTime: Date): string => {
        const now = new Date()
        const diffMs = now.getTime() - clockInTime.getTime()
        const hours = Math.floor(diffMs / (1000 * 60 * 60))
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

        if (hours > 0) {
            return `${hours}h ${minutes}m`
        }
        return `${minutes}m`
    }

    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const router = useRouter()

    const handleLogout = async () => {
        await signOut(auth)
        router.push("/login")
    }

    return (
        <div className="min-h-screen p-6 font-sans relative z-0">
            {/* --- FLOATING STICKY NAVIGATION --- */}
            <div className="sticky top-6 z-50 flex flex-col lg:flex-row items-center justify-between gap-4 mb-8 pointer-events-none">

                {/* BRAND */}
                <div className="flex items-center justify-center lg:justify-start gap-4 w-full lg:w-auto pointer-events-auto bg-white/40 backdrop-blur-md p-2 rounded-full border border-white/50 shadow-sm">
                    <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
                        P
                    </div>
                    <div className="pr-4 hidden sm:block">
                        <h1 className="text-sm font-bold text-slate-800 leading-tight">PharmaClock</h1>
                        <p className="text-[10px] text-slate-500 font-medium tracking-wide">ADMIN</p>
                    </div>
                </div>

                {/* NAV PILLS - Scrollable on mobile */}
                <div className="glass-nav flex items-center gap-1 p-1 pointer-events-auto shadow-xl shadow-indigo-100/20 bg-white/30 overflow-x-auto max-w-full no-scrollbar">
                    <NavButton label="Dashboard" isActive={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
                    <NavButton label="Employees" isActive={activeTab === "employees"} onClick={() => setActiveTab("employees")} />
                    <NavButton label="Time Logs" isActive={activeTab === "logs"} onClick={() => setActiveTab("logs")} />
                    <NavButton label="Finance" isActive={activeTab === "finance"} onClick={() => setActiveTab("finance")} />
                </div>

                {/* RIGHT CONTROLS - Stacked/Scrollable on mobile */}
                <div className="flex items-center justify-center lg:justify-end gap-3 w-full lg:w-auto pointer-events-auto">
                    <div className="glass-nav px-1 py-1 flex items-center bg-white/40 overflow-x-auto max-w-[200px] lg:max-w-none no-scrollbar">
                        {LOCATIONS.map(loc => (
                            <button
                                key={loc.id}
                                onClick={() => setSelectedLocation(loc.id)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${selectedLocation === loc.id
                                    ? "bg-white shadow-sm text-indigo-700"
                                    : "text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                {loc.label}
                            </button>
                        ))}
                    </div>

                    <button className="h-10 w-10 flex items-center justify-center glass-nav bg-white/40 hover:bg-white transition-colors">
                        <Bell size={18} className="text-slate-600" />
                    </button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Avatar className="h-10 w-10 border-2 border-white shadow-md cursor-pointer hover:scale-105 transition-transform">
                                <AvatarFallback className="bg-indigo-600 text-white font-bold">
                                    {userData?.name?.[0] || "A"}
                                </AvatarFallback>
                            </Avatar>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 glass-card border-white/50 bg-white/80 backdrop-blur-xl">
                            <DropdownMenuLabel>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800">{userData?.name || "Admin"}</span>
                                    <span className="text-xs text-slate-500 font-normal">{userData?.email || "Administrator"}</span>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-200/50" />
                            <DropdownMenuItem className="cursor-pointer text-slate-600 focus:text-indigo-600 focus:bg-indigo-50">
                                <UserIcon className="mr-2 h-4 w-4" />
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

            {/* --- DASHBOARD CONTENT --- */}
            {activeTab === "dashboard" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        <GlassStatCard
                            label="Total Balance"
                            value="$143,624"
                            icon={<CreditCard size={24} className="text-slate-700" />}
                        />
                        <GlassStatCard
                            label="Active Staff"
                            value={loading ? "..." : activeStaff.toString()}
                            icon={<Clock size={24} className="text-slate-700" />}
                            subtext="Clocked In"
                        />
                        <GlassStatCard
                            label="Total Employees"
                            value={loading ? "..." : totalEmployees.toString()}
                            icon={<Users size={24} className="text-slate-700" />}
                            subtext="Registered"
                        />
                        <GlassStatCard
                            label="Payroll Est."
                            value="$3,287"
                            icon={<Activity size={24} className="text-slate-700" />}
                            subtext="This Week"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="glass-card p-8 min-h-[400px] flex flex-col relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                                <div className="flex justify-between items-start mb-8 relative z-10">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800">Live Floor Status</h2>
                                        <p className="text-slate-500">Real-time attendance for {selectedLocation} store</p>
                                    </div>
                                    <button className="glass-nav px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white bg-white/50">
                                        Export Report
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                                    {loading ? (
                                        <div className="col-span-2 text-center text-slate-400 py-8">
                                            Loading...
                                        </div>
                                    ) : clockedInUsers.length === 0 ? (
                                        <div className="col-span-2 text-center text-slate-400 py-8">
                                            No one is currently clocked in
                                        </div>
                                    ) : (
                                        clockedInUsers.map(user => (
                                            <ActiveUserTile
                                                key={user.userId}
                                                name={user.userName}
                                                role={user.role || "Technician"}
                                                time={formatTime(user.clockInTime)}
                                                elapsed={user.timeElapsed}
                                            />
                                        ))
                                    )}

                                    <div className="border-2 border-dashed border-slate-300/50 rounded-[2rem] flex flex-col items-center justify-center p-6 text-slate-400 hover:bg-white/20 hover:border-indigo-300 transition-all cursor-pointer group">
                                        <div className="h-10 w-10 bg-white/50 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                            <InviteUserDialog />
                                        </div>
                                        <span className="text-xs font-bold">Add Shift</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="glass-card p-8 relative overflow-hidden">
                                <h3 className="font-bold text-slate-800 mb-2">Efficiency Rate</h3>
                                <p className="text-xs text-slate-500 mb-6">Based on shift coverage</p>
                                <div className="flex justify-center mb-4">
                                    <div className="relative h-40 w-40">
                                        <svg className="h-full w-full transform -rotate-90">
                                            <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.5)" strokeWidth="12" fill="transparent" />
                                            <circle cx="80" cy="80" r="70" stroke="#6366f1" strokeWidth="12" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (440 * 51) / 100} strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-4xl font-bold text-slate-800">51%</span>
                                        </div>
                                    </div>
                                </div>
                                <button className="w-full py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
                                    View Analytics
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "employees" && (
                <div className="glass-card p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Employee Directory</h2>
                            <p className="text-slate-500">Manage staff at {selectedLocation}</p>
                        </div>
                        <SeedDataButton />
                        <InviteUserDialog />
                    </div>
                    <EmployeeList locationId={selectedLocation} />
                </div>
            )}

            {activeTab === "logs" && (
                <div className="glass-card p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Time Logs</h2>
                            <p className="text-slate-500">Recent activity at {selectedLocation}</p>
                        </div>
                        <button className="glass-nav px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white bg-white/50">
                            Download CSV
                        </button>
                    </div>
                    <RecentActivity locationId={selectedLocation} />
                </div>
            )}
        </div>
    )
}

// --- SUB-COMPONENTS ---

function NavButton({ label, isActive, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`px-6 py-2.5 rounded-full text-sm transition-all whitespace-nowrap ${isActive
                ? "bg-white shadow-sm text-slate-800 font-bold"
                : "text-slate-500 hover:bg-white/40 hover:text-slate-700 font-medium"
                }`}
        >
            {label}
        </button>
    )
}

function GlassStatCard({ label, value, icon, subtext }: any) {
    return (
        <div className="glass-card p-6 flex flex-col justify-between h-[180px] hover:bg-white/60 transition-colors group cursor-default">
            <div className="flex justify-between items-start">
                <div className="p-3 rounded-2xl bg-white/50 group-hover:bg-white group-hover:scale-110 transition-all shadow-sm">
                    {icon}
                </div>
                <button className="text-slate-400 hover:text-slate-600">•••</button>
            </div>
            <div>
                <div className="text-3xl font-bold text-slate-800 mb-1">{value}</div>
                <div className="text-sm font-medium text-slate-500">{label}</div>
                {subtext && <div className="text-xs text-slate-400 mt-2 bg-white/30 inline-block px-2 py-1 rounded-lg">{subtext}</div>}
            </div>
        </div>
    )
}

function ActiveUserTile({ name, role, time, elapsed }: any) {
    return (
        <div className="bg-white/40 border border-white/50 p-4 rounded-[2rem] flex items-center gap-4 hover:bg-white/60 transition-all shadow-sm group">
            <Avatar className="h-14 w-14 border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-lg">
                    {name[0]}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <h4 className="font-bold text-slate-800 text-base">{name}</h4>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{role}</p>
            </div>
            <div className="text-right">
                <div className="bg-green-100/80 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm mb-1">
                    {time}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">{elapsed}</div>
            </div>
        </div>
    )
}