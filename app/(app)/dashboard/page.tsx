"use client"

import { useEffect } from "react"
import { useAuth } from "@/components/auth-context"
import { useRouter } from "next/navigation"
import { Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardRedirect() {
    const { userData, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading && userData) {
            if ((userData.role as string) === 'admin' || userData.role === 'owner' || userData.role === 'manager') {
                router.replace("/dashboard/admin")
            } else {
                router.replace("/dashboard/employee")
            }
        }
    }, [userData, loading, router])

    if (!loading && !userData) {
        return (
            <div className="h-[80vh] w-full flex flex-col items-center justify-center p-6 text-center">
                <div className="h-20 w-20 rounded-[32px] bg-red-50 flex items-center justify-center text-red-600 mb-6">
                    <AlertTriangle className="h-10 w-10" />
                </div>
                <h1 className="text-2xl font-black text-neutral-900 tracking-tight mb-2">Profile Not Found</h1>
                <p className="text-neutral-500 font-medium max-w-sm mb-8 leading-relaxed">
                    We've authenticated your email, but we couldn't find your workplace profile.
                    This usually happens if a registration was interrupted.
                </p>
                <div className="flex flex-col w-full max-w-xs gap-3">
                    <Button
                        onClick={() => router.push("/get-started")}
                        className="h-12 rounded-xl font-bold bg-primary shadow-lg shadow-primary/20 hover:bg-primary-600 text-white"
                    >
                        Try Registering Again
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={async () => {
                            await import("@/lib/firebase").then(f => import("firebase/auth").then(a => a.signOut(f.auth)))
                            router.push("/login")
                        }}
                        className="h-12 rounded-xl font-bold text-neutral-500"
                    >
                        Sign Out & Reset
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-[80vh] w-full flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-neutral-400 font-bold text-xs uppercase tracking-[0.2em] animate-pulse">Syncing Session...</p>
        </div>
    )
}