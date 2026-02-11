"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { Sidebar } from "@/components/layout/sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, userData, loading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (!loading) {
            // 1. If not logged in, redirect to login
            if (!user) {
                router.push("/login")
                return
            }

            // 2. Access Protection for Deactivated Users
            const role = userData?.role
            const status = userData?.status
            const isDeactivatedPage = pathname === "/deactivated"

            if (status === "inactive" && !isDeactivatedPage) {
                router.push("/deactivated")
                return
            }

            if (status !== "inactive" && isDeactivatedPage) {
                // If user is active but on deactivated page, send to appropriate dashboard
                router.push(role === "owner" || role === "admin" || role === "manager" ? "/dashboard/admin" : "/dashboard/employee")
                return
            }

            // 3. Simple role-based protection
            const isAdminRoute = pathname.startsWith("/dashboard/admin")
            const isEmployeeRoute = pathname.startsWith("/dashboard/employee")
        }
    }, [user, userData, loading, pathname, router])

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Securing Hourglass...</p>
                </div>
            </div>
        )
    }

    if (!user) return null

    const isDeactivatedPage = pathname === "/deactivated"

    return (
        <div className="flex min-h-screen bg-neutral-50/50">
            {!isDeactivatedPage && <Sidebar />}
            <div className="flex flex-1 flex-col overflow-hidden">
                {!isDeactivatedPage && <AppHeader />}
                <main className={cn(
                    "flex-1 overflow-y-auto px-4 py-8 md:p-8 lg:p-12",
                    isDeactivatedPage && "flex items-center justify-center p-0"
                )}>
                    {children}
                </main>
            </div>
        </div>
    )
}
