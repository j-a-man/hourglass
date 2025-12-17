"use client"

import { useState } from "react"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Lock, Mail, User } from "lucide-react"
import { motion } from "framer-motion"
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore"

export default function RegisterPage() {
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            setLoading(false)
            return
        }

        try {
            // 1. Check for invitation
            const q = query(collection(db, "invitations"), where("email", "==", email))
            const querySnapshot = await getDocs(q)

            if (querySnapshot.empty) {
                setError("No invitation found for this email. Please contact your administrator.")
                setLoading(false)
                return
            }

            const invitationDoc = querySnapshot.docs[0]
            const invitationData = invitationDoc.data()

            // 2. Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            const user = userCredential.user

            // 3. Update Profile
            await updateProfile(user, { displayName: name })

            // 4. Create User Document
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                name: name,
                role: invitationData.role,
                locationId: invitationData.locationId,
                createdAt: new Date().toISOString()
            })

            // 5. Delete Invitation (or mark as used)
            await deleteDoc(invitationDoc.ref)

            router.push("/dashboard")
        } catch (err: any) {
            console.error("Registration error:", err)
            setError(err.message || "Failed to register. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <Card className="border-slate-200 shadow-lg dark:border-slate-800">
                    <CardHeader className="space-y-1 text-center">
                        <div className="mx-auto mb-4 bg-primary/10 p-3 rounded-full w-fit">
                            <User className="w-6 h-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            Create Account
                        </CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-400">
                            Enter your details to complete registration
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleRegister} className="space-y-4">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="John Doe"
                                        className="pl-10"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@pharmacy.com"
                                        className="pl-10"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="password"
                                        type="password"
                                        className="pl-10"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        className="pl-10"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary/90 transition-all duration-200"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating Account...
                                    </>
                                ) : (
                                    "Register"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="text-center text-sm text-slate-500 dark:text-slate-400">
                        <p className="w-full">
                            Already have an account? <a href="/login" className="text-primary hover:underline">Sign In</a>
                        </p>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    )
}
