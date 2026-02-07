import { useEffect, useState } from "react"
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, addDoc, serverTimestamp, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { MoreHorizontal, MapPin, Mail, Calendar, Trash2, User, Bell, Users } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth-context"

interface User {
    uid: string
    name: string
    email: string
    role: string
    locationId: string
    createdAt: string
}

export function EmployeeList({ locationId, adminId, adminName }: { locationId: string, adminId: string, adminName: string }) {
    const { userData } = useAuth()
    const [employees, setEmployees] = useState<User[]>([])
    const [loading, setLoading] = useState(true)

    // Action States
    const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null)
    const [isMoveOpen, setIsMoveOpen] = useState(false)
    const [isNotifyOpen, setIsNotifyOpen] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [isSheetOpen, setIsSheetOpen] = useState(false)

    // Form States
    const [targetLocation, setTargetLocation] = useState("")
    const [notificationMsg, setNotificationMsg] = useState("")
    const [actionLoading, setActionLoading] = useState(false)

    // Locations (Hardcoded for now, ideally fetched)
    const LOCATIONS = [
        { id: "north", label: "Roslyn Pharmacy" },
        { id: "south", label: "South Store" }
    ]

    useEffect(() => {
        if (!userData?.organizationId) return
        const orgId = userData.organizationId

        const fetchEmployees = async () => {
            setLoading(true)
            try {
                const q = query(
                    collection(db, "users"),
                    where("organizationId", "==", orgId),
                    where("locationId", "==", locationId)
                )
                const querySnapshot = await getDocs(q)
                const users = querySnapshot.docs.map(doc => ({
                    ...doc.data(),
                    uid: doc.id
                })) as User[]
                setEmployees(users)
            } catch (error) {
                console.error("Error fetching employees:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchEmployees()
    }, [locationId, userData?.organizationId])

    const handleMoveEmployee = async () => {
        if (!selectedEmployee || !targetLocation) return
        setActionLoading(true)
        try {
            const ref = doc(db, "users", selectedEmployee.uid)
            await updateDoc(ref, { locationId: targetLocation })

            // UI Update: Remove from local list instead of re-fetching for speed
            setEmployees(prev => prev.filter(e => e.uid !== selectedEmployee.uid))
            toast.success(`Moved ${selectedEmployee.name} to new location`)
            setIsMoveOpen(false)
        } catch (error) {
            console.error("Move error:", error)
            toast.error("Failed to move employee")
        } finally {
            setActionLoading(false)
        }
    }

    const handleDeleteEmployee = async () => {
        if (!selectedEmployee) return
        setActionLoading(true)
        try {
            await deleteDoc(doc(db, "users", selectedEmployee.uid))
            setEmployees(prev => prev.filter(e => e.uid !== selectedEmployee.uid))
            toast.success(`Removed ${selectedEmployee.name}`)
            setIsDeleteOpen(false)
        } catch (error) {
            console.error("Delete error:", error)
            toast.error("Failed to delete employee")
        } finally {
            setActionLoading(false)
        }
    }

    const handleSendNotification = async () => {
        if (!selectedEmployee || !notificationMsg) return
        setActionLoading(true)
        try {
            const newMsg = {
                senderId: adminId,
                senderName: adminName,
                content: notificationMsg,
                createdAt: new Date() // Firestore will convert or we use serverTimestamp for 'messages' via arrayUnion but easier to just use JS date for array obj
            }

            // Create new notification thread in organization sub-collection
            if (!userData?.organizationId) return
            const orgId = userData.organizationId

            await addDoc(collection(db, "organizations", orgId, "notifications"), {
                participants: [adminId, selectedEmployee.uid],
                participantDetails: {
                    [adminId]: { name: adminName, email: "admin@example.com" },
                    [selectedEmployee.uid]: { name: selectedEmployee.name, email: selectedEmployee.email }
                },
                messages: [
                    { ...newMsg, createdAt: Timestamp.now() }
                ],
                lastUpdated: serverTimestamp(),
                readBy: [adminId]
            })

            toast.success(`Notification sent to ${selectedEmployee.name}`)
            setIsNotifyOpen(false)
            setNotificationMsg("")
        } catch (error) {
            console.error("Notification error:", error)
            toast.error("Failed to send notification")
        } finally {
            setActionLoading(false)
        }
    }

    if (loading) return <div className="text-center py-12 text-slate-400">Loading team...</div>

    if (employees.length === 0) return (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Users className="mx-auto h-12 w-12 text-slate-300 mb-2" />
            <h3 className="text-sm font-bold text-slate-600">No Employees Here</h3>
            <p className="text-xs text-slate-400">Invite users to get started.</p>
        </div>
    )

    return (
        <>
            <div className="grid grid-cols-1 gap-3">
                {employees.map((employee) => (
                    <div key={employee.uid} className="group flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Avatar className="h-10 w-10 border border-slate-100">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${employee.name}`} />
                                    <AvatarFallback>{employee.name[0]}</AvatarFallback>
                                </Avatar>
                                <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${employee.role === 'admin' ? 'bg-indigo-500' : 'bg-green-500'}`} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-slate-700">{employee.name}</h4>
                                <p className="text-xs text-slate-400 font-mono">{employee.email}</p>
                            </div>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50">
                                    <MoreHorizontal size={16} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => { setSelectedEmployee(employee); setIsSheetOpen(true) }}>
                                    <User size={14} className="mr-2" /> View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedEmployee(employee); setIsNotifyOpen(true) }}>
                                    <Bell size={14} className="mr-2" /> Notify
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedEmployee(employee); setIsMoveOpen(true) }}>
                                    <MapPin size={14} className="mr-2" /> Move Location
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setSelectedEmployee(employee); setIsDeleteOpen(true) }} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                                    <Trash2 size={14} className="mr-2" /> Remove
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))}
            </div>

            {/* --- DIALOGS & SHEET --- */}

            {/* 1. VIEW PROFILE SHEET */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Employee Profile</SheetTitle>
                    </SheetHeader>
                    {selectedEmployee && (
                        <div className="py-6 flex flex-col items-center gap-6">
                            <Avatar className="h-24 w-24 border-4 border-slate-50 shadow-xl">
                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedEmployee.name}`} />
                                <AvatarFallback className="text-2xl">{selectedEmployee.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-slate-800">{selectedEmployee.name}</h3>
                                <Badge variant="secondary" className="mt-2 text-xs">{selectedEmployee.role}</Badge>
                            </div>

                            <div className="w-full grid grid-cols-2 gap-3 mt-4">
                                <div className="p-3 bg-slate-50 rounded-lg text-center border">
                                    <div className="text-xs text-slate-400 font-bold uppercase">Store</div>
                                    <div className="font-semibold text-slate-700 capitalize">{selectedEmployee.locationId}</div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg text-center border">
                                    <div className="text-xs text-slate-400 font-bold uppercase">Joined</div>
                                    <div className="font-semibold text-slate-700">
                                        {new Date(selectedEmployee.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            <div className="w-full space-y-2 mt-2">
                                <div className="flex items-center gap-3 p-3 text-sm text-slate-600 bg-white border rounded-lg">
                                    <Mail size={16} className="text-indigo-400" />
                                    {selectedEmployee.email}
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* 2. MOVE LOCATION DIALOG */}
            <Dialog open={isMoveOpen} onOpenChange={setIsMoveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Move Employee</DialogTitle>
                        <DialogDescription>
                            Transfer <strong>{selectedEmployee?.name}</strong> to another location.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Select onValueChange={setTargetLocation}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select new location" />
                            </SelectTrigger>
                            <SelectContent>
                                {LOCATIONS.filter(l => l.id !== locationId).map(loc => (
                                    <SelectItem key={loc.id} value={loc.id}>{loc.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMoveOpen(false)}>Cancel</Button>
                        <Button onClick={handleMoveEmployee} disabled={!targetLocation || actionLoading}>
                            {actionLoading ? "Moving..." : "Move Employee"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 3. NOTIFY DIALOG */}
            <Dialog open={isNotifyOpen} onOpenChange={setIsNotifyOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send Notification</DialogTitle>
                        <DialogDescription>
                            Send a message to <strong>{selectedEmployee?.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Message..."
                            value={notificationMsg}
                            onChange={e => setNotificationMsg(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNotifyOpen(false)}>Cancel</Button>
                        <Button onClick={handleSendNotification} disabled={!notificationMsg || actionLoading}>
                            Send
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 4. DELETE DIALOG */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Remove Employee</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove <strong>{selectedEmployee?.name}</strong>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteEmployee} disabled={actionLoading}>
                            {actionLoading ? "Removing..." : "Remove Employee"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
