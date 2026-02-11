"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { db } from "@/lib/firebase"
import { collection, doc, updateDoc, deleteDoc, getDocs, Timestamp, query, where } from "firebase/firestore"
import { toast } from "sonner"
import { Trash2, Save, AlertTriangle } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { format } from "date-fns"
import { EffectiveShift } from "@/lib/services/schedule-utils"

interface Location {
    id: string
    name: string
}

type SaveScope = "this" | "future" | "all"

interface EditShiftDialogProps {
    shift: EffectiveShift | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function EditShiftDialog({ shift, open, onOpenChange, onSuccess }: EditShiftDialogProps) {
    const { userData } = useAuth()
    const [loading, setLoading] = useState(false)
    const [locations, setLocations] = useState<Location[]>([])
    const [showScopeSelector, setShowScopeSelector] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [scopeAction, setScopeAction] = useState<"save" | "delete">("save")

    const [selectedLocation, setSelectedLocation] = useState("")
    const [startTime, setStartTime] = useState("")
    const [endTime, setEndTime] = useState("")

    useEffect(() => {
        if (open && shift) {
            // Pre-populate form
            setSelectedLocation(shift.locationId)
            const startStr = new Date(shift.startTime.getTime() - (shift.startTime.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
            const endStr = new Date(shift.endTime.getTime() - (shift.endTime.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
            setStartTime(startStr)
            setEndTime(endStr)
            setShowScopeSelector(false)
            setShowDeleteConfirm(false)

            fetchLocations()
        }
    }, [open, shift])

    const fetchLocations = async () => {
        if (!userData?.organizationId) return
        try {
            const locsSnap = await getDocs(collection(db, "organizations", userData.organizationId, "locations"))
            setLocations(locsSnap.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name
            })))
        } catch (error) {
            console.error("Error fetching locations:", error)
        }
    }

    const hasRecurrenceGroup = shift && !shift.isVirtual && shift.recurrenceGroupId

    const handleSaveClick = () => {
        if (hasRecurrenceGroup) {
            setScopeAction("save")
            setShowScopeSelector(true)
        } else {
            handleSave("this")
        }
    }

    const handleDeleteClick = () => {
        if (hasRecurrenceGroup) {
            setScopeAction("delete")
            setShowDeleteConfirm(true)
        } else {
            setShowDeleteConfirm(true)
        }
    }

    const handleSave = async (scope: SaveScope) => {
        if (!shift || !userData?.organizationId || shift.isVirtual) {
            toast.error("Cannot edit a recurring template shift from here")
            return
        }

        setLoading(true)
        try {
            const orgId = userData.organizationId
            const newStart = new Date(startTime)
            const newEnd = new Date(endTime)

            if (newEnd <= newStart) {
                toast.error("End time must be after start time")
                setLoading(false)
                return
            }

            const location = locations.find(l => l.id === selectedLocation)

            if (scope === "this") {
                // Update just this shift
                await updateDoc(doc(db, "organizations", orgId, "shifts", shift.id), {
                    locationId: selectedLocation,
                    locationName: location?.name || "Unknown",
                    startTime: Timestamp.fromDate(newStart),
                    endTime: Timestamp.fromDate(newEnd),
                })
                toast.success("Shift updated")
            } else {
                // Get all shifts in the recurrence group
                const groupId = shift.recurrenceGroupId
                const groupQuery = query(
                    collection(db, "organizations", orgId, "shifts"),
                    where("recurrenceGroupId", "==", groupId)
                )
                const groupSnap = await getDocs(groupQuery)

                // Calculate the time delta
                const originalStartHour = shift.startTime.getHours()
                const originalStartMin = shift.startTime.getMinutes()
                const newStartHour = newStart.getHours()
                const newStartMin = newStart.getMinutes()
                const originalEndHour = shift.endTime.getHours()
                const originalEndMin = shift.endTime.getMinutes()
                const newEndHour = newEnd.getHours()
                const newEndMin = newEnd.getMinutes()

                const updates: Promise<void>[] = []

                for (const shiftDoc of groupSnap.docs) {
                    const data = shiftDoc.data()
                    const docStartTime = data.startTime.toDate()

                    if (scope === "future" && docStartTime < shift.startTime) continue

                    // Apply the same time-of-day change to each occurrence
                    const updatedStart = new Date(docStartTime)
                    updatedStart.setHours(newStartHour, newStartMin, 0, 0)

                    const updatedEnd = new Date(docStartTime)
                    updatedEnd.setHours(newEndHour, newEndMin, 0, 0)

                    updates.push(
                        updateDoc(shiftDoc.ref, {
                            locationId: selectedLocation,
                            locationName: location?.name || "Unknown",
                            startTime: Timestamp.fromDate(updatedStart),
                            endTime: Timestamp.fromDate(updatedEnd),
                        })
                    )
                }

                await Promise.all(updates)
                toast.success(`${updates.length} shift${updates.length !== 1 ? "s" : ""} updated`)
            }

            onOpenChange(false)
            if (onSuccess) onSuccess()
        } catch (error) {
            console.error("Error updating shift:", error)
            toast.error("Failed to update shift")
        } finally {
            setLoading(false)
            setShowScopeSelector(false)
        }
    }

    const handleDelete = async (scope: SaveScope) => {
        if (!shift || !userData?.organizationId || shift.isVirtual) {
            toast.error("Cannot delete a recurring template shift from here")
            return
        }

        setLoading(true)
        try {
            const orgId = userData.organizationId

            if (scope === "this" || !hasRecurrenceGroup) {
                await deleteDoc(doc(db, "organizations", orgId, "shifts", shift.id))
                toast.success("Shift deleted")
            } else {
                const groupId = shift.recurrenceGroupId
                const groupQuery = query(
                    collection(db, "organizations", orgId, "shifts"),
                    where("recurrenceGroupId", "==", groupId)
                )
                const groupSnap = await getDocs(groupQuery)

                const deletes: Promise<void>[] = []

                for (const shiftDoc of groupSnap.docs) {
                    const data = shiftDoc.data()
                    const docStartTime = data.startTime.toDate()

                    if (scope === "future" && docStartTime < shift.startTime) continue

                    deletes.push(deleteDoc(shiftDoc.ref))
                }

                await Promise.all(deletes)
                toast.success(`${deletes.length} shift${deletes.length !== 1 ? "s" : ""} deleted`)
            }

            onOpenChange(false)
            if (onSuccess) onSuccess()
        } catch (error) {
            console.error("Error deleting shift:", error)
            toast.error("Failed to delete shift")
        } finally {
            setLoading(false)
            setShowDeleteConfirm(false)
        }
    }

    if (!shift) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <span>Edit Shift</span>
                        <span className="text-xs font-bold text-neutral-400 bg-neutral-100 rounded-lg px-2.5 py-1 uppercase tracking-widest">
                            {shift.userName}
                        </span>
                    </DialogTitle>
                </DialogHeader>

                {/* Scope Selector Overlay */}
                {showScopeSelector && (
                    <div className="space-y-4 py-2">
                        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                            <p className="text-sm font-medium text-amber-800">
                                This shift is part of a recurring series. Which shifts do you want to update?
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Button
                                variant="outline"
                                className="w-full justify-start h-12 rounded-xl font-bold"
                                onClick={() => handleSave("this")}
                                disabled={loading}
                            >
                                Just this shift
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start h-12 rounded-xl font-bold"
                                onClick={() => handleSave("future")}
                                disabled={loading}
                            >
                                This and future shifts
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start h-12 rounded-xl font-bold"
                                onClick={() => handleSave("all")}
                                disabled={loading}
                            >
                                All shifts in this series
                            </Button>
                        </div>
                        <Button
                            variant="ghost"
                            className="w-full text-neutral-400"
                            onClick={() => setShowScopeSelector(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                )}

                {/* Delete Confirmation Overlay */}
                {showDeleteConfirm && (
                    <div className="space-y-4 py-2">
                        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                            <Trash2 className="h-5 w-5 text-red-500 shrink-0" />
                            <p className="text-sm font-medium text-red-800">
                                {hasRecurrenceGroup
                                    ? "This shift is part of a recurring series. Which shifts do you want to delete?"
                                    : "Are you sure you want to delete this shift?"}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Button
                                variant="outline"
                                className="w-full justify-start h-12 rounded-xl font-bold text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleDelete("this")}
                                disabled={loading}
                            >
                                {hasRecurrenceGroup ? "Just this shift" : "Yes, delete this shift"}
                            </Button>
                            {hasRecurrenceGroup && (
                                <>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start h-12 rounded-xl font-bold text-red-600 border-red-200 hover:bg-red-50"
                                        onClick={() => handleDelete("future")}
                                        disabled={loading}
                                    >
                                        This and future shifts
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start h-12 rounded-xl font-bold text-red-600 border-red-200 hover:bg-red-50"
                                        onClick={() => handleDelete("all")}
                                        disabled={loading}
                                    >
                                        All shifts in this series
                                    </Button>
                                </>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            className="w-full text-neutral-400"
                            onClick={() => setShowDeleteConfirm(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                )}

                {/* Edit Form */}
                {!showScopeSelector && !showDeleteConfirm && (
                    <div className="grid gap-4 py-4">
                        {shift.isVirtual && (
                            <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                                <AlertTriangle className="h-5 w-5 text-neutral-400 shrink-0" />
                                <p className="text-sm font-medium text-neutral-600">
                                    This is a recurring template shift. Editing it here will create a one-off override for this date only.
                                </p>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Employee</Label>
                            <div className="h-10 flex items-center px-3 bg-neutral-50 rounded-lg border border-neutral-200 text-sm font-bold text-neutral-600">
                                {shift.userName}
                            </div>
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

                        <div className="flex gap-3 mt-2">
                            <Button
                                variant="outline"
                                className="flex-1 h-11 rounded-xl font-bold text-red-500 border-red-200 hover:bg-red-50"
                                onClick={handleDeleteClick}
                                disabled={loading || shift.isVirtual}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </Button>
                            <Button
                                className="flex-1 h-11 rounded-xl font-bold"
                                onClick={handleSaveClick}
                                disabled={loading}
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {loading ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
