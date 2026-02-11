"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, Timestamp, query, where } from "firebase/firestore"
import { toast } from "sonner"
import { Plus, Repeat, CalendarDays } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { format, addDays, addWeeks, addMonths, isBefore, startOfDay } from "date-fns"
import { sendShiftAssignmentEmailAction } from "@/app/actions/email"

interface User {
    id: string
    name: string
    email: string
}

interface Location {
    id: string
    name: string
    operatingHours?: Record<string, { isOpen: boolean; open: string; close: string }>
}

type RepeatMode = "none" | "daily" | "weekly" | "monthly" | "custom"

const WEEKDAYS = [
    { key: "sun", label: "S" },
    { key: "mon", label: "M" },
    { key: "tue", label: "T" },
    { key: "wed", label: "W" },
    { key: "thu", label: "T" },
    { key: "fri", label: "F" },
    { key: "sat", label: "S" },
]

interface AddShiftDialogProps {
    defaultDate?: Date
    defaultLocationId?: string
    trigger?: React.ReactNode
    onSuccess?: () => void
}

export function AddShiftDialog({ defaultDate, defaultLocationId, trigger, onSuccess }: AddShiftDialogProps) {
    const { userData } = useAuth()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [employees, setEmployees] = useState<User[]>([])
    const [locations, setLocations] = useState<Location[]>([])

    const [selectedEmployee, setSelectedEmployee] = useState("")
    const [selectedLocation, setSelectedLocation] = useState("")
    const [startTime, setStartTime] = useState("")
    const [endTime, setEndTime] = useState("")

    // Recurrence state
    const [repeatMode, setRepeatMode] = useState<RepeatMode>("none")
    const [repeatUntil, setRepeatUntil] = useState("")
    const [customDays, setCustomDays] = useState<string[]>([])

    useEffect(() => {
        if (open) {
            fetchData()
            if (defaultDate) {
                const start = new Date(defaultDate)
                start.setHours(9, 0, 0, 0)
                const startStr = new Date(start.getTime() - (start.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)

                const end = new Date(defaultDate)
                end.setHours(17, 0, 0, 0)
                const endStr = new Date(end.getTime() - (end.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)

                setStartTime(startStr)
                setEndTime(endStr)

                // Default repeat until: 4 weeks from now
                const defaultRepeatEnd = addWeeks(defaultDate, 4)
                setRepeatUntil(format(defaultRepeatEnd, "yyyy-MM-dd"))
            }
            if (defaultLocationId) {
                setSelectedLocation(defaultLocationId)
            }
        }
    }, [open, defaultDate, defaultLocationId])

    // When location changes, update default times based on operating hours
    useEffect(() => {
        if (!selectedLocation || !startTime) return
        const location = locations.find(l => l.id === selectedLocation)
        if (!location?.operatingHours) return

        const shiftDate = new Date(startTime)
        const dayKey = format(shiftDate, "EEEE").toLowerCase()
        const dayHours = location.operatingHours[dayKey]

        if (dayHours?.isOpen && dayHours.open && dayHours.close) {
            const [openH, openM] = dayHours.open.split(":").map(Number)
            const [closeH, closeM] = dayHours.close.split(":").map(Number)

            const newStart = new Date(shiftDate)
            newStart.setHours(openH, openM, 0, 0)
            const startStr = new Date(newStart.getTime() - (newStart.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)

            const newEnd = new Date(shiftDate)
            newEnd.setHours(closeH, closeM, 0, 0)
            const endStr = new Date(newEnd.getTime() - (newEnd.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)

            setStartTime(startStr)
            setEndTime(endStr)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedLocation, locations])

    const fetchData = async () => {
        if (!userData?.organizationId) return
        const orgId = userData.organizationId

        try {
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

            const locsSnap = await getDocs(collection(db, "organizations", orgId, "locations"))
            const locsData = locsSnap.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
                operatingHours: doc.data().operatingHours || undefined
            }))
            setLocations(locsData)
        } catch (error) {
            console.error("Error fetching data:", error)
            toast.error("Failed to load form data")
        }
    }

    /**
     * Generate all occurrence dates based on the recurrence settings
     */
    const generateOccurrences = (baseStart: Date, baseEnd: Date): { start: Date; end: Date }[] => {
        if (repeatMode === "none") {
            return [{ start: baseStart, end: baseEnd }]
        }

        if (!repeatUntil) {
            return [{ start: baseStart, end: baseEnd }]
        }

        const until = new Date(repeatUntil + "T23:59:59")
        const occurrences: { start: Date; end: Date }[] = []
        const durationMs = baseEnd.getTime() - baseStart.getTime()

        if (repeatMode === "daily") {
            let cursor = new Date(baseStart)
            while (isBefore(cursor, until) || cursor.getTime() === until.getTime()) {
                occurrences.push({ start: new Date(cursor), end: new Date(cursor.getTime() + durationMs) })
                cursor = addDays(cursor, 1)
                if (occurrences.length > 90) break // safety cap
            }
        } else if (repeatMode === "weekly") {
            let cursor = new Date(baseStart)
            while (isBefore(cursor, until) || cursor.getTime() === until.getTime()) {
                occurrences.push({ start: new Date(cursor), end: new Date(cursor.getTime() + durationMs) })
                cursor = addWeeks(cursor, 1)
                if (occurrences.length > 52) break
            }
        } else if (repeatMode === "monthly") {
            let cursor = new Date(baseStart)
            while (isBefore(cursor, until) || cursor.getTime() === until.getTime()) {
                occurrences.push({ start: new Date(cursor), end: new Date(cursor.getTime() + durationMs) })
                cursor = addMonths(cursor, 1)
                if (occurrences.length > 24) break
            }
        } else if (repeatMode === "custom" && customDays.length > 0) {
            // Generate for each selected weekday
            const dayMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }
            let cursor = startOfDay(baseStart)
            while (isBefore(cursor, until) || cursor.getTime() === until.getTime()) {
                const dayOfWeek = cursor.getDay()
                const matchingDay = customDays.find(d => dayMap[d] === dayOfWeek)
                if (matchingDay) {
                    const occStart = new Date(cursor)
                    occStart.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0)
                    occurrences.push({ start: occStart, end: new Date(occStart.getTime() + durationMs) })
                }
                cursor = addDays(cursor, 1)
                if (occurrences.length > 90) break
            }
        }

        return occurrences.length > 0 ? occurrences : [{ start: baseStart, end: baseEnd }]
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

            // Generate occurrences
            const occurrences = generateOccurrences(start, end)

            // Generate a group ID if recurring
            const recurrenceGroupId = repeatMode !== "none"
                ? `rg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                : null

            // Batch create all shifts
            const shiftsRef = collection(db, "organizations", orgId, "shifts")
            const promises = occurrences.map(occ =>
                addDoc(shiftsRef, {
                    userId: selectedEmployee,
                    userName: employee?.name || "Unknown",
                    locationId: selectedLocation,
                    locationName: location?.name || "Unknown",
                    startTime: Timestamp.fromDate(occ.start),
                    endTime: Timestamp.fromDate(occ.end),
                    status: "scheduled",
                    createdAt: Timestamp.now(),
                    recurrenceGroupId
                })
            )

            await Promise.all(promises)

            const shiftCount = occurrences.length
            toast.success(
                shiftCount > 1
                    ? `${shiftCount} shifts scheduled successfully`
                    : "Shift scheduled successfully"
            )
            setOpen(false)
            resetForm()
            if (onSuccess) onSuccess()

            // Send email notification (non-blocking)
            if (employee?.email) {
                const dateLabel = shiftCount > 1
                    ? `${format(start, "MMM d")} – ${format(occurrences[occurrences.length - 1].start, "MMM d, yyyy")} (${shiftCount} shifts)`
                    : format(start, "EEEE, MMMM do yyyy")

                sendShiftAssignmentEmailAction(
                    employee.email,
                    employee.name,
                    location?.name || "Unknown",
                    dateLabel,
                    format(start, "h:mm a"),
                    format(end, "h:mm a")
                ).catch(err => console.error("Failed to send shift email:", err))
            }
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
        setRepeatMode("none")
        setRepeatUntil("")
        setCustomDays([])
    }

    const toggleCustomDay = (day: string) => {
        setCustomDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        )
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
            <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
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

                    {/* Recurrence Section */}
                    <div className="border-t border-neutral-100 pt-4 mt-1">
                        <div className="flex items-center gap-2 mb-3">
                            <Repeat className="h-4 w-4 text-neutral-400" />
                            <Label className="font-bold text-xs uppercase tracking-widest text-neutral-500">Repeat</Label>
                        </div>
                        <Select value={repeatMode} onValueChange={(v) => setRepeatMode(v as RepeatMode)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Does not repeat</SelectItem>
                                <SelectItem value="daily">Every day</SelectItem>
                                <SelectItem value="weekly">Every week</SelectItem>
                                <SelectItem value="monthly">Every month</SelectItem>
                                <SelectItem value="custom">Custom days</SelectItem>
                            </SelectContent>
                        </Select>

                        {repeatMode === "custom" && (
                            <div className="mt-3 flex items-center justify-center gap-1.5">
                                {WEEKDAYS.map(day => (
                                    <button
                                        key={day.key}
                                        type="button"
                                        onClick={() => toggleCustomDay(day.key)}
                                        className={`h-9 w-9 rounded-full text-xs font-bold transition-all ${customDays.includes(day.key)
                                            ? "bg-primary text-white shadow-sm"
                                            : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                                            }`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {repeatMode !== "none" && (
                            <div className="mt-3 grid gap-2">
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-neutral-400" />
                                    <Label className="text-xs font-bold text-neutral-500">Repeat until</Label>
                                </div>
                                <Input
                                    type="date"
                                    value={repeatUntil}
                                    onChange={(e) => setRepeatUntil(e.target.value)}
                                />
                                {startTime && repeatUntil && (
                                    <p className="text-[10px] font-bold text-neutral-400">
                                        This will create {generateOccurrences(new Date(startTime), new Date(endTime || startTime)).length} shift{generateOccurrences(new Date(startTime), new Date(endTime || startTime)).length !== 1 ? "s" : ""}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <Button type="submit" disabled={loading} className="mt-2">
                        {loading ? "Scheduling..." : repeatMode !== "none" ? "Schedule Shifts" : "Schedule Shift"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
