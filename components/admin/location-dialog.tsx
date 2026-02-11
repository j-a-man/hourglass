"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Clock, Navigation, Save, Loader2, LocateFixed, Info } from "lucide-react"
import { doc, updateDoc, collection, addDoc, serverTimestamp, deleteField } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface OperatingHours {
    isOpen: boolean;
    open: string;
    close: string;
}

interface WeeklyHours {
    [key: string]: OperatingHours;
}

interface LocationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    organizationId: string;
    location?: any; // If provided, we are editing
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

const DEFAULT_HOURS: WeeklyHours = DAYS.reduce((acc, day) => ({
    ...acc,
    [day.toLowerCase()]: { isOpen: true, open: "09:00", close: "17:00" }
}), {})

export function LocationDialog({ isOpen, onClose, onSuccess, organizationId, location }: LocationDialogProps) {
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState("")
    const [address, setAddress] = useState("")
    const [radius, setRadius] = useState(100)
    const [lat, setLat] = useState("")
    const [lng, setLng] = useState("")
    const [hours, setHours] = useState<WeeklyHours>(DEFAULT_HOURS)
    const [activeTab, setActiveTab] = useState("general")

    useEffect(() => {
        if (location) {
            setName(location.name || "")
            setAddress(location.address || "")
            setRadius(location.geofenceRadius || 100)
            setLat((location.coordinates?.latitude ?? location.coords?.latitude ?? "").toString())
            setLng((location.coordinates?.longitude ?? location.coords?.longitude ?? "").toString())
            setHours(location.operatingHours || DEFAULT_HOURS)
        } else {
            setName("")
            setAddress("")
            setRadius(100)
            setLat("")
            setLng("")
            setHours(DEFAULT_HOURS)
        }
        setActiveTab("general")
    }, [location, isOpen])

    const handleSave = async () => {
        // Basic Validation
        if (!name || !lat || !lng) {
            toast.error("Please provide a name and coordinates")
            return
        }

        const finalLat = Number(lat)
        const finalLng = Number(lng)

        if (isNaN(finalLat) || isNaN(finalLng)) {
            toast.error("Coordinates must be valid numbers")
            return
        }

        if (!organizationId) {
            toast.error("Organization ID is missing. Please refresh.")
            console.error("[LocationDialog] organizationId is empty in props")
            return
        }

        setLoading(true)
        console.log(`[LocationDialog] Saving ${name} to org: ${organizationId}`)

        try {
            const locationData: any = {
                name,
                address,
                geofenceRadius: Number(radius),
                coordinates: {
                    latitude: finalLat,
                    longitude: finalLng
                },
                operatingHours: hours,
                updatedAt: serverTimestamp(),
                status: "active",
                // Explicitly clear legacy field if it exists
                coords: deleteField()
            }

            if (!location) {
                delete locationData.coords;
            }

            if (location) {
                console.log(`[LocationDialog] Updating existing location: ${location.id}`)
                const locRef = doc(db, "organizations", organizationId, "locations", location.id)
                await updateDoc(locRef, locationData)
                toast.success("Location updated successfully")
            } else {
                console.log(`[LocationDialog] Creating new location`)
                const colRef = collection(db, "organizations", organizationId, "locations")
                await addDoc(colRef, {
                    ...locationData,
                    createdAt: serverTimestamp()
                })
                toast.success("New location created")
            }
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error("Critical Error saving location:", error)
            toast.error(`Firebase Error: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    const fetchCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported")
            return
        }

        toast.promise(
            new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        setLat(position.coords.latitude.toString())
                        setLng(position.coords.longitude.toString())
                        resolve(position)
                    },
                    (error) => reject(error),
                    { enableHighAccuracy: true }
                )
            }),
            {
                loading: 'Fetching coordinates...',
                success: 'Coordinates updated!',
                error: (err) => `Error: ${err.message}`
            }
        )
    }

    const toggleDay = (day: string) => {
        setHours(prev => ({
            ...prev,
            [day]: { ...prev[day], isOpen: !prev[day].isOpen }
        }))
    }

    const updateTime = (day: string, type: 'open' | 'close', value: string) => {
        setHours(prev => ({
            ...prev,
            [day]: { ...prev[day], [type]: value }
        }))
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] md:max-w-3xl rounded-[32px] border-neutral-100 shadow-2xl p-0 overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]">
                <DialogHeader className="p-8 pb-4">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <MapPin className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-2xl font-bold text-neutral-900 tracking-tight">
                            {location ? "Site Configuration" : "New Workplace Site"}
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-neutral-500 font-medium ml-13">
                        Configure site details, precision coordinates, and daily schedules.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 bg-neutral-50/20">
                    <div className="px-8 border-b border-neutral-100 bg-white">
                        <TabsList className="bg-transparent h-12 p-0 gap-8">
                            <TabsTrigger
                                value="general"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-12 text-sm font-bold text-neutral-400 data-[state=active]:text-primary transition-all"
                            >
                                General Details
                            </TabsTrigger>
                            <TabsTrigger
                                value="hours"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-12 text-sm font-bold text-neutral-400 data-[state=active]:text-primary transition-all"
                            >
                                Hours of Operation
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 pt-6 min-h-0">
                        <TabsContent value="general" className="mt-0 space-y-8 animate-in fade-in-50 duration-300">
                            {/* Basic Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-black text-neutral-400 uppercase tracking-widest px-1">Location Name</Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Main Street Branch"
                                        className="h-12 rounded-xl bg-white border-neutral-100 focus:bg-white focus:ring-primary/20 transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-black text-neutral-400 uppercase tracking-widest px-1">Physical Address</Label>
                                    <Input
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="123 Health Ave, Suite 100"
                                        className="h-12 rounded-xl bg-white border-neutral-100 focus:bg-white focus:ring-primary/20 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            {/* Coordinates section */}
                            <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="flex items-center gap-2 text-xs font-black text-neutral-900 uppercase tracking-wider">
                                        <Navigation className="h-4 w-4 text-primary" />
                                        Geofencing Precision
                                    </h4>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={fetchCurrentLocation}
                                        className="h-8 rounded-lg bg-white border-neutral-200 text-xs font-bold hover:bg-primary/5 hover:text-primary hover:border-primary/20"
                                    >
                                        <LocateFixed className="mr-2 h-3 w-3" />
                                        Fetch Current
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight">Latitude</Label>
                                        <Input
                                            type="number"
                                            value={lat}
                                            onChange={(e) => setLat(e.target.value)}
                                            placeholder="40.7128"
                                            className="h-10 rounded-lg bg-neutral-50 border-transparent focus:bg-white focus:ring-primary/20 font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight">Longitude</Label>
                                        <Input
                                            type="number"
                                            value={lng}
                                            onChange={(e) => setLng(e.target.value)}
                                            placeholder="-74.0060"
                                            className="h-10 rounded-lg bg-neutral-50 border-transparent focus:bg-white focus:ring-primary/20 font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight">Radius (meters)</Label>
                                        <Input
                                            type="number"
                                            value={radius}
                                            onChange={(e) => setRadius(Number(e.target.value))}
                                            className="h-10 rounded-lg bg-neutral-50 border-transparent focus:bg-white focus:ring-primary/20 font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                                    <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                    <p className="text-[11px] font-medium text-neutral-600 leading-normal">
                                        Radius defines the geofencing boundary. Clock-ins are only permitted within this distance. Recommended: 100m.
                                    </p>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="hours" className="mt-0 space-y-4 animate-in fade-in-50 duration-300">
                            <div className="grid gap-3 pb-8">
                                {DAYS.map((day) => {
                                    const dayKey = day.toLowerCase()
                                    const dayHours = hours[dayKey]
                                    return (
                                        <div key={day} className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border transition-all",
                                            dayHours.isOpen ? "bg-white border-neutral-200 shadow-sm" : "bg-neutral-50/50 border-transparent opacity-60"
                                        )}>
                                            <div className="flex items-center gap-4 w-36">
                                                <Switch
                                                    checked={dayHours.isOpen}
                                                    onCheckedChange={() => toggleDay(dayKey)}
                                                    className="data-[state=checked]:bg-primary"
                                                />
                                                <span className={cn("text-sm font-bold", dayHours.isOpen ? "text-neutral-900" : "text-neutral-400")}>{day}</span>
                                            </div>

                                            {dayHours.isOpen ? (
                                                <div className="flex items-center gap-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[10px] font-black text-neutral-300 uppercase tracking-widest px-1">Open</span>
                                                            <Input
                                                                type="time"
                                                                value={dayHours.open}
                                                                onChange={(e) => updateTime(dayKey, 'open', e.target.value)}
                                                                className="h-10 w-32 rounded-lg border-neutral-200 bg-white text-sm font-bold focus:ring-primary/20"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[10px] font-black text-neutral-300 uppercase tracking-widest px-1">Close</span>
                                                            <Input
                                                                type="time"
                                                                value={dayHours.close}
                                                                onChange={(e) => updateTime(dayKey, 'close', e.target.value)}
                                                                className="h-10 w-32 rounded-lg border-neutral-200 bg-white text-sm font-bold focus:ring-primary/20"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] uppercase font-black text-neutral-400 bg-neutral-100 border-0 px-3">Closed</Badge>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                <DialogFooter className="p-8 border-t border-neutral-100 bg-white">
                    <div className="flex w-full gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 h-12 rounded-xl border-neutral-200 font-bold hover:bg-neutral-50 text-neutral-600"
                        >
                            Discard Changes
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex-[2] h-12 rounded-xl bg-primary hover:bg-primary-600 text-white font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <Save className="mr-2 h-5 w-5" />
                                    {location ? "Save Site Changes" : "Create Workplace Site"}
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
