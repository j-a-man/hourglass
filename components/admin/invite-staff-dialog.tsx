"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { toast } from "sonner"
import { collection, addDoc, serverTimestamp, getDoc, doc, getDocs, orderBy, query } from "firebase/firestore"
import { MapPin } from "lucide-react"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/auth-context"
import { Loader2, Mail, Shield, UserPlus } from "lucide-react"

interface InviteStaffDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function InviteStaffDialog({ open, onOpenChange, onSuccess }: InviteStaffDialogProps) {
    const { userData } = useAuth()
    const [email, setEmail] = useState("")
    const [role, setRole] = useState("employee")
    const [selectedLocationId, setSelectedLocationId] = useState<string>("none")
    const [payRate, setPayRate] = useState("")
    const [locations, setLocations] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [fetchingLocations, setFetchingLocations] = useState(false)

    useEffect(() => {
        const fetchLocations = async () => {
            if (!userData?.organizationId || !open) return
            setFetchingLocations(true)
            try {
                const orgId = userData.organizationId
                const querySnapshot = await getDocs(query(collection(db, "organizations", orgId, "locations"), orderBy("name", "asc")))
                const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                setLocations(docs)
            } catch (error) {
                console.error("Error fetching locations:", error)
            } finally {
                setFetchingLocations(false)
            }
        }
        fetchLocations()
    }, [userData?.organizationId, open])

    const handleInvite = async () => {
        if (!email) {
            toast.error("Please enter an email address")
            return
        }
        if (!payRate) {
            toast.error("Please enter an hourly pay rate")
            return
        }

        setLoading(true)
        try {
            const invitationData: any = {
                email,
                role,
                status: "pending",
                inviterId: userData?.uid || '',
                inviterName: userData?.name || 'Administrator',
                createdAt: serverTimestamp(),
                payRate: parseFloat(payRate) || 0,
            }

            if (selectedLocationId !== "none") {
                invitationData.locationId = selectedLocationId;
            }

            // Only add organizationId and locationId if they exist to avoid Firebase "undefined" error
            if (userData?.organizationId) {
                invitationData.organizationId = userData.organizationId;
            }
            if (userData?.locationId) {
                invitationData.locationId = userData.locationId;
            }

            const orgId = userData?.organizationId
            if (!orgId) throw new Error("Organization ID missing")

            await addDoc(collection(db, "organizations", orgId, "invitations"), invitationData)

            // Trigger invitation email via Server Action
            try {
                // Fetch company details for the email
                let companyName = "Hourglass"
                let joinCode = ""

                if (userData?.organizationId) {
                    const orgDoc = await getDoc(doc(db, "organizations", userData.organizationId))
                    if (orgDoc.exists()) {
                        const orgData = orgDoc.data()
                        companyName = orgData.name
                        joinCode = orgData.joinCode
                    }
                }

                const { sendTeamInviteEmailAction } = await import("@/app/actions/email")
                const protocol = window.location.protocol;
                const host = window.location.host;
                const inviteLink = `${protocol}//${host}/register?flow=employee&orgId=${userData?.organizationId}&joinCode=${joinCode || 'NOT_SET'}&orgName=${encodeURIComponent(companyName)}`;

                await sendTeamInviteEmailAction(
                    email,
                    userData?.name || "An Administrator",
                    companyName,
                    joinCode,
                    inviteLink
                )
            } catch (emailErr) {
                console.error("Failed to send invitation email:", emailErr)
                // We don't block the UI if email fails
            }

            toast.success(`Invitation sent to ${email}`)
            onOpenChange(false)
            setEmail("")
            setRole("employee")
            setSelectedLocationId("none")
            if (onSuccess) onSuccess()
        } catch (error) {
            console.error("Error sending invitation:", error)
            toast.error("Failed to send invitation")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-[32px] border-neutral-100 shadow-2xl p-0 overflow-hidden">
                <div className="bg-primary/5 p-8 border-b border-primary/10">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                        <UserPlus className="h-6 w-6" />
                    </div>
                    <DialogTitle className="text-2xl font-bold text-neutral-900 tracking-tight">Invite Team Member</DialogTitle>
                    <DialogDescription className="text-neutral-500 font-medium mt-1">
                        Send an invitation link to a new staff member to join Hourglass.
                    </DialogDescription>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-1">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 h-4 w-4 text-neutral-400" />
                            <Input
                                placeholder="name@company.com"
                                className="pl-11 h-12 rounded-xl bg-neutral-50 border-transparent focus:bg-white focus:ring-primary/20"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-1">Access Level</Label>
                        <Select value={role} onValueChange={setRole} disabled={loading}>
                            <SelectTrigger className="h-12 rounded-xl bg-neutral-50 border-transparent focus:bg-white focus:ring-primary/20 text-neutral-900 font-medium">
                                <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-primary" />
                                    <SelectValue placeholder="Select a role" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-neutral-100 shadow-xl">
                                <SelectItem value="employee" className="rounded-lg font-bold py-3 text-neutral-800">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                        Employee
                                    </div>
                                </SelectItem>
                                <SelectItem value="admin" className="rounded-lg font-bold py-3 text-neutral-800">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                                        Administrator
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-1">Primary Location (Optional)</Label>
                        <Select value={selectedLocationId} onValueChange={setSelectedLocationId} disabled={loading || fetchingLocations}>
                            <SelectTrigger className="h-12 rounded-xl bg-neutral-50 border-transparent focus:bg-white focus:ring-primary/20 text-neutral-900 font-medium">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    <SelectValue placeholder="Select a location" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-neutral-100 shadow-xl">
                                <SelectItem value="none" className="rounded-lg font-bold py-3 text-neutral-500 italic">
                                    No location assigned
                                </SelectItem>
                                {locations.map((loc) => (
                                    <SelectItem key={loc.id} value={loc.id} className="rounded-lg font-bold py-3 text-neutral-800">
                                        {loc.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {fetchingLocations && <p className="text-[10px] text-neutral-400 animate-pulse px-1">Loading locations...</p>}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-1">Hourly Pay Rate ($)</Label>
                        <div className="relative">
                            <span className="absolute left-4 top-3.5 font-bold text-neutral-400">$</span>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="pl-8 h-12 rounded-xl bg-neutral-50 border-transparent focus:bg-white focus:ring-primary/20 font-bold text-neutral-900"
                                value={payRate}
                                onChange={(e) => setPayRate(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-8 bg-neutral-50/50 border-t border-neutral-100 flex flex-col sm:flex-row gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl h-12 px-6 font-bold text-neutral-500 hover:bg-neutral-100"
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleInvite}
                        className="rounded-xl h-12 px-8 bg-primary hover:bg-primary-600 shadow-lg shadow-primary/20 font-bold flex-1"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Invitation"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
