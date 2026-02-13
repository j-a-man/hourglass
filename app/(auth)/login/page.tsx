"use client"

import { useState } from "react"
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Lock, Mail, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import Link from "next/link"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const normalizedEmail = email.trim().toLowerCase();
            const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password)
            const user = userCredential.user

            const userDoc = await getDoc(doc(db, "users", user.uid))

            if (userDoc.exists()) {
                const userData = userDoc.data()
                if (userData.role === 'admin' || userData.role === 'owner' || userData.role === 'manager') {
                    router.push("/dashboard/admin")
                } else {
                    router.push("/dashboard/employee")
                }
            } else {
                router.push("/dashboard")
            }
        } catch (err: any) {
            console.error("Login error:", err)
            if (err.code === 'auth/invalid-credential') {
                setError("Incorrect email or password.")
            } else {
                setError("Something went wrong. Please try again.")
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            <div className="space-y-2 text-center lg:text-left">
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Welcome back</h1>
                <p className="text-neutral-500">Enter your credentials to access your dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
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

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="password" className="text-sm font-semibold text-neutral-700">Password</Label>
                        <Link
                            href="/forgot-password"
                            className="text-sm font-bold text-primary hover:underline hover:text-primary-600 transition-colors"
                        >
                            Forgot Password?
                        </Link>
                    </div>

                    <div className="relative group">
                        <Lock className="absolute left-4 top-3.5 h-5 w-5 text-neutral-400 group-focus-within:text-primary transition-colors" />
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            className="pl-12 h-12 rounded-xl border-neutral-200 focus:ring-primary/20 transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full h-12 bg-primary hover:bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Signing in...
                        </>
                    ) : (
                        "Sign In"
                    )}
                </Button>
            </form>

            <div className="text-center text-sm text-neutral-500">
                New to Hourglass?{" "}
                <Link href="/get-started" className="font-bold text-primary hover:underline">
                    Get Started
                </Link>
            </div>
        </div>
    )
}