"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Plus, MoreHorizontal, Navigation, Globe, Shield, Search } from "lucide-react"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/auth-context"
import { LocationDialog } from "@/components/admin/location-dialog"
import { deleteDoc, doc } from "firebase/firestore"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export default function AdminLocationsPage() {
    const { userData } = useAuth()
    const [locations, setLocations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedLocation, setSelectedLocation] = useState<any>(null)

    const fetchLocations = async () => {
        if (!userData?.organizationId) return
        setLoading(true)
        try {
            const orgId = userData.organizationId
            const querySnapshot = await getDocs(query(collection(db, "organizations", orgId, "locations"), orderBy("name", "asc")))
            const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            setLocations(docs)
        } catch (error) {
            console.error("Error fetching locations:", error)
            toast.error("Failed to load locations")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLocations()
    }, [userData?.organizationId])

    const handleEdit = (loc: any) => {
        setSelectedLocation(loc)
        setIsDialogOpen(true)
    }

    const handleAdd = () => {
        setSelectedLocation(null)
        setIsDialogOpen(true)
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return
        try {
            await deleteDoc(doc(db, "organizations", userData!.organizationId!, "locations", id))
            toast.success("Location deleted")
            fetchLocations()
        } catch (error) {
            console.error("Error deleting location:", error)
            toast.error("Failed to delete location")
        }
    }

    const filteredLocations = locations.filter(loc =>
        loc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 lg:px-0 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Workplace Sites</h1>
                    <p className="text-neutral-500 font-medium">Manage your physical locations and their geofencing boundaries.</p>
                </div>
                <Button
                    onClick={handleAdd}
                    className="rounded-xl px-6 h-12 bg-primary hover:bg-primary-600 shadow-lg shadow-primary/20 font-bold"
                >
                    <Plus className="mr-2 h-5 w-5" />
                    Add New Site
                </Button>
            </div>

            <Card className="rounded-[32px] border-neutral-100 shadow-sm overflow-hidden">
                <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-3 h-4 w-4 text-neutral-400" />
                        <Input
                            placeholder="Search by name or address..."
                            className="pl-11 h-10 rounded-xl border-neutral-200 focus:ring-primary/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-neutral-50/30">
                                <TableRow className="hover:bg-transparent border-neutral-100">
                                    <TableHead className="px-8 font-bold text-neutral-400 uppercase text-[10px] tracking-widest h-12">Site Name</TableHead>
                                    <TableHead className="font-bold text-neutral-400 uppercase text-[10px] tracking-widest h-12">Address</TableHead>
                                    <TableHead className="font-bold text-neutral-400 uppercase text-[10px] tracking-widest h-12">Geofence (Radius)</TableHead>
                                    <TableHead className="font-bold text-neutral-400 uppercase text-[10px] tracking-widest h-12 text-center">Status</TableHead>
                                    <TableHead className="px-8 text-right font-bold text-neutral-400 uppercase text-[10px] tracking-widest h-12">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array(3).fill(0).map((_, i) => (
                                        <TableRow key={i} className="animate-pulse">
                                            <TableCell colSpan={5} className="py-8 px-8"><div className="h-10 bg-neutral-50 rounded-lg w-full"></div></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredLocations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-2 text-neutral-400">
                                                <MapPin className="h-10 w-10 opacity-20" />
                                                <p className="font-bold">No workplace sites found.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLocations.map((loc) => (
                                        <TableRow key={loc.id} className="hover:bg-neutral-50/50 transition-colors border-neutral-50">
                                            <TableCell className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-inner">
                                                        <Globe className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-neutral-900 leading-tight">{loc.name}</p>
                                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">ID: {loc.id.slice(0, 8)}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate text-sm font-medium text-neutral-600">
                                                {loc.address || "No address assigned"}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Navigation className="h-4 w-4 text-primary" />
                                                    <span className="text-sm font-bold text-neutral-700">{loc.geofenceRadius || 100}m</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className="rounded-full px-3 py-0.5 border-0 font-bold text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-700">
                                                    Active
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-8 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-neutral-100">
                                                            <MoreHorizontal className="h-4 w-4 text-neutral-400" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-xl border-neutral-100 shadow-xl w-48">
                                                        <DropdownMenuLabel className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-3 py-2">Management</DropdownMenuLabel>
                                                        <DropdownMenuItem
                                                            onClick={() => handleEdit(loc)}
                                                            className="rounded-lg mx-1 font-bold text-neutral-700"
                                                        >
                                                            Edit Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="rounded-lg mx-1 font-bold text-neutral-700 disabled:opacity-50">Configure Geofence</DropdownMenuItem>
                                                        <DropdownMenuItem className="rounded-lg mx-1 font-bold text-neutral-700">View Active Staff</DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-neutral-50" />
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(loc.id, loc.name)}
                                                            className="rounded-lg mx-1 font-bold text-red-600 focus:text-red-600 focus:bg-red-50"
                                                        >
                                                            Delete Site
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <LocationDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSuccess={fetchLocations}
                organizationId={userData?.organizationId || ""}
                location={selectedLocation}
            />

            {/* Site Insight */}
            <Card className="rounded-[32px] border-emerald-100 bg-emerald-50/30 p-8 flex items-center gap-6 border">
                <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                    <Shield className="h-8 w-8" />
                </div>
                <div>
                    <h4 className="font-black text-emerald-800 text-sm uppercase tracking-widest mb-1">Precision Monitoring</h4>
                    <p className="text-emerald-700 text-sm font-medium leading-relaxed max-w-2xl">
                        Geofence radius determines the "safe zone" for clock-in events. We recommend 100 meters for office buildings and 250 meters for larger industrial sites to account for GPS variance.
                    </p>
                </div>
            </Card>
        </div>
    )
}
