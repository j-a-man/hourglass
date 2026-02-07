"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, User, MoreHorizontal, Mail, MapPin, Shield, Search, Filter } from "lucide-react"
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { InviteStaffDialog } from "@/components/admin/invite-staff-dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/auth-context"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"
import { Settings, RefreshCcw, Trash2, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react"

export default function EmployeesPage() {
    const { userData } = useAuth()
    const router = useRouter()
    const [employees, setEmployees] = useState<any[]>([])
    const [locations, setLocations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [roleFilter, setRoleFilter] = useState<string>("all")
    const [locationFilter, setLocationFilter] = useState<string>("all")
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
    const [isTroubleshootOpen, setIsTroubleshootOpen] = useState(false)
    const [diagResult, setDiagResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)
    const [scrubEmail, setScrubEmail] = useState("")
    const [isScrubbing, setIsScrubbing] = useState(false)
    const [isChecking, setIsChecking] = useState(false)

    const handleCheckConfig = async () => {
        setIsChecking(true)
        setDiagResult(null)
        try {
            const { checkFirebaseAdminConfigAction } = await import("@/app/actions/auth-actions")
            const result = await checkFirebaseAdminConfigAction()
            setDiagResult(result)
        } catch (error) {
            setDiagResult({ success: false, error: "Unexpected error running check" })
        } finally {
            setIsChecking(false)
        }
    }

    const handleScrubGhost = async () => {
        if (!scrubEmail) return
        setIsScrubbing(true)
        try {
            const { scrubGhostUserAction } = await import("@/app/actions/auth-actions")
            const result = await scrubGhostUserAction(scrubEmail)
            if (result.success) {
                toast.success(result.message)
                setScrubEmail("")
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error("Cleanup failed")
        } finally {
            setIsScrubbing(false)
        }
    }

    useEffect(() => {
        const fetchData = async () => {
            if (!userData?.organizationId) return
            const orgId = userData.organizationId
            try {
                // Fetch employees for this organization
                const empSnapshot = await getDocs(query(
                    collection(db, "users"),
                    where("organizationId", "==", orgId),
                    orderBy("name", "asc")
                ))
                setEmployees(empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))

                // Fetch locations from organization sub-collection
                const locSnapshot = await getDocs(query(
                    collection(db, "organizations", orgId, "locations"),
                    orderBy("name", "asc")
                ))
                setLocations(locSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            } catch (error) {
                console.error("Error fetching data:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [userData?.organizationId])

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.email?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesRole = roleFilter === "all" || emp.role === roleFilter
        const matchesLocation = locationFilter === "all" || emp.locationId === locationFilter
        return matchesSearch && matchesRole && matchesLocation
    })

    const getLocationName = (locationId?: string) => {
        if (!locationId) return "Unassigned"
        return locations.find(l => l.id === locationId)?.name || "Unknown Location"
    }

    const handleToggleStatus = async (employeeId: string, currentStatus: string) => {
        const newStatus = currentStatus === "inactive" ? "active" : "inactive"
        const action = newStatus === "active" ? "activated" : "deactivated"

        try {
            const userRef = doc(db, "users", employeeId)
            await updateDoc(userRef, {
                status: newStatus
            })

            // Update local state
            setEmployees(prev => prev.map(emp =>
                emp.id === employeeId ? { ...emp, status: newStatus } : emp
            ))

            toast.success(`Staff member ${action} successfully`)
        } catch (error) {
            console.error("Error updating status:", error)
            toast.error(`Failed to ${newStatus === "active" ? "activate" : "deactivate"} staff member`)
        }
    }

    const handleDeleteStaff = async (employeeId: string, employeeName: string, employeeEmail: string) => {
        if (!confirm(`Are you sure you want to permanently remove ${employeeName} from the business? This action cannot be undone.`)) {
            return
        }

        try {
            const { deleteUserAction } = await import("@/app/actions/auth-actions")
            const result = await deleteUserAction(employeeId, employeeEmail)

            if (result.success) {
                setEmployees(prev => prev.filter(emp => emp.id !== employeeId))
                toast.success(`${employeeName} has been removed from the business`)
            } else {
                toast.error(result.error || "Failed to remove staff member")
            }
        } catch (error) {
            console.error("Error deleting staff:", error)
            toast.error("An unexpected error occurred")
        }
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 lg:px-0 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Staff Directory</h1>
                    <p className="text-neutral-500 font-medium">Manage permissions, roles, and assigned locations for your team.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        className="rounded-xl px-4 h-12 text-neutral-500 font-bold hover:bg-neutral-100"
                        onClick={() => setIsTroubleshootOpen(true)}
                    >
                        <Settings className="mr-2 h-5 w-5" />
                        Troubleshoot
                    </Button>
                    <Button
                        className="rounded-xl px-6 h-12 bg-primary hover:bg-primary-600 shadow-lg shadow-primary/20 font-bold"
                        onClick={() => setIsInviteDialogOpen(true)}
                    >
                        <Plus className="mr-2 h-5 w-5" />
                        Invite Staff Member
                    </Button>
                </div>
            </div>

            <Card className="rounded-[32px] border-neutral-100 shadow-sm overflow-hidden">
                <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-3 h-4 w-4 text-neutral-400" />
                        <Input
                            placeholder="Search by name or email..."
                            className="pl-11 h-10 rounded-xl border-neutral-200 focus:ring-primary/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="rounded-xl border-neutral-200 font-bold text-neutral-600 h-10 px-4">
                                    <MapPin className="mr-2 h-4 w-4 text-neutral-400" />
                                    {locationFilter === "all" ? "All Locations" : (locations.find(l => l.id === locationFilter)?.name || "Location")}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-neutral-100 shadow-xl w-48 max-h-[300px] overflow-y-auto">
                                <DropdownMenuLabel className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-3 py-2">Filter by Location</DropdownMenuLabel>
                                <DropdownMenuItem className="rounded-lg mx-1 font-bold text-neutral-700" onClick={() => setLocationFilter("all")}>All Locations</DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-neutral-50" />
                                {locations.map(loc => (
                                    <DropdownMenuItem key={loc.id} className="rounded-lg mx-1 font-bold text-neutral-700" onClick={() => setLocationFilter(loc.id)}>
                                        {loc.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="rounded-xl border-neutral-200 font-bold text-neutral-600 h-10 px-4">
                                    <Filter className="mr-2 h-4 w-4 text-neutral-400" />
                                    {roleFilter === "all" ? "All Roles" : roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-neutral-100 shadow-xl w-48">
                                <DropdownMenuLabel className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-3 py-2">Filter by Role</DropdownMenuLabel>
                                <DropdownMenuItem className="rounded-lg mx-1 font-bold text-neutral-700" onClick={() => setRoleFilter("all")}>All Roles</DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-neutral-50" />
                                <DropdownMenuItem className="rounded-lg mx-1 font-bold text-neutral-700" onClick={() => setRoleFilter("admin")}>Administrators</DropdownMenuItem>
                                <DropdownMenuItem className="rounded-lg mx-1 font-bold text-neutral-700" onClick={() => setRoleFilter("employee")}>Employees</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-neutral-50/30">
                            <TableRow className="hover:bg-transparent border-neutral-100">
                                <TableHead className="px-8 font-bold text-neutral-400 uppercase text-[10px] tracking-widest h-12">Staff Member</TableHead>
                                <TableHead className="font-bold text-neutral-400 uppercase text-[10px] tracking-widest h-12">Role & Access</TableHead>
                                <TableHead className="font-bold text-neutral-400 uppercase text-[10px] tracking-widest h-12">Location</TableHead>
                                <TableHead className="font-bold text-neutral-400 uppercase text-[10px] tracking-widest h-12">Status</TableHead>
                                <TableHead className="px-8 text-right font-bold text-neutral-400 uppercase text-[10px] tracking-widest h-12">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <TableRow key={i} className="animate-pulse">
                                        <TableCell colSpan={5} className="py-8 px-8"><div className="h-10 bg-neutral-50 rounded-lg w-full"></div></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredEmployees.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-2 text-neutral-400">
                                            <User className="h-10 w-10 opacity-20" />
                                            <p className="font-bold">No staff members found matching your search.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredEmployees.map((employee) => (
                                    <TableRow key={employee.id} className="hover:bg-neutral-50/50 transition-colors border-neutral-50">
                                        <TableCell className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shadow-inner">
                                                    {employee.name?.[0] || employee.email?.[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-neutral-900 leading-tight">{employee.name}</p>
                                                    <p className="text-xs text-neutral-500 font-medium">{employee.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500">
                                                    <Shield className="h-3 w-3" />
                                                </div>
                                                <span className="text-sm font-bold text-neutral-700 capitalize">{employee.role}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-neutral-500">
                                                <MapPin className="h-4 w-4" />
                                                <span className="text-sm font-bold text-neutral-700">{getLocationName(employee.locationId)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cn(
                                                "rounded-full px-3 py-0.5 border-0 font-bold text-[10px] uppercase tracking-wider",
                                                employee.status === 'inactive'
                                                    ? "bg-neutral-100 text-neutral-500"
                                                    : "bg-emerald-100 text-emerald-700"
                                            )}>
                                                {employee.status || 'Active'}
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
                                                        className="rounded-lg mx-1 font-bold text-neutral-700"
                                                        onClick={() => router.push(`/dashboard/admin/employees/${employee.id}`)}
                                                    >
                                                        View Profile
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="rounded-lg mx-1 font-bold text-neutral-700"
                                                        onClick={() => router.push(`/dashboard/admin/employees/${employee.id}?tab=permissions`)}
                                                    >
                                                        Edit Permissions
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="rounded-lg mx-1 font-bold text-neutral-700"
                                                        onClick={() => router.push(`/dashboard/admin/employees/${employee.id}?tab=hours`)}
                                                    >
                                                        Assigned Hours
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-neutral-50" />
                                                    <DropdownMenuItem
                                                        className={cn(
                                                            "rounded-lg mx-1 font-bold",
                                                            employee.status === "inactive" ? "text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50" : "text-red-600 focus:text-red-600 focus:bg-red-50"
                                                        )}
                                                        onClick={() => handleToggleStatus(employee.id, employee.status || 'active')}
                                                    >
                                                        {employee.status === "inactive" ? "Activate Staff" : "Deactivate Staff"}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="rounded-lg mx-1 font-bold text-red-600 focus:text-red-600 focus:bg-red-50"
                                                        onClick={() => handleDeleteStaff(employee.id, employee.name, employee.email)}
                                                    >
                                                        Remove from Business
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <InviteStaffDialog
                open={isInviteDialogOpen}
                onOpenChange={setIsInviteDialogOpen}
                onSuccess={() => {
                    // Refresh employees list (optional if you want to show pending invites)
                }}
            />

            <Dialog open={isTroubleshootOpen} onOpenChange={setIsTroubleshootOpen}>
                <DialogContent className="max-w-2xl rounded-[32px] p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-neutral-900 tracking-tight">System Troubleshooting</DialogTitle>
                        <DialogDescription className="font-medium text-neutral-500">
                            Use these tools to diagnose setup issues or clear stuck accounts.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-8 py-4">
                        {/* Diagnostics Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-widest">1. Configuration Check</h3>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-lg font-bold"
                                    onClick={handleCheckConfig}
                                    disabled={isChecking}
                                >
                                    {isChecking ? <RefreshCcw className="h-4 w-4 animate-spin" /> : "Verify Setup"}
                                </Button>
                            </div>

                            {diagResult && (
                                <Alert className={cn(
                                    "rounded-2xl border-0 shadow-sm transition-all",
                                    diagResult.success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
                                )}>
                                    {diagResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                    <AlertTitle className="font-bold">{diagResult.success ? "Verification Successful" : "Verification Failed"}</AlertTitle>
                                    <AlertDescription className="font-medium text-sm mt-1">
                                        {diagResult.message || diagResult.error}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {!diagResult && (
                                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 text-xs text-neutral-500 font-medium">
                                    This will check if your `.env.local` keys are present and correctly formatted.
                                </div>
                            )}
                        </div>

                        {/* Ghost Scrubbing Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-widest">2. Clear "Ghost" Accounts</h3>
                            <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                                If a user gets "Email already in use" but isn't in your staff directory, enter their email below to scrub them from the system permanently.
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="ghost-user@email.com"
                                    className="rounded-xl h-12 bg-neutral-50 border-transparent focus:bg-white"
                                    value={scrubEmail}
                                    onChange={(e) => setScrubEmail(e.target.value)}
                                />
                                <Button
                                    className="rounded-xl px-6 h-12 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 font-bold"
                                    onClick={handleScrubGhost}
                                    disabled={isScrubbing || !scrubEmail}
                                >
                                    {isScrubbing ? <RefreshCcw className="h-4 w-4 animate-spin" /> : "Scrub Email"}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsTroubleshootOpen(false)} className="rounded-xl font-bold">
                            Close Tools
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
