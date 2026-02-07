"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
    User,
    Shield,
    Clock,
    ChevronLeft,
    Mail,
    MapPin,
    Calendar,
    Save,
    AlertCircle,
    FileText
} from "lucide-react"
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/components/auth-context"

export default function EmployeeDetailPage() {
    const { userData: adminData } = useAuth()
    const { id } = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const defaultTab = searchParams.get("tab") || "profile"

    const [employee, setEmployee] = useState<any>(null)
    const [locations, setLocations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [assignedLocationId, setAssignedLocationId] = useState<string>("none")
    const [assignedRole, setAssignedRole] = useState<string>("employee")

    useEffect(() => {
        const fetchData = async () => {
            if (!adminData?.organizationId) return
            const orgId = adminData.organizationId

            try {
                // Fetch employee
                const docRef = doc(db, "users", id as string)
                const docSnap = await getDoc(docRef)
                if (docSnap.exists()) {
                    const data = docSnap.data()

                    // Security check: ensure employee belongs to admin's organization
                    if (data.organizationId !== orgId) {
                        toast.error("You do not have permission to view this profile")
                        router.push("/dashboard/admin/employees")
                        return
                    }

                    setEmployee({ id: docSnap.id, ...data })
                    setAssignedLocationId(data.locationId || "none")
                    setAssignedRole(data.role || "employee")
                } else {
                    toast.error("Employee not found")
                    router.push("/dashboard/admin/employees")
                    return
                }

                // Fetch locations from organization sub-collection
                const locSnapshot = await getDocs(collection(db, "organizations", orgId, "locations"))
                setLocations(locSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            } catch (error) {
                console.error("Error fetching data:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [id, router, adminData?.organizationId])

    const handleUpdateLocation = async () => {
        setSaving(true)
        try {
            const userRef = doc(db, "users", id as string)
            await updateDoc(userRef, {
                locationId: assignedLocationId === "none" ? null : assignedLocationId
            })
            toast.success("Workplace updated successfully")
            setEmployee((prev: any) => ({ ...prev, locationId: assignedLocationId === "none" ? null : assignedLocationId }))
        } catch (error) {
            console.error("Error updating location:", error)
            toast.error("Failed to update workplace")
        } finally {
            setSaving(false)
        }
    }

    const handleUpdateRole = async () => {
        setSaving(true)
        try {
            const userRef = doc(db, "users", id as string)
            await updateDoc(userRef, {
                role: assignedRole
            })
            toast.success("User role updated successfully")
            setEmployee((prev: any) => ({ ...prev, role: assignedRole }))
        } catch (error) {
            console.error("Error updating role:", error)
            toast.error("Failed to update role")
        } finally {
            setSaving(false)
        }
    }

    const getLocationName = (locationId?: string) => {
        if (!locationId) return "Not Assigned"
        return locations.find(l => l.id === locationId)?.name || locationId
    }

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        )
    }

    if (!employee) return null

    return (
        <div className="space-y-8 max-w-5xl mx-auto px-4 lg:px-0 pb-12">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="rounded-xl hover:bg-neutral-100"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">{employee.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-primary/10 text-primary border-0 font-bold text-[10px] uppercase">
                            {employee.role}
                        </Badge>
                        <span className="text-neutral-400 text-sm font-medium">Employee ID: {employee.id.slice(0, 8)}</span>
                    </div>
                </div>
            </div>

            <Tabs defaultValue={defaultTab} className="space-y-8">
                <TabsList className="bg-white p-1 rounded-2xl border border-neutral-100 h-14 shadow-sm w-full md:w-auto">
                    <TabsTrigger value="profile" className="rounded-xl px-8 h-full font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                        <User className="mr-2 h-4 w-4" /> Profile
                    </TabsTrigger>
                    <TabsTrigger value="permissions" className="rounded-xl px-8 h-full font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                        <Shield className="mr-2 h-4 w-4" /> Permissions
                    </TabsTrigger>
                    <TabsTrigger value="hours" className="rounded-xl px-8 h-full font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                        <Clock className="mr-2 h-4 w-4" /> Hours
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-8">
                    <Card className="rounded-[32px] border-neutral-100 shadow-sm overflow-hidden">
                        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 p-8">
                            <CardTitle className="text-lg font-bold text-neutral-900">Personal Information</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">Full Name</Label>
                                    <Input defaultValue={employee.name} className="h-12 rounded-xl bg-neutral-50 border-transparent focus:bg-white focus:ring-primary/20" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">Email Address</Label>
                                    <Input defaultValue={employee.email} className="h-12 rounded-xl bg-neutral-50 border-transparent focus:bg-white focus:ring-primary/20" />
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">Primary Workplace</Label>
                                        <Select value={assignedLocationId} onValueChange={setAssignedLocationId} disabled={saving}>
                                            <SelectTrigger className="h-12 rounded-xl bg-neutral-50 border-transparent focus:bg-white focus:ring-primary/20 font-medium text-neutral-900">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 text-primary" />
                                                    <SelectValue placeholder="Select a location" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-neutral-100 shadow-xl">
                                                <SelectItem value="none" className="rounded-lg font-bold py-3 text-neutral-500">Not Assigned</SelectItem>
                                                {locations.map(loc => (
                                                    <SelectItem key={loc.id} value={loc.id} className="rounded-lg font-bold py-3">
                                                        {loc.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        className="w-full h-11 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 font-bold transition-all border-0 shadow-none"
                                        onClick={handleUpdateLocation}
                                        disabled={saving || assignedLocationId === (employee.locationId || "none")}
                                    >
                                        {saving ? "Updating..." : "Update Workplace"}
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">Join Date</Label>
                                    <div className="flex h-12 items-center bg-neutral-50 rounded-xl px-4 text-sm font-medium text-neutral-700">
                                        <Calendar className="mr-2 h-4 w-4 text-neutral-400" />
                                        {employee.createdAt ? new Date(employee.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </TabsContent>

                <TabsContent value="permissions" className="space-y-8">
                    <Card className="rounded-[32px] border-neutral-100 shadow-sm overflow-hidden">
                        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 p-8">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-bold text-neutral-900">System Access Level</CardTitle>
                                <Badge className={cn(
                                    "font-bold text-xs px-3 py-1 rounded-full border-0",
                                    employee.role === "admin"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-emerald-100 text-emerald-700"
                                )}>
                                    {employee.role === "admin" ? "Administrator" : "Employee"}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <Alert className="border-amber-200 bg-amber-50/50">
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                                <AlertDescription className="text-amber-800 text-sm font-medium">
                                    Changing the account type will immediately update their dashboard access and permissions.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">Account Type</Label>
                                <Select value={assignedRole} onValueChange={setAssignedRole} disabled={saving}>
                                    <SelectTrigger className="h-12 rounded-xl bg-neutral-50 border-transparent focus:bg-white focus:ring-primary/20 font-medium text-neutral-900">
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-primary" />
                                            <SelectValue placeholder="Select account type" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-neutral-100 shadow-xl">
                                        <SelectItem value="employee" className="rounded-lg font-bold py-3 text-neutral-800">
                                            <div className="flex flex-col">
                                                <span className="font-bold flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                                    Employee
                                                </span>
                                                <span className="text-[10px] text-neutral-400 font-medium ml-4">Can clock in/out and view own history</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="admin" className="rounded-lg font-bold py-3 text-neutral-800">
                                            <div className="flex flex-col">
                                                <span className="font-bold flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                                                    Administrator
                                                </span>
                                                <span className="text-[10px] text-neutral-400 font-medium ml-4">Full access to reports, settings & team</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                className="w-full h-12 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold transition-all shadow-md mt-4"
                                onClick={handleUpdateRole}
                                disabled={saving || assignedRole === employee.role}
                            >
                                {saving ? "Updating Account..." : "Confirm & Save Account Type"}
                            </Button>

                            <p className="text-sm text-neutral-400 italic font-medium pt-4 border-t border-neutral-100">
                                More granular permissions for scheduling and payroll will be available in the next update.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="hours" className="space-y-8">
                    <Card className="rounded-[32px] border-neutral-100 shadow-sm overflow-hidden">
                        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 p-8">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-bold text-neutral-900">Weekly Shift Performance</CardTitle>
                                <Button variant="outline" className="rounded-xl font-bold h-10 border-neutral-200">
                                    <FileText className="mr-2 h-4 w-4" /> Export logs
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-neutral-50 p-6 rounded-3xl border border-neutral-100">
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Total Hours (MTD)</p>
                                    <p className="text-2xl font-black text-neutral-900 tracking-tighter">142.5h</p>
                                </div>
                                <div className="bg-neutral-50 p-6 rounded-3xl border border-neutral-100">
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">On-Time Percentage</p>
                                    <p className="text-2xl font-black text-neutral-900 tracking-tighter">96.8%</p>
                                </div>
                                <div className="bg-neutral-50 p-6 rounded-3xl border border-neutral-100">
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Overtime Accumulation</p>
                                    <p className="text-2xl font-black text-emerald-600 tracking-tighter">+12.2h</p>
                                </div>
                            </div>

                            <div className="h-40 border-2 border-dashed border-neutral-100 rounded-3xl flex items-center justify-center text-neutral-300">
                                <div className="flex flex-col items-center gap-2">
                                    <Clock className="h-8 w-8 opacity-20" />
                                    <p className="text-sm font-bold opacity-30">Detailed attendance log loading...</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
