"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, onSnapshot, orderBy, doc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { CalendarIcon, Loader2, CheckCircle2, XCircle, Search, Clock, ShieldCheck } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

interface TimeOffRequest {
    id: string
    userId: string
    userName: string
    startDate: Timestamp
    endDate: Timestamp
    reason: string
    status: 'pending' | 'approved' | 'rejected'
    createdAt: Timestamp
    rejectionReason?: string
}

export default function AdminTimeOffPage() {
    const { user, userData } = useAuth()
    const [requests, setRequests] = useState<TimeOffRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedTab, setSelectedTab] = useState("pending")

    // Rejection Dialog State
    const [rejectId, setRejectId] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState("")
    const [actionLoading, setActionLoading] = useState(false)

    useEffect(() => {
        if (!userData?.organizationId) return
        const orgId = userData.organizationId

        // Fetch requests from organization sub-collection
        const q = query(
            collection(db, "organizations", orgId, "time_off_requests"),
            orderBy("createdAt", "desc")
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as TimeOffRequest[]
            setRequests(fetched)
            setLoading(false)
        }, (err) => {
            console.error(err)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [userData?.organizationId])

    const handleApprove = async (id: string, name: string) => {
        if (!confirm(`Approve time off for ${name}?`)) return
        if (!userData?.organizationId) return

        try {
            setActionLoading(true)
            await updateDoc(doc(db, "organizations", userData.organizationId, "time_off_requests", id), {
                status: 'approved',
                reviewedBy: user?.uid,
                reviewedAt: serverTimestamp()
            })
            toast.success(`Approved request for ${name}`)
        } catch (err) {
            toast.error("Failed to approve")
        } finally {
            setActionLoading(false)
        }
    }

    const handleReject = async () => {
        if (!rejectId || !rejectReason.trim() || !userData?.organizationId) return

        try {
            setActionLoading(true)
            await updateDoc(doc(db, "organizations", userData.organizationId, "time_off_requests", rejectId), {
                status: 'rejected',
                rejectionReason: rejectReason,
                reviewedBy: user?.uid,
                reviewedAt: serverTimestamp()
            })
            toast.success("Request rejected")
            setRejectId(null)
            setRejectReason("")
        } catch (err) {
            toast.error("Failed to reject")
        } finally {
            setActionLoading(false)
        }
    }

    const filteredRequests = requests.filter(r => {
        if (selectedTab === 'all') return true
        return r.status === selectedTab
    })

    const pendingCount = requests.filter(r => r.status === 'pending').length

    return (
        <div className="container mx-auto p-6 max-w-6xl space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Time Off Management</h1>
                    <p className="text-slate-500">Review and manage employee leave requests.</p>
                </div>
                {pendingCount > 0 && (
                    <Badge variant="destructive" className="px-3 py-1 text-sm animate-pulse">
                        {pendingCount} Pending Review
                    </Badge>
                )}
            </div>

            <Tabs defaultValue="pending" value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-4 mb-4">
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="approved">Approved</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>

                <Card className="border-slate-200">
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-12 text-center text-slate-400">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                Loading requests...
                            </div>
                        ) : filteredRequests.length === 0 ? (
                            <div className="p-12 text-center">
                                <ShieldCheck className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-slate-600">No {selectedTab} requests</h3>
                                <p className="text-slate-400">Everything is up to date.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredRequests.map((req) => (
                                    <div key={req.id} className="p-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:bg-slate-50 transition-colors">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-bold text-slate-800 text-lg">{req.userName}</h3>
                                                {req.status === 'pending' && <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200">Pending</Badge>}
                                                {req.status === 'approved' && <Badge className="bg-green-100 text-green-700 border-green-200">Approved</Badge>}
                                                {req.status === 'rejected' && <Badge className="bg-red-100 text-red-700 border-red-200">Rejected</Badge>}
                                            </div>

                                            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                                <CalendarIcon size={14} className="text-indigo-500" />
                                                <span>{req.startDate?.seconds ? format(new Date(req.startDate.seconds * 1000), "MMM d, yyyy") : "?"}</span>
                                                <span className="text-slate-300">→</span>
                                                <span>{req.endDate?.seconds ? format(new Date(req.endDate.seconds * 1000), "MMM d, yyyy") : "?"}</span>
                                            </div>

                                            <p className="text-slate-500 text-sm max-w-xl italic">"{req.reason}"</p>

                                            {req.rejectionReason && (
                                                <p className="text-red-500 text-xs mt-1">Refusal Reason: {req.rejectionReason}</p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {req.status === 'pending' && (
                                            <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0">
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700 text-white gap-1 flex-1 md:flex-none"
                                                    onClick={() => handleApprove(req.id, req.userName)}
                                                    disabled={actionLoading}
                                                >
                                                    <CheckCircle2 size={16} /> Approve
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="gap-1 flex-1 md:flex-none"
                                                    onClick={() => setRejectId(req.id)}
                                                    disabled={actionLoading}
                                                >
                                                    <XCircle size={16} /> Reject
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </Tabs>

            {/* Rejection Dialog */}
            <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Request</DialogTitle>
                        <DialogDescription>Please provide a reason for rejecting this time-off request.</DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Textarea
                            placeholder="Reason for rejection..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="resize-none"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setRejectId(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={!rejectReason.trim() || actionLoading}
                        >
                            {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
