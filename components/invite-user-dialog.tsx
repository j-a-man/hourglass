"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { db } from "@/lib/firebase"
import { collection, addDoc, query, where, getDocs } from "firebase/firestore"
import { Loader2, Plus, Mail } from "lucide-react"
import { toast } from "sonner"

export function InviteUserDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState("")
    const [role, setRole] = useState("technician")
    const [locationId, setLocationId] = useState("north")

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Check if already invited
            const q = query(collection(db, "invitations"), where("email", "==", email))
            const querySnapshot = await getDocs(q)

            if (!querySnapshot.empty) {
                toast.error("User already invited")
                setLoading(false)
                return
            }

            // Create invitation
            await addDoc(collection(db, "invitations"), {
                email,
                role,
                locationId,
                status: "pending",
                createdAt: new Date().toISOString()
            })

            toast.success("Invitation sent successfully")
            setOpen(false)
            setEmail("")
            setRole("technician")
        } catch (error) {
            console.error("Error sending invite:", error)
            toast.error("Failed to send invitation")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Invite Employee
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Invite Employee</DialogTitle>
                    <DialogDescription>
                        Send an invitation to a new employee. They will be able to register with their email.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInvite} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="colleague@pharmacy.com"
                                className="pl-10"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="technician">Technician</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Select value={locationId} onValueChange={setLocationId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select location" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="north">North Store</SelectItem>
                                    <SelectItem value="south">South Store</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                "Send Invite"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
