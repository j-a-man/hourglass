"use client"

import { useEffect } from "react"
import { useAuth } from "@/components/auth-context"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function DashboardRedirect() {
    const { userData, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading && userData) {
            if (userData.role === 'admin') {
                router.replace("/dashboard/admin")
            } else {
                router.replace("/dashboard/technician")
            }
        }
    }, [userData, loading, router])

    return (
        <div className="h-[80vh] w-full flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
            <p className="text-slate-500 font-medium animate-pulse">Redirecting...</p>
        </div>
    )
}