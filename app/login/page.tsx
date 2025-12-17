"use client"

import { useState } from "react"
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, Lock, Mail, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    // Reset Password State
    const [resetEmail, setResetEmail] = useState("")
    const [resetLoading, setResetLoading] = useState(false)
    const [resetOpen, setResetOpen] = useState(false)

    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password)
            const user = userCredential.user

            // Fetch user role
            const userDoc = await getDoc(doc(db, "users", user.uid))

            if (userDoc.exists()) {
                const userData = userDoc.data()
                if (userData.role === 'admin') {
                    router.push("/dashboard/admin")
                } else {
                    router.push("/dashboard/technician")
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

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!resetEmail) {
            toast.error("Please enter your email address")
            return
        }

        setResetLoading(true)
        try {
            await sendPasswordResetEmail(auth, resetEmail)
            toast.success("Reset link sent! Check your email.")
            setResetOpen(false)
            setResetEmail("")
        } catch (error: any) {
            console.error("Reset error:", error)
            if (error.code === 'auth/user-not-found') {
                toast.error("No account found with this email")
            } else {
                toast.error("Failed to send reset email")
            }
        } finally {
            setResetLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                {/* GLASS CARD: Increased roundedness to 3xl */}
                <Card className="glass-card border-0 shadow-2xl rounded-[2.5rem]">
                    <CardHeader className="space-y-1 text-center pb-8 pt-10">
                        {/* LOGO: Matching the Dashboard style */}
                        <div className="mx-auto mb-6 h-16 w-16 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-200">
                            <span className="text-white font-bold text-3xl">P</span>
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight text-slate-800">
                            Welcome Back
                        </CardTitle>
                        <CardDescription className="text-slate-500">
                            Sign in to PharmaClock Portal
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-6">

                            {error && (
                                <Alert variant="destructive" className="bg-red-50/50 backdrop-blur-sm text-red-600 border-red-200 rounded-2xl">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {/* EMAIL INPUT */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-600 font-semibold text-xs uppercase tracking-wider ml-4">Email</Label>
                                <div className="relative group">
                                    <Mail className="absolute left-5 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors z-10" />

                                    {/* ROUNDED INPUT: 'rounded-full' makes it pill-shaped */}
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@pharmacy.com"
                                        className="glass-input pl-14 h-12 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 rounded-full"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value)
                                            // Auto-fill reset email if user starts typing here
                                            if (!resetEmail) setResetEmail(e.target.value)
                                        }}
                                        required
                                    />
                                </div>
                            </div>

                            {/* PASSWORD INPUT */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-4 mr-2">
                                    <Label htmlFor="password" className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Password</Label>

                                    <button
                                        type="button"
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                                        onClick={() => {
                                            setResetEmail(email)
                                            setResetOpen(true)
                                        }}
                                    >
                                        Forgot Password?
                                    </button>
                                </div>

                                <div className="relative group">
                                    <Lock className="absolute left-5 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors z-10" />
                                    <Input
                                        id="password"
                                        type="password"
                                        className="glass-input pl-14 h-12 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 rounded-full"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* SUBMIT BUTTON */}
                            <Button
                                type="submit"
                                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-md shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all duration-200 mt-2 rounded-full"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Authenticating...
                                    </>
                                ) : (
                                    "Sign In"
                                )}
                            </Button>
                        </form>

                        {/* PASSWORD RESET DIALOG - MOVED OUTSIDE FORM */}
                        <Dialog open={resetOpen} onOpenChange={setResetOpen}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Reset Password</DialogTitle>
                                    <DialogDescription>
                                        Enter your email address and we'll send you a link to reset your password.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleResetPassword} className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="reset-email">Email Address</Label>
                                        <Input
                                            id="reset-email"
                                            type="email"
                                            placeholder="name@pharmacy.com"
                                            value={resetEmail}
                                            onChange={(e) => setResetEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={resetLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                                            {resetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                                            Send Reset Link
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                    <CardFooter className="text-center text-sm text-slate-500 pb-10">
                        <p className="w-full">
                            Need an account? <span className="text-indigo-600 font-bold cursor-pointer hover:underline">Contact Admin</span>
                        </p>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    )
}