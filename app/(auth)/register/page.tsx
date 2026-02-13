"use client"

import { useState, useEffect, Suspense } from "react"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, User, Mail, Lock, Hash, Building2, RefreshCcw } from "lucide-react"
import Link from "next/link"
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, addDoc, getDoc, updateDoc } from "firebase/firestore"
import { useSearchParams } from "next/navigation"
import { generateJoinCode } from "@/lib/utils"
import { toast } from "sonner"


export default function WrappedRegisterPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <RegisterPage />
        </Suspense>
    )
}

function RegisterPage() {
    const searchParams = useSearchParams()
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [companyName, setCompanyName] = useState("")
    const [joinCode, setJoinCode] = useState("")
    const [isMounted, setIsMounted] = useState(false)
    const [showGhostScrub, setShowGhostScrub] = useState(false)
    const [isScrubbing, setIsScrubbing] = useState(false)
    const router = useRouter()

    useEffect(() => {
        setIsMounted(true)
        const name = searchParams.get("orgName")
        const code = searchParams.get("joinCode")
        if (name) setCompanyName(name)
        if (code) setJoinCode(code)
    }, [searchParams])

    const flow = searchParams.get("flow") // 'admin' | 'employee'
    const orgId = searchParams.get("orgId")
    const setupCode = searchParams.get("setupCode")

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        const normalizedEmail = email.trim().toLowerCase();

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            setLoading(false)
            return
        }

        try {
            let finalOrgId = orgId
            let finalRole = "employee"
            let finalLocationId = ""

            // 1. Validate based on flow
            if (flow === "admin") {
                if (!companyName) {
                    setError("Company name is required for setup.")
                    setLoading(false)
                    return
                }
                if (setupCode?.toLowerCase() !== "spyderstack") {
                    setError("Invalid setup session. Please restart from Get Started.")
                    setLoading(false)
                    return
                }
                finalRole = "admin"
            } else if (flow === "employee") {
                if (!joinCode) {
                    setError("Please enter your company join code.")
                    setLoading(false)
                    return
                }

                let currentOrgId = orgId;

                // If orgId is missing but we have a code, find the org
                if (!currentOrgId) {
                    const q = query(collection(db, "organizations"), where("joinCode", "==", joinCode.trim().toUpperCase()))
                    const querySnapshot = await getDocs(q)
                    if (querySnapshot.empty) {
                        setError("Invalid join code. Please double-check with your administrator.")
                        setLoading(false)
                        return
                    }
                    currentOrgId = querySnapshot.docs[0].id
                } else {
                    // Verify the org and code match
                    const orgDoc = await getDoc(doc(db, "organizations", currentOrgId))
                    if (!orgDoc.exists() || orgDoc.data().joinCode !== joinCode) {
                        setError("This invitation link has expired or the code is incorrect.")
                        setLoading(false)
                        return
                    }
                }
                finalOrgId = currentOrgId

                // 1b. Check for a pending invitation to capture pre-sets (like location)
                try {
                    const invQ = query(
                        collection(db, "organizations", finalOrgId, "invitations"),
                        where("email", "==", normalizedEmail),
                        where("status", "==", "pending")
                    )
                    const invSnapshot = await getDocs(invQ)
                    if (!invSnapshot.empty) {
                        const invDoc = invSnapshot.docs[0]
                        const invData = invDoc.data()
                        if (invData.locationId) {
                            finalLocationId = invData.locationId
                        }
                        // Mark invitation as accepted or delete it
                        await deleteDoc(invDoc.ref)
                    }
                } catch (invErr) {
                    console.error("Error checking invitation pre-sets:", invErr)
                }
            } else {
                // Fallback: Existing Invitation Logic
                const q = query(collection(db, "invitations"), where("email", "==", normalizedEmail))
                const querySnapshot = await getDocs(q)

                if (querySnapshot.empty) {
                    setError("No invitation found for this email. Please use a join code or contact your administrator.")
                    setLoading(false)
                    return
                }

                const invitationDoc = querySnapshot.docs[0]
                const invitationData = invitationDoc.data()
                finalOrgId = invitationData.organizationId || invitationData.locationId
                finalRole = invitationData.role
                if (invitationData.locationId) {
                    finalLocationId = invitationData.locationId
                }

                // Cleanup invitation after success
                await deleteDoc(invitationDoc.ref)
            }

            // 2. Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
            const user = userCredential.user
            await updateProfile(user, { displayName: name })

            // 3. Handle Organization Creation (Admin Flow)
            if (flow === "admin") {
                const orgData = {
                    name: companyName,
                    joinCode: generateJoinCode(),
                    ownerUid: user.uid,
                    settings: {
                        timezone: "Eastern Standard Time (EST)",
                        geofencingActive: true,
                        geofenceRadius: 100
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
                const orgRef = await addDoc(collection(db, "organizations"), orgData)
                finalOrgId = orgRef.id
            }

            // 4. Create User Document
            const userDataToSet: any = {
                uid: user.uid,
                email: normalizedEmail,
                name: name,
                role: finalRole,
                organizationId: finalOrgId,
                locationId: finalLocationId,
                status: 'active',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            }

            await setDoc(doc(db, "users", user.uid), userDataToSet)

            // Trigger welcome email via Server Action
            try {
                const { sendWelcomeEmailAction } = await import("@/app/actions/email")
                await sendWelcomeEmailAction(email, name)
            } catch (emailErr) {
                console.error("Failed to send welcome email:", emailErr)
                // We don't block registration if email fails
            }

            if (finalRole === 'admin' || finalRole === 'owner' || finalRole === 'manager') {
                router.push("/dashboard/admin")
            } else {
                router.push("/dashboard/employee")
            }
        } catch (err: any) {
            console.error("Registration error:", err)
            if (err.code === "auth/email-already-in-use") {
                setError("This email is already registered.")
                setShowGhostScrub(true)
            } else {
                setError(err.message || "Failed to register. Please try again.")
            }
        } finally {
            setLoading(false)
        }
    }

    const handleScrubAndRetry = async () => {
        setIsScrubbing(true)
        setError("")
        try {
            const { scrubGhostUserAction } = await import("@/app/actions/auth-actions")
            const result = await scrubGhostUserAction(email)
            if (result.success) {
                toast.success("Account repaired! You can now try registering again.")
                setShowGhostScrub(false)
                setError("")
            } else {
                setError(result.error || "Failed to repair account. Please contact support.")
            }
        } catch (err) {
            setError("An unexpected error occurred during account repair.")
        } finally {
            setIsScrubbing(false)
        }
    }

    return (
        <div className="space-y-8">
            <div className="space-y-2 text-center lg:text-left">
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
                    {flow === 'admin' ? 'Setup Company Admin' : flow === 'employee' ? `Join ${companyName || 'Company'}` : 'Join your Team'}
                </h1>
                <p className="text-neutral-500">
                    {flow === 'admin'
                        ? 'Create your administrative account and company profile.'
                        : flow === 'employee'
                            ? `Create your account to join ${companyName || 'your company'}.`
                            : 'Complete your registration to join your pharmacy team.'}
                </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-5">
                {error && (
                    <Alert variant="destructive" className="rounded-xl border-red-100 bg-red-50 text-red-600">
                        <AlertDescription className="flex flex-col gap-3">
                            <span className="font-medium">{error}</span>
                            {showGhostScrub && (
                                <div className="p-3 bg-white/50 rounded-lg border border-red-100/50">
                                    <p className="text-xs font-bold text-red-700 mb-2 uppercase tracking-tight">Need help?</p>
                                    <p className="text-xs text-red-600 mb-3">
                                        If you think this is a mistake, we can try to repair your account record so you can sign up fresh.
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-9 rounded-lg border-red-200 text-red-600 hover:bg-red-50 font-bold w-full"
                                        onClick={handleScrubAndRetry}
                                        disabled={isScrubbing}
                                    >
                                        {isScrubbing ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <RefreshCcw className="h-3 w-3 mr-2" />}
                                        Repair & Try Again
                                    </Button>
                                </div>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                {flow === 'admin' && (
                    <div className="space-y-2">
                        <Label htmlFor="companyName" className="text-sm font-semibold text-neutral-700">Company Name</Label>
                        <div className="relative group">
                            <Building2 className="absolute left-4 top-3.5 h-5 w-5 text-neutral-400 group-focus-within:text-primary transition-colors" />
                            <Input
                                id="companyName"
                                type="text"
                                placeholder="My Pharmacy Ltd"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                required
                                className="pl-12 h-12 rounded-xl border-neutral-200 focus:ring-primary/20 transition-all"
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold text-neutral-700">Full Name</Label>
                    <div className="relative group">
                        <User className="absolute left-4 top-3.5 h-5 w-5 text-neutral-400 group-focus-within:text-primary transition-colors" />
                        <Input
                            id="name"
                            type="text"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="pl-12 h-12 rounded-xl border-neutral-200 focus:ring-primary/20 transition-all"
                        />
                    </div>
                </div>

                {flow === 'employee' && (
                    <div className="space-y-2">
                        <Label htmlFor="joinCode" className="text-sm font-semibold text-neutral-700">Company Join Code</Label>
                        <div className="relative group">
                            <span className="absolute left-4 top-3.5 h-5 w-5 text-neutral-400 group-focus-within:text-emerald-500 transition-colors">
                                <Hash className="h-5 w-5" />
                            </span>
                            <Input
                                id="joinCode"
                                type="text"
                                placeholder="HRG-XXX-XXX"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                required
                                className="pl-12 h-12 rounded-xl border-neutral-200 focus:ring-emerald-500/20 transition-all uppercase font-bold tracking-wider"
                            />
                        </div>
                        {orgId && (
                            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 px-1 mt-1.5 transition-all">
                                <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" /> Linked to {companyName || 'Organization'}
                            </p>
                        )}
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-neutral-700">Email Address</Label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-3.5 h-5 w-5 text-neutral-400 group-focus-within:text-primary transition-colors" />
                        <Input
                            id="email"
                            type="email"
                            placeholder="name@pharmacy.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="pl-12 h-12 rounded-xl border-neutral-200 focus:ring-primary/20 transition-all"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-semibold text-neutral-700">Password</Label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-3.5 h-5 w-5 text-neutral-400 group-focus-within:text-primary transition-colors" />
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="pl-12 h-12 rounded-xl border-neutral-200 focus:ring-primary/20 transition-all"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-semibold text-neutral-700">Confirm</Label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-3.5 h-5 w-5 text-neutral-400 group-focus-within:text-primary transition-colors" />
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="pl-12 h-12 rounded-xl border-neutral-200 focus:ring-primary/20 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary-600 font-bold rounded-xl shadow-lg shadow-primary/20 transition-all" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : null}
                    Complete Registration
                </Button>
            </form>

            <div className="text-center text-sm text-neutral-500">
                Already have an account?{" "}
                <Link href="/login" className="font-bold text-primary hover:underline">
                    Sign in
                </Link>
            </div>
        </div>
    )
}
