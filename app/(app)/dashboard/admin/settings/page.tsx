"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
    Loader2
} from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { useEffect, useCallback } from "react"
import { toast } from "sonner"
import { generateJoinCode } from "@/lib/utils"

export default function AdminSettingsPage() {
    const { userData } = useAuth()
    const [organization, setOrganization] = useState<any>(null)
    const [copied, setCopied] = useState(false)
    const [loading, setLoading] = useState(true)

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
                    mobileAlerts: data.notifications?.mobileAlerts ?? false
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
        mobileAlerts: false
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

            <div className="grid lg:grid-cols-12 gap-10">
                {/* Navigation Sidebar (Mobile View could be different) */}
                <div className="lg:col-span-4 space-y-2">
                    {[
                        { label: "Company Profile", icon: Building2, active: true },
                        { label: "Attendance Policy", icon: Clock },
                        { label: "Security & Access", icon: Lock },
                        { label: "Notifications", icon: Bell },
                        { label: "Billing & Plans", icon: CreditCard },
                    ].map((item, i) => (
                        <Button
                            key={i}
                            variant="ghost"
                            className={`w-full justify-start h-12 rounded-xl font-bold transition-all ${item.active ? "bg-white shadow-sm border-neutral-100 text-primary border" : "text-neutral-500 hover:bg-neutral-50"
                                }`}
                        >
                            <item.icon className={`mr-3 h-5 w-5 ${item.active ? "text-primary" : "text-neutral-400"}`} />
                            {item.label}
                        </Button>
                    ))}
                </div>

                {/* Settings Content */}
                <div className="lg:col-span-8 space-y-8">

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
                </div>
            </div>
        </div>
    )
}
