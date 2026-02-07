"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Users, ArrowRight, Hash } from "lucide-react"
import { query, collection, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Link from "next/link"

export default function JoinTeamPage() {
    const [code, setCode] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const paramCode = searchParams?.get("code")

    const [checkedParam, setCheckedParam] = useState(false)

    const processJoin = async (targetCode: string) => {
        setError("")
        setLoading(true)

        try {
            const q = query(collection(db, "organizations"), where("joinCode", "==", targetCode.trim().toUpperCase()))
            const querySnapshot = await getDocs(q)

            if (querySnapshot.empty) {
                setError("Invalid join code. Please double-check with your administrator.")
                setLoading(false)
                return
            }

            const orgData = querySnapshot.docs[0].data()
            const orgId = querySnapshot.docs[0].id

            router.push(`/register?flow=employee&orgId=${orgId}&joinCode=${targetCode.trim().toUpperCase()}&orgName=${encodeURIComponent(orgData.name)}`)
        } catch (err: any) {
            console.error("Join error:", err)
            setError("Something went wrong. Please try again.")
            setLoading(false)
        }
    }

    useEffect(() => {
        if (paramCode && !checkedParam) {
            setCode(paramCode)
            setCheckedParam(true)
            processJoin(paramCode)
        }
    }, [paramCode, checkedParam])

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault()
        processJoin(code)
    }

    return (
        <div className="space-y-8">
            <div className="space-y-2 text-center lg:text-left">
                <Link href="/get-started" className="text-sm font-bold text-primary hover:underline flex items-center gap-1 mb-4">
                    <ArrowRight className="h-4 w-4 rotate-180" /> Back
                </Link>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Join My Team</h1>
                <p className="text-neutral-500">Enter the company code provided by your admin</p>
            </div>

            <form onSubmit={handleJoin} className="space-y-6">
                {error && (
                    <Alert variant="destructive" className="rounded-xl border-red-100 bg-red-50 text-red-600">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="space-y-2">
                    <Label htmlFor="code" className="text-sm font-semibold text-neutral-700">Company Join Code</Label>
                    <div className="relative group">
                        <Hash className="absolute left-4 top-3.5 h-5 w-5 text-neutral-400 group-focus-within:text-emerald-500 transition-colors" />
                        <Input
                            id="code"
                            type="text"
                            placeholder="HRG-XXX-XXX"
                            className="pl-12 h-14 text-lg font-black tracking-widest rounded-xl border-neutral-200 focus:ring-emerald-500/20 transition-all uppercase"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <Button type="submit" className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : null}
                    Join Company
                </Button>
            </form>

            <div className="bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100">
                <div className="flex gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <Users className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-emerald-900">Employee Registration</p>
                        <p className="text-xs text-emerald-700 font-medium mt-1">
                            Joining a company gives you access to the clock-in portal, your personal schedule, and payroll reports.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
