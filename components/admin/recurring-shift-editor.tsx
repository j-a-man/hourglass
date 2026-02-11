"use client"

import { useState, useEffect } from "react"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, Save, Loader2, Info } from "lucide-react"
import { toast } from "sonner"
import { WeeklyTemplate, ShiftTemplate } from "@/lib/services/schedule-utils"
import { cn } from "@/lib/utils"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

interface RecurringShiftEditorProps {
    userId: string
    organizationId: string
    locations: any[]
}

const DEFAULT_SHIFT: ShiftTemplate = {
    enabled: false,
    start: "09:00",
    end: "17:00",
    locationId: "",
    locationName: ""
}

export function RecurringShiftEditor({ userId, organizationId, locations }: RecurringShiftEditorProps) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [template, setTemplate] = useState<WeeklyTemplate>({})

    useEffect(() => {
        const fetchTemplate = async () => {
            try {
                const docRef = doc(db, "organizations", organizationId, "weeklyTemplates", userId)
                const docSnap = await getDoc(docRef)

                if (docSnap.exists()) {
                    setTemplate(docSnap.data() as WeeklyTemplate)
                } else {
                    // Initialize with default empty slots
                    const initial: WeeklyTemplate = {}
                    DAYS.forEach(day => {
                        initial[day.toLowerCase()] = { ...DEFAULT_SHIFT }
                    })
                    setTemplate(initial)
                }
            } catch (error) {
                console.error("Error fetching template:", error)
                toast.error("Failed to load recurring schedule")
            } finally {
                setLoading(false)
            }
        }

        fetchTemplate()
    }, [userId, organizationId])

    const handleToggleDay = (dayKey: string) => {
        setTemplate(prev => ({
            ...prev,
            [dayKey]: { ...prev[dayKey], enabled: !prev[dayKey].enabled }
        }))
    }

    const handleUpdateShift = (dayKey: string, field: keyof ShiftTemplate, value: any) => {
        setTemplate(prev => {
            const updated = { ...prev[dayKey], [field]: value }

            // If updating locationId, also update locationName for convenience in views
            if (field === "locationId") {
                const loc = locations.find(l => l.id === value)
                updated.locationName = loc?.name || "Unknown"
            }

            return {
                ...prev,
                [dayKey]: updated
            }
        })
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const docRef = doc(db, "organizations", organizationId, "weeklyTemplates", userId)
            await setDoc(docRef, template)
            toast.success("Recurring schedule saved successfully")
        } catch (error) {
            console.error("Error saving template:", error)
            toast.error("Failed to save schedule")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <Card className="rounded-[32px] border-neutral-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 p-8">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl font-bold text-neutral-900 tracking-tight">Recurring Weekly Pattern</CardTitle>
                        <CardDescription className="font-medium text-neutral-500 mt-1">
                            Define the default shifts for this employee. These will automatically appear in the calendar unless overridden by a manual shift.
                        </CardDescription>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-xl px-6 h-11 bg-primary hover:bg-primary-600 shadow-lg shadow-primary/20 font-bold"
                    >
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Pattern
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10 mb-6">
                    <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs font-medium text-neutral-600 leading-relaxed">
                        Recurring shifts provide the "baseline" for the employee. If you add a one-off shift on the main schedule, it will temporarily replace these recurring hours for that specific day.
                    </p>
                </div>

                <div className="grid gap-3">
                    {DAYS.map((day) => {
                        const dayKey = day.toLowerCase()
                        const shift = template[dayKey] || DEFAULT_SHIFT

                        return (
                            <div key={day} className={cn(
                                "flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border transition-all gap-4",
                                shift.enabled ? "bg-white border-neutral-200 shadow-sm" : "bg-neutral-50/50 border-transparent opacity-60"
                            )}>
                                <div className="flex items-center gap-4 w-44">
                                    <Switch
                                        checked={shift.enabled}
                                        onCheckedChange={() => handleToggleDay(dayKey)}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                    <span className={cn("text-sm font-bold tracking-tight", shift.enabled ? "text-neutral-900" : "text-neutral-400")}>
                                        {day}
                                    </span>
                                </div>

                                {shift.enabled ? (
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1">Location</Label>
                                            <Select
                                                value={shift.locationId}
                                                onValueChange={(val) => handleUpdateShift(dayKey, "locationId", val)}
                                            >
                                                <SelectTrigger className="h-10 rounded-xl bg-neutral-50 border-transparent focus:bg-white focus:ring-primary/20 font-medium whitespace-nowrap">
                                                    <div className="flex items-center gap-2 truncate">
                                                        <MapPin className="h-3.5 w-3.5 text-primary" />
                                                        <SelectValue placeholder="Select site" />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-neutral-100 shadow-xl">
                                                    {locations.map(loc => (
                                                        <SelectItem key={loc.id} value={loc.id} className="rounded-lg font-bold">
                                                            {loc.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1">Start Time</Label>
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                                                <Input
                                                    type="time"
                                                    value={shift.start}
                                                    onChange={(e) => handleUpdateShift(dayKey, "start", e.target.value)}
                                                    className="h-10 pl-9 rounded-xl bg-neutral-50 border-transparent focus:bg-white font-bold"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1">End Time</Label>
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                                                <Input
                                                    type="time"
                                                    value={shift.end}
                                                    onChange={(e) => handleUpdateShift(dayKey, "end", e.target.value)}
                                                    className="h-10 pl-9 rounded-xl bg-neutral-50 border-transparent focus:bg-white font-bold"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <Badge variant="outline" className="h-7 px-4 rounded-full border-neutral-200 bg-neutral-100 text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                                        No Default Shift
                                    </Badge>
                                )}
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
