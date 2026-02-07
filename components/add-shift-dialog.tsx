"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, Timestamp, query, where } from "firebase/firestore"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { useAuth } from "@/components/auth-context"

interface User {
    id: string
    name: string
    email: string
}

interface Location {
    id: string
    name: string
}

interface AddShiftDialogProps {
    defaultDate?: Date
    trigger?: React.ReactNode
    onSuccess?: () => void
}

export function AddShiftDialog({ defaultDate, trigger, onSuccess }: AddShiftDialogProps) {
    const { userData } = useAuth()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [employees, setEmployees] = useState<User[]>([])
    const [locations, setLocations] = useState<Location[]>([])

    const [selectedEmployee, setSelectedEmployee] = useState("")
    const [selectedLocation, setSelectedLocation] = useState("")
    const [startTime, setStartTime] = useState("")
    const [endTime, setEndTime] = useState("")

    useEffect(() => {
        if (open) {
            fetchData()
            if (defaultDate) {
                // Set default start time to 9 AM on selecte date
                const start = new Date(defaultDate)
                start.setHours(9, 0, 0, 0)
                const startStr = new Date(start.getTime() - (start.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)

                // Set default end time to 5 PM
                const end = new Date(defaultDate)
                end.setHours(17, 0, 0, 0)
                const endStr = new Date(end.getTime() - (end.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)

                setStartTime(startStr)
                setEndTime(endStr)
            }
        }
    }, [open, defaultDate])

    const fetchData = async () => {
        if (!userData?.organizationId) return
        const orgId = userData.organizationId

        try {
            // Fetch Users for this organization
            const usersSnap = await getDocs(query(
                collection(db, "users"),
                where("organizationId", "==", orgId)
            ))
            const usersData = usersSnap.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name || doc.data().email || "Unknown",
                email: doc.data().email
            }))
            setEmployees(usersData)

            // Fetch Locations from organization sub-collection
            const locsSnap = await getDocs(collection(db, "organizations", orgId, "locations"))
            const locsData = locsSnap.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name
            }))
            setLocations(locsData)
        } catch (error) {
            console.error("Error fetching data:", error)
            toast.error("Failed to load form data")
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedEmployee || !selectedLocation || !startTime || !endTime) {
            toast.error("Please fill in all fields")
            return
        }

        setLoading(true)
        try {
            const orgId = userData?.organizationId
            if (!orgId) throw new Error("Organization ID missing")

            const start = new Date(startTime)
            const end = new Date(endTime)

            if (end <= start) {
                toast.error("End time must be after start time")
                setLoading(false)
                return
            }

            const employee = employees.find(e => e.id === selectedEmployee)
            const location = locations.find(l => l.id === selectedLocation)

            await addDoc(collection(db, "organizations", orgId, "shifts"), {
                userId: selectedEmployee,
                userName: employee?.name || "Unknown",
                locationId: selectedLocation,
                locationName: location?.name || "Unknown",
                startTime: Timestamp.fromDate(start),
                endTime: Timestamp.fromDate(end),
                status: "scheduled",
                createdAt: Timestamp.now()
            })

            toast.success("Shift scheduled successfully")
            setOpen(false)
            resetForm()
            if (onSuccess) onSuccess()
        } catch (error) {
            console.error("Error creating shift:", error)
            toast.error("Failed to create shift")
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setSelectedEmployee("")
        setSelectedLocation("")
        setStartTime("")
        setEndTime("")
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Shift
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Schedule New Shift</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Employee</Label>
                        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                                {employees.map(emp => (
                                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Location</Label>
                        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                                {locations.map(loc => (
                                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Start Time</Label>
                        <Input
                            type="datetime-local"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>End Time</Label>
                        <Input
                            type="datetime-local"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                        />
                    </div>

                    <Button type="submit" disabled={loading}>
                        {loading ? "Scheduling..." : "Schedule Shift"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
