"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    Users,
    MapPin,
    Calendar,
    Settings,
    FileText,
    LogOut,
    Clock,
    DollarSign,
    Plane
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-context"
import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"

const adminLinks = [
    { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/admin/employees", label: "Employees", icon: Users },
    { href: "/dashboard/admin/schedule", label: "Schedule", icon: Calendar },
    { href: "/dashboard/admin/locations", label: "Locations", icon: MapPin },
    { href: "/dashboard/admin/payroll", label: "Payroll", icon: DollarSign },
    { href: "/dashboard/admin/time-off", label: "Time Off", icon: Plane },
    { href: "/dashboard/admin/reports", label: "Reports", icon: FileText },
    { href: "/dashboard/admin/settings", label: "Settings", icon: Settings },
]

const employeeLinks = [
    { href: "/dashboard/employee", label: "Clock In/Out", icon: Clock },
    { href: "/dashboard/employee/schedule", label: "My Schedule", icon: Calendar },
    { href: "/dashboard/employee/hours", label: "My Hours", icon: FileText },
    { href: "/dashboard/employee/time-off", label: "Time Off", icon: Plane },
    { href: "/dashboard/employee/profile", label: "Profile", icon: Users },
]

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { userData, user } = useAuth() // Assuming auth context exists, even if basic for now

    const isAdvancedUser = userData?.role === "owner" || userData?.role === "admin" || userData?.role === "manager"
    const navLinks = isAdvancedUser ? adminLinks : employeeLinks

    const handleLogout = async () => {
        await signOut(auth)
        router.push("/login")
    }

    return (
        <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r bg-white md:flex shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
            <div className="flex h-16 items-center px-6 mb-4">
                <Link href="/" className="flex items-center gap-2 font-bold text-neutral-900 transition-opacity hover:opacity-80">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
                        <Clock className="h-5 w-5" />
                    </div>
                    <span className="text-xl tracking-tight">Hourglass</span>
                </Link>
            </div>

            <div className="flex-1 overflow-auto py-6">
                <nav className="grid items-start px-4 text-sm font-medium">
                    {navLinks.map((link) => {
                        const Icon = link.icon
                        const isActive = link.href === "/dashboard/admin" || link.href === "/dashboard/employee"
                            ? pathname === link.href
                            : pathname.startsWith(link.href)
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200",
                                    isActive
                                        ? "bg-primary text-white shadow-md shadow-primary/20"
                                        : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                                )}
                            >
                                <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-neutral-400 group-hover:text-neutral-900")} />
                                <span className="font-semibold">{link.label}</span>
                            </Link>
                        )
                    })}
                </nav>
            </div>

            <div className="border-t border-neutral-100 p-4 space-y-4">
                <div className="flex items-center gap-3 rounded-2xl bg-neutral-50 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary font-bold shadow-inner">
                        {userData?.name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-bold text-neutral-900">
                            {userData?.name || "User"}
                        </p>
                        <p className="truncate text-xs text-neutral-500 font-medium">
                            {user?.email}
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4" />
                    Log Out
                </Button>
            </div>
        </aside>
    )
}
