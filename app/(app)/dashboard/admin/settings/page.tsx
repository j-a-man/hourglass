"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
    Settings,
    Building2,
    ShieldCheck,
    Bell,
    CreditCard,
    Save,
    Lock,
    Clock,
    Mail,
    Smartphone,
    Copy,
    RefreshCw,
    Check,
    Loader2,
    AlertTriangle,
    Trash2
} from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { useEffect, useCallback } from "react"
import { toast } from "sonner"
import { generateJoinCode } from "@/lib/utils"
import { deleteOrganizationAccount } from "@/app/actions/delete-account"
import { signOut, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"

export default function AdminSettingsPage() {
    const { userData } = useAuth()
    const router = useRouter()
    const [organization, setOrganization] = useState<any>(null)
    const [copied, setCopied] = useState(false)
    const [loading, setLoading] = useState(true)

    // Delete account
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState("")
    const [deleting, setDeleting] = useState(false)
    const [password, setPassword] = useState("")
    const [passwordError, setPasswordError] = useState("")
    const [reauthenticating, setReauthenticating] = useState(false)

    const fetchOrg = useCallback(async () => {
        if (!userData?.organizationId) {
            setLoading(false)
            return
        }
        try {
            const orgRef = doc(db, "organizations", userData.organizationId)
            const orgDoc = await getDoc(orgRef)
            if (orgDoc.exists()) {
                const data = orgDoc.data()

                // Auto-repair missing joinCode
                if (!data.joinCode) {
                    const newCode = generateJoinCode()
                    await updateDoc(orgRef, { joinCode: newCode })
                    data.joinCode = newCode
                }

                setOrganization(data)
                // Initialize form data from fetched organization
                setFormData({
                    name: data.name || "",
                    supportEmail: data.supportEmail || userData.email || "",
                    timezone: data.timezone || "Eastern Standard Time (EST)",
                    geofencingActive: data.geofencingActive ?? true,
                    geofenceRadius: data.geofenceRadius?.toString() || "100",
                    dailySummary: data.notifications?.dailySummary ?? false,
                    mobileAlerts: data.notifications?.mobileAlerts ?? false,
                    payrollSettings: data.payrollSettings ?? { roundingInterval: 15, roundingBuffer: 5 }
                })
            }
        } catch (error) {
            console.error("Error fetching organization:", error)
        } finally {
            setLoading(false)
        }
    }, [userData?.organizationId, userData?.email])

    const [formData, setFormData] = useState({
        name: "",
        supportEmail: "",
        timezone: "Eastern Standard Time (EST)",
        geofencingActive: true,
        geofenceRadius: "100",
        dailySummary: false,
        mobileAlerts: false,
        payrollSettings: { roundingInterval: 15, roundingBuffer: 5 }
    })

    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchOrg()
    }, [fetchOrg])

    const copyToClipboard = () => {
        if (!organization?.joinCode) return
        navigator.clipboard.writeText(organization.joinCode)
        setCopied(true)
        toast.success("Join code copied to clipboard")
        setTimeout(() => setCopied(false), 2000)
    }

    const handleSave = async () => {
        if (!userData?.organizationId) {
            toast.error("No organization linked to your account")
            return
        }

        setSaving(true)
        try {
            const orgRef = doc(db, "organizations", userData.organizationId)
            await updateDoc(orgRef, {
                name: formData.name,
                supportEmail: formData.supportEmail,
                timezone: formData.timezone,
                geofencingActive: formData.geofencingActive,
                geofenceRadius: parseInt(formData.geofenceRadius) || 100,
                notifications: {
                    dailySummary: formData.dailySummary,
                    mobileAlerts: formData.mobileAlerts
                },
                payrollSettings: formData.payrollSettings,
                updatedAt: new Date().toISOString()
            })

            toast.success("Settings updated successfully")
        } catch (error) {
            console.error("Error saving settings:", error)
            toast.error("Failed to save changes")
        } finally {
            setSaving(false)
        }
    }

    const handleRotateCode = async () => {
        if (!userData?.organizationId) return
        const newCode = generateJoinCode()
        try {
            await updateDoc(doc(db, "organizations", userData.organizationId), {
                joinCode: newCode
            })
            setOrganization((prev: any) => ({ ...prev, joinCode: newCode }))
            toast.success("Join code refreshed successfully")
        } catch (error) {
            console.error("Error rotating code:", error)
            toast.error("Failed to refresh join code")
        }
    }

    const handleReauthenticate = async () => {
        const user = auth.currentUser
        if (!user || !user.email) {
            toast.error("No authenticated user found")
            return
        }
        setReauthenticating(true)
        setPasswordError("")
        try {
            const credential = EmailAuthProvider.credential(user.email, password)
            await reauthenticateWithCredential(user, credential)
            setPasswordDialogOpen(false)
            setPassword("")
            setPasswordError("")
            setDeleteConfirmText("")
            setDeleteDialogOpen(true)
        } catch (error: any) {
            console.error("Re-auth failed:", error)
            if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential" || error.code === "auth/invalid-login-credentials") {
                setPasswordError("Incorrect password. Please try again.")
            } else if (error.code === "auth/too-many-requests") {
                setPasswordError("Too many attempts. Please try again later.")
            } else {
                setPasswordError("Authentication failed. Please try again.")
            }
        } finally {
            setReauthenticating(false)
        }
    }

    return (
        <div className="space-y-10 max-w-5xl mx-auto px-4 lg:px-0 pb-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">System Configuration</h1>
                    <p className="text-neutral-500 font-medium">Manage your organization identity, global policies, and security settings.</p>
                </div>
                <Button
                    className="rounded-xl px-8 h-12 bg-primary hover:bg-primary-600 shadow-lg shadow-primary/20 font-bold"
                    onClick={handleSave}
                    disabled={saving || loading}
                >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </header>

            <div className="space-y-8">
                {/* Settings Content */}
                <Card className="rounded-[32px] border-neutral-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 p-8">
                        <CardTitle className="text-lg font-bold text-neutral-900">Organization Identity</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">Display Name</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="h-12 rounded-xl bg-neutral-50 border-transparent focus:bg-white focus:ring-primary/20 font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">Support Email</Label>
                                <Input
                                    value={formData.supportEmail}
                                    onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                                    className="h-12 rounded-xl bg-neutral-50 border-transparent focus:bg-white focus:ring-primary/20 font-medium"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">Timezone</Label>
                            <select
                                value={formData.timezone}
                                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                className="w-full h-12 bg-neutral-50 border-0 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                            >
                                <option>Eastern Standard Time (EST)</option>
                                <option>Pacific Standard Time (PST)</option>
                                <option>Central Standard Time (CST)</option>
                            </select>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-[32px] border-neutral-100 shadow-sm overflow-hidden bg-primary/5 border-primary/10">
                    <CardHeader className="bg-white/50 border-b border-primary/10 p-8">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold text-neutral-900">Onboarding & Team Access</CardTitle>
                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-4">
                            <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">Company Join Code</Label>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 bg-white border border-primary/20 rounded-2xl p-6 flex flex-col items-center justify-center space-y-2 shadow-sm">
                                    <p className="text-3xl font-black text-primary tracking-[0.2em]">
                                        {loading ? "••••••••" : organization?.joinCode || "NOT SET"}
                                    </p>
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Share this with your team to join</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Button
                                        variant="outline"
                                        className="h-12 w-12 rounded-xl border-primary/20 text-primary hover:bg-primary/10"
                                        onClick={copyToClipboard}
                                    >
                                        {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-12 w-12 rounded-xl border-neutral-200 text-neutral-400 hover:text-neutral-600"
                                        onClick={handleRotateCode}
                                    >
                                        <RefreshCw className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                            <div className="bg-white/50 rounded-xl p-4 border border-primary/5">
                                <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                                    New employees can use this code at <span className="text-primary font-bold">/join-team</span> to automatically link their account to your organization.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-[32px] border-neutral-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 p-8">
                        <CardTitle className="text-lg font-bold text-neutral-900">Global Attendance Guard</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div
                            className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${formData.geofencingActive ? "bg-emerald-50/50 border-emerald-100" : "bg-neutral-50/50 border-neutral-100"
                                } border`}
                            onClick={() => setFormData({ ...formData, geofencingActive: !formData.geofencingActive })}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm ${formData.geofencingActive ? "text-emerald-600" : "text-neutral-400"
                                    }`}>
                                    <ShieldCheck className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className={`font-bold text-sm ${formData.geofencingActive ? "text-emerald-900" : "text-neutral-900"}`}>
                                        Precision Geofencing {formData.geofencingActive ? "Active" : "Disabled"}
                                    </p>
                                    <p className={`text-xs font-medium ${formData.geofencingActive ? "text-emerald-700" : "text-neutral-500"}`}>
                                        {formData.geofencingActive ? "Prevents clocking from unauthorized locations." : "Employees can clock in from anywhere."}
                                    </p>
                                </div>
                            </div>
                            <div className={`h-6 w-11 rounded-full flex items-center px-1 shadow-inner transition-colors ${formData.geofencingActive ? "bg-emerald-500" : "bg-neutral-200"
                                }`}>
                                <div className={`h-4 w-4 bg-white rounded-full transition-transform ${formData.geofencingActive ? "translate-x-5" : "translate-x-0"
                                    }`} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">Default Geofence Radius (meters)</Label>
                            <Input
                                type="number"
                                value={formData.geofenceRadius}
                                onChange={(e) => setFormData({ ...formData, geofenceRadius: e.target.value })}
                                className="h-12 rounded-xl bg-neutral-50 border-transparent focus:bg-white focus:ring-primary/20"
                            />
                            <p className="text-[10px] text-neutral-400 font-medium px-1">Applies to all new locations unless overridden.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-[32px] border-neutral-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 p-8">
                        <CardTitle className="text-lg font-bold text-neutral-900">Payroll Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">Rounding Logic</Label>
                            <select
                                value={formData.payrollSettings?.roundingInterval?.toString() ?? "15"}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    payrollSettings: {
                                        ...formData.payrollSettings,
                                        roundingInterval: parseInt(e.target.value)
                                    }
                                })}
                                className="w-full h-12 bg-neutral-50 border-0 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                            >
                                <option value="0">Exact (No Rounding)</option>
                                <option value="15">Nearest 15 Minutes</option>
                                <option value="30">Nearest 30 Minutes</option>
                                <option value="60">Nearest Hour</option>
                            </select>
                            <p className="text-[10px] text-neutral-400 font-medium px-1">
                                Determines how employee time entries are rounded for payroll calculations.
                            </p>
                        </div>

                        {formData.payrollSettings?.roundingInterval > 0 && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">Rounding Buffer (Minutes)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max={formData.payrollSettings.roundingInterval - 1}
                                    value={formData.payrollSettings?.roundingBuffer ?? 5}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        payrollSettings: {
                                            ...formData.payrollSettings,
                                            roundingBuffer: parseInt(e.target.value) || 0
                                        }
                                    })}
                                    className="h-12 rounded-xl bg-neutral-50 border-transparent focus:bg-white focus:ring-primary/20 font-bold"
                                />
                                <p className="text-[10px] text-neutral-400 font-medium px-1">
                                    Round up to the next interval if within this many minutes.
                                    Example: With 15m interval and 5m buffer, 12:10 rounds up to 12:15.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-[32px] border-neutral-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 p-8">
                        <CardTitle className="text-lg font-bold text-neutral-900">Push Notifications</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-4">
                        {[
                            { title: "Daily Summary", desc: "Receive an email digest of staff attendance.", icon: Mail, key: "dailySummary" },
                            { title: "Mobile Alerts", desc: "Push notifications for late clock-ins.", icon: Smartphone, key: "mobileAlerts" },
                        ].map((pref, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between py-2 cursor-pointer"
                                onClick={() => setFormData({ ...formData, [pref.key]: !formData[pref.key as keyof typeof formData] })}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm transition-colors ${formData[pref.key as keyof typeof formData] ? "bg-primary/10 text-primary" : "bg-neutral-50 text-neutral-400"
                                        }`}>
                                        <pref.icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-neutral-900 text-sm">{pref.title}</p>
                                        <p className="text-xs text-neutral-500 font-medium">{pref.desc}</p>
                                    </div>
                                </div>
                                <div className={`h-6 w-11 rounded-full flex items-center px-1 transition-colors ${formData[pref.key as keyof typeof formData] ? "bg-primary" : "bg-neutral-200"
                                    }`}>
                                    <div className={`h-4 w-4 bg-white rounded-full transition-transform ${formData[pref.key as keyof typeof formData] ? "translate-x-5" : "translate-x-0"
                                        }`} />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Account Security */}
                <Card className="rounded-[32px] border-neutral-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 p-8">
                        <CardTitle className="text-lg font-bold text-neutral-900">Account Security</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-neutral-50 rounded-2xl border border-neutral-100 gap-4">
                            <div>
                                <p className="font-bold text-neutral-900">Admin Password</p>
                                <p className="text-xs text-neutral-500 font-medium mt-1">
                                    Update your password to keep your account secure.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                className="rounded-xl font-bold h-12 border-neutral-200 bg-white shadow-sm"
                                onClick={async () => {
                                    if (auth.currentUser?.email) {
                                        try {
                                            await import("firebase/auth").then(m => m.sendPasswordResetEmail(auth, auth.currentUser!.email!))
                                            toast.success(`Reset link sent to ${auth.currentUser?.email}`)
                                        } catch (e: any) {
                                            console.error(e)
                                            toast.error("Failed to send reset link")
                                        }
                                    }
                                }}
                            >
                                <Mail className="mr-2 h-4 w-4" />
                                Send Reset Link
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="rounded-[32px] border-red-200 shadow-sm overflow-hidden bg-red-50/30">
                    <CardHeader className="bg-red-50/50 border-b border-red-100 p-8">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                            <CardTitle className="text-lg font-bold text-red-900">Danger Zone</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-3">
                            <h3 className="font-bold text-red-900">Delete Organization Account</h3>
                            <p className="text-sm text-red-700/80 leading-relaxed">
                                Permanently delete your organization and all associated data. This action removes <span className="font-bold">all employees, locations, shifts, time entries, and your admin account</span>. This cannot be undone.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-100 hover:text-red-900 font-bold rounded-xl h-12 px-6"
                            onClick={() => { setPasswordDialogOpen(true); setPassword("") }}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete This Organization Forever
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Step 1: Password Re-authentication Dialog */}
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                <DialogContent className="rounded-3xl max-w-md p-0 overflow-hidden">
                    <div className="bg-neutral-50 border-b border-neutral-100 p-6">
                        <DialogHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center">
                                    <Lock className="h-6 w-6 text-red-600" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-bold text-neutral-900">Verify Your Identity</DialogTitle>
                                    <DialogDescription className="text-sm text-neutral-500 mt-1">
                                        Enter your password to proceed with account deletion.
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Account Password</Label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setPasswordError("") }}
                                placeholder="Enter your password"
                                className="h-12 rounded-xl bg-neutral-50 border-transparent focus:bg-white focus:ring-primary/20 font-medium"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && password.length > 0) {
                                        handleReauthenticate()
                                    }
                                }}
                            />
                            {passwordError && (
                                <p className="text-sm font-bold text-red-600 flex items-center gap-2 mt-1">
                                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                    {passwordError}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter className="p-6 pt-0 flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1 h-12 rounded-xl font-bold"
                            onClick={() => setPasswordDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 h-12 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white"
                            disabled={password.length === 0 || reauthenticating}
                            onClick={handleReauthenticate}
                        >
                            {reauthenticating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                            {reauthenticating ? "Verifying..." : "Verify & Continue"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Step 2: Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="rounded-3xl max-w-md p-0 overflow-hidden">
                    <div className="bg-red-50 border-b border-red-100 p-6">
                        <DialogHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center">
                                    <AlertTriangle className="h-6 w-6 text-red-600" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-bold text-red-900">Delete Organization</DialogTitle>
                                    <DialogDescription className="text-sm text-red-700/80 mt-1">
                                        This action is permanent and cannot be undone.
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                    </div>
                    <div className="p-6 space-y-5">
                        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 space-y-2">
                            <p className="text-sm font-bold text-red-900">The following will be permanently deleted:</p>
                            <ul className="text-sm text-red-700/80 space-y-1 pl-1">
                                <li>• All employee accounts and authentication</li>
                                <li>• All locations and geofencing data</li>
                                <li>• All shifts and schedules</li>
                                <li>• All time entries and clock-in records</li>
                                <li>• Your admin account</li>
                            </ul>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                                Type <span className="text-red-600">DELETE</span> to confirm
                            </Label>
                            <Input
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="DELETE"
                                className="h-12 rounded-xl bg-white border-red-200 focus:ring-red-200 font-mono text-center text-lg tracking-widest"
                            />
                        </div>
                    </div>
                    <DialogFooter className="p-6 pt-0 flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1 h-12 rounded-xl font-bold"
                            onClick={() => setDeleteDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            className="flex-1 h-12 rounded-xl font-bold bg-red-600 hover:bg-red-700"
                            disabled={deleteConfirmText !== "DELETE" || deleting}
                            onClick={async () => {
                                if (!userData?.uid || !userData?.organizationId) return
                                setDeleting(true)
                                try {
                                    const result = await deleteOrganizationAccount(
                                        userData.uid,
                                        userData.organizationId,
                                        deleteConfirmText
                                    )
                                    if (result.error) {
                                        toast.error(result.error)
                                        setDeleting(false)
                                        return
                                    }
                                    toast.success("Organization deleted. Signing you out...")
                                    await signOut(auth)
                                    router.push("/")
                                } catch (error) {
                                    console.error("Delete failed:", error)
                                    toast.error("Failed to delete organization")
                                    setDeleting(false)
                                }
                            }}
                        >
                            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            {deleting ? "Deleting..." : "Delete Forever"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
