"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import {
    LayoutDashboard,
    Users,
    Clock,
    LogOut,
    Menu,
    X,
    MapPin
} from "lucide-react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { motion, AnimatePresence } from "framer-motion"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { userData, loading } = useAuth()
    const router = useRouter()

    const handleLogout = async () => {
        await signOut(auth)
        router.push("/login")
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (!userData) {
        // Ideally this should be handled by middleware or the page itself
        return null
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Main Content - Full Width */}
            <main className="flex-1 w-full min-h-screen">
                {children}
            </main>
        </div>
    )
}
