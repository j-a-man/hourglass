"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
    Menu,
    LogOut,
    LayoutDashboard,
    Users,
    MapPin,
    Calendar,
    Settings,
    FileText,
    Clock,
    DollarSign,
    Plane
} from "lucide-react"
import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

import { useAuth } from "@/components/auth-context"

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

export function MobileNav() {
    const pathname = usePathname()
    const router = useRouter()
    const { userData, user } = useAuth()
    const navLinks = (userData?.role === "owner" || userData?.role === "manager" || (userData?.role as string) === "admin") ? adminLinks : employeeLinks

    const handleLogout = async () => {
        await signOut(auth)
        router.push("/login")
    }

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0 w-72">
                <div className="flex h-16 items-center border-b px-6">
                    <Link href="/" className="flex items-center gap-2 font-semibold">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <Clock className="h-5 w-5" />
                        </div>
                        <span className="text-lg tracking-tight">Hourglass</span>
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
                                        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {link.label}
                                </Link>
                            )
                        })}
                    </nav>
                </div>
                <div className="border-t border-neutral-100 p-4 mt-auto space-y-4">
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
            </SheetContent>
        </Sheet>
    )
}
