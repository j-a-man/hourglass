"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ShieldCheck, ArrowRight, Building2 } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"

export default function SetupCompanyPage() {
    const [code, setCode] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        // For this implementation, we'll use a hardcoded code as requested for "getting started"
        // In a production app, this would be validated against a secure backend or env var
        const MASTER_ADMIN_CODE = "spyderstack"

        if (code.trim().toLowerCase() === MASTER_ADMIN_CODE.toLowerCase()) {
            router.push(`/register?flow=admin&setupCode=${encodeURIComponent(code)}`)
        } else {
            setError("Invalid access code. Please contact support to get your setup code.")
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            <div className="space-y-2 text-center lg:text-left">
                <Link href="/get-started" className="text-sm font-bold text-primary hover:underline flex items-center gap-1 mb-4">
                    <ArrowRight className="h-4 w-4 rotate-180" /> Back
                </Link>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Setup New Company</h1>
                <p className="text-neutral-500">Enter your administrative access code to begin</p>
            </div>

            <form onSubmit={handleVerify} className="space-y-6">
                {error && (
                    <Alert variant="destructive" className="rounded-xl border-red-100 bg-red-50 text-red-600">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="space-y-2">
                    <Label htmlFor="code" className="text-sm font-semibold text-neutral-700">Access Code</Label>
                    <div className="relative group">
                        <ShieldCheck className="absolute left-4 top-3.5 h-5 w-5 text-neutral-400 group-focus-within:text-primary transition-colors" />
                        <Input
                            id="code"
                            type="text"
                            placeholder="XXXX-XXXX-XXXX"
                            className="pl-12 h-14 text-lg font-black tracking-[0.2em] rounded-xl border-neutral-200 focus:ring-primary/20 transition-all uppercase"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <Button type="submit" className="w-full h-14 bg-primary hover:bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : null}
                    Verify Access
                </Button>
            </form>

            <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
                <div className="flex gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                        <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-blue-900">Enterprise Onboarding</p>
                        <p className="text-xs text-blue-700 font-medium mt-1">
                            Creating a company account allows you to manage multiple locations, set up payroll, and invite your entire team.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
