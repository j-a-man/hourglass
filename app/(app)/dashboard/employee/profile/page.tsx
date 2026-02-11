"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Mail, Lock, Save, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { doc, updateDoc } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { updateEmail, sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export default function EmployeeProfilePage() {
    const { user, userData } = useAuth()
    const [isLoading, setIsLoading] = useState(false)

    // Form States
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")

    // Auth Re-verification State
    const [isReauthOpen, setIsReauthOpen] = useState(false)
    const [currentPassword, setCurrentPassword] = useState("")
    const [pendingAction, setPendingAction] = useState<"email" | "password" | null>(null)
    const [newEmail, setNewEmail] = useState("")

    useEffect(() => {
        if (userData) {
            setName(userData.name || "")
        }
        if (user?.email) {
            setEmail(user.email)
        }
    }, [userData, user])

    const handleUpdateName = async () => {
        if (!user || !name.trim()) return
        setIsLoading(true)
        try {
            await updateDoc(doc(db, "users", user.uid), {
                name: name.trim()
            })
            toast.success("Name updated successfully")
        } catch (error) {
            console.error("Error updating name:", error)
            toast.error("Failed to update name")
        } finally {
            setIsLoading(false)
        }
    }

    const initiateUpdateEmail = () => {
        if (email === user?.email) return
        setNewEmail(email)
        setPendingAction("email")
        setIsReauthOpen(true)
    }

    const handleSendResetEmail = async () => {
        if (!user?.email) return
        setIsLoading(true)
        try {
            await sendPasswordResetEmail(auth, user.email)
            toast.success(`Password reset link sent to ${user.email}`)
        } catch (error) {
            console.error("Error sending reset email:", error)
            toast.error("Failed to send reset email")
        } finally {
            setIsLoading(false)
        }
    }

    const handleReauthAndExecute = async () => {
        if (!user || !user.email) return
        setIsLoading(true)
        try {
            // Re-authenticate
            const credential = EmailAuthProvider.credential(user.email, currentPassword)
            await reauthenticateWithCredential(user, credential)

            setIsReauthOpen(false)
            setCurrentPassword("")

            if (pendingAction === "email") {
                await updateEmail(user, newEmail)
                // Update Firestore as well
                await updateDoc(doc(db, "users", user.uid), {
                    email: newEmail
                })
                toast.success("Email updated successfully")
            }
        } catch (error: any) {
            console.error("Action failed:", error)
            if (error.code === 'auth/wrong-password') {
                toast.error("Incorrect password")
            } else {
                toast.error("Failed to verify identity: " + error.message)
            }
        } finally {
            setIsLoading(false)
            setPendingAction(null)
        }
    }

    return (
        <div className="space-y-8 max-w-3xl mx-auto px-4 pb-20">
            <header>
                <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">My Profile</h1>
                <p className="text-neutral-500 font-medium">Manage your personal information and account security.</p>
            </header>

            <div className="space-y-6">
                {/* Personal Info */}
                <Card className="rounded-[24px] border-neutral-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 p-8">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <User className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold text-neutral-900">Personal Information</CardTitle>
                                <CardDescription>Update your display name and contact email.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest pl-1">Full Name</Label>
                            <div className="flex gap-4">
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="h-12 rounded-xl bg-neutral-50 border-transparent focus:bg-white focus:ring-primary/20 font-bold"
                                />
                                <Button
                                    className="h-12 rounded-xl font-bold px-8 shadow-lg shadow-primary/20 aspect-square sm:aspect-auto"
                                    onClick={handleUpdateName}
                                    disabled={isLoading || name === userData?.name}
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 sm:mr-2" />}
                                    <span className="hidden sm:inline">Save</span>
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest pl-1">Email Address</Label>
                            <div className="flex gap-4">
                                <Input
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-12 rounded-xl bg-neutral-50 border-transparent focus:bg-white focus:ring-primary/20 font-medium"
                                />
                                <Button
                                    variant="outline"
                                    className="h-12 rounded-xl font-bold px-8 border-neutral-200"
                                    onClick={initiateUpdateEmail}
                                    disabled={isLoading || email === user?.email}
                                >
                                    Update
                                </Button>
                            </div>
                            <p className="text-[10px] text-neutral-400 font-medium px-2 flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Changing your email will require you to verify your password.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Security */}
                <Card className="rounded-[24px] border-neutral-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 p-8">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <Lock className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold text-neutral-900">Security</CardTitle>
                                <CardDescription>Manage your password and authentication methods.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-neutral-50 rounded-2xl border border-neutral-100 gap-4">
                            <div>
                                <p className="font-bold text-neutral-900">Password</p>
                                <p className="text-xs text-neutral-500 font-medium mt-1">
                                    Secure your account with a strong password.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                className="rounded-xl font-bold h-12 border-neutral-200 bg-white shadow-sm"
                                onClick={handleSendResetEmail}
                                disabled={isLoading}
                            >
                                <Mail className="mr-2 h-4 w-4" />
                                Send Reset Link
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Re-auth Dialog */}
            <Dialog open={isReauthOpen} onOpenChange={setIsReauthOpen}>
                <DialogContent className="rounded-[32px] max-w-md p-0 overflow-hidden">
                    <div className="bg-neutral-50 border-b border-neutral-100 p-8">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-neutral-200 flex items-center justify-center">
                                <Lock className="h-5 w-5 text-neutral-600" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold">Verify Password</DialogTitle>
                                <DialogDescription className="text-neutral-500">
                                    Please enter your current password to confirm these changes.
                                </DialogDescription>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest pl-1">Current Password</Label>
                            <Input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="h-12 rounded-xl bg-neutral-50 border-transparent focus:bg-white focus:ring-primary/20 font-bold"
                                placeholder="Enter your password"
                            />
                        </div>
                    </div>

                    <DialogFooter className="p-8 pt-0">
                        <Button
                            variant="default"
                            className="w-full h-12 rounded-xl font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-600"
                            onClick={handleReauthAndExecute}
                            disabled={!currentPassword || isLoading}
                        >
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            {isLoading ? "Verifying..." : "Verify & Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
