"use client"

import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { ShieldAlert, LogOut, Mail } from "lucide-react"
import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"

export default function DeactivatedPage() {
    const { userData, user } = useAuth()
    const router = useRouter()

    const handleLogout = async () => {
        await signOut(auth)
        router.push("/login")
    }

    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center text-center px-4">
            <div className="mb-8 p-6 rounded-[2.5rem] bg-red-50 text-red-600 shadow-inner">
                <ShieldAlert className="h-20 w-20" />
            </div>

            <h1 className="text-4xl font-black text-neutral-900 tracking-tighter mb-4">
                Service Suspended
            </h1>

            <p className="text-xl text-neutral-500 font-medium max-w-lg leading-relaxed mb-10">
                Your account for <span className="text-neutral-900 font-bold">Hourglass</span> has been deactivated.
                Please contact your workplace administrator to regain access.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 w-full max-w-md">
                <Button
                    variant="outline"
                    className="h-14 rounded-2xl border-neutral-200 font-bold text-neutral-600 hover:bg-neutral-50 flex gap-3"
                    onClick={handleLogout}
                >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                </Button>
                <Button
                    className="h-14 rounded-2xl font-bold flex gap-3 shadow-lg shadow-primary/20"
                    onClick={() => window.location.href = "mailto:support@hourglass.app"}
                >
                    <Mail className="h-5 w-5" />
                    Contact Admin
                </Button>
            </div>

            <p className="mt-12 text-sm font-bold text-neutral-400 uppercase tracking-widest">
                ID: {user?.uid?.slice(0, 12)}
            </p>
        </div>
    )
}
