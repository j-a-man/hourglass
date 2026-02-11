"use client"

import { Clock, Menu, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MobileNav } from "./mobile-nav"
import { useAuth } from "@/components/auth-context"


export function AppHeader() {
    const { user, userData } = useAuth()
    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white px-4 md:px-6">
            <div className="flex items-center gap-4 md:hidden">
                <MobileNav />
            </div>

            <div className="hidden md:flex md:flex-1">
                {/* Placeholder for Breadcrumbs or Page Title if needed */}
            </div>

            <div className="flex items-center gap-4">
                {/* Notification Area Removed */}
            </div>
        </header>
    )
}
