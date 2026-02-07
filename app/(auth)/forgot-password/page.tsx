"use client"

import { useState } from "react"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState("")

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            await sendPasswordResetEmail(auth, email)
            setSuccess(true)
            toast.success("Reset link sent!")
        } catch (err: any) {
            console.error("Reset error:", err)
            if (err.code === 'auth/user-not-found') {
                setError("No account found with this email address.")
            } else {
                setError("Failed to send reset email. Please try again.")
            }
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="space-y-8 text-center lg:text-left">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-semantic-success/10 text-semantic-success mb-2">
                    <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-neutral-900">Check your email</h1>
                    <p className="text-neutral-500 tracking-tight">
                        We've sent a password reset link to <span className="font-bold text-neutral-900">{email}</span>.
                    </p>
                </div>
                <div className="pt-4">
                    <Link href="/login">
                        <Button variant="outline" className="w-full h-12 rounded-xl border-neutral-200">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Login
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="space-y-2 text-center lg:text-left">
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Forgot password?</h1>
                <p className="text-neutral-500">No worries, we'll send you reset instructions.</p>
            </div>

            <form onSubmit={handleReset} className="space-y-6">
                {error && (
                    <Alert variant="destructive" className="rounded-xl border-red-100 bg-red-50 text-red-600">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-neutral-700">Email Address</Label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-3.5 h-5 w-5 text-neutral-400 group-focus-within:text-primary transition-colors" />
                        <Input
                            id="email"
                            type="email"
                            placeholder="name@pharmacy.com"
                            className="pl-12 h-12 rounded-xl border-neutral-200 focus:ring-primary/20 transition-all"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full h-12 bg-primary hover:bg-primary-600 font-bold rounded-xl shadow-lg shadow-primary/20 transition-all"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Sending...
                        </>
                    ) : (
                        "Send Reset Link"
                    )}
                </Button>
            </form>

            <div className="text-center">
                <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-primary transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    Back to login
                </Link>
            </div>
        </div>
    )
}
