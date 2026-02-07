"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, Timestamp } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Loader2, Plus, Clock, CheckCircle2, XCircle } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface TimeOffRequest {
    id: string
    startDate: Timestamp
    endDate: Timestamp
    reason: string
    status: 'pending' | 'approved' | 'rejected'
    createdAt: Timestamp
    reviewedBy?: string
    reviewedAt?: Timestamp
    rejectionReason?: string
}

export default function EmployeeTimeOffPage() {
    const { user, userData } = useAuth()
    const [requests, setRequests] = useState<TimeOffRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Form State
    const [startDate, setStartDate] = useState<Date | undefined>(undefined)
    const [endDate, setEndDate] = useState<Date | undefined>(undefined)
    const [reason, setReason] = useState("")

    // Fetch Requests
    useEffect(() => {
        if (!user) return

        const q = query(
            collection(db, "time_off_requests"),
            where("userId", "==", user.uid),
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
            console.error("Fetch error:", err)
            // If index is missing, it might error. Fallback to client sort if needed, 
            // but for now we assume index triggers or is basic composite.
            setLoading(false)
        })

        return () => unsubscribe()
    }, [user])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!startDate || !endDate || !reason.trim() || !user || !userData) {
            toast.error("Please fill in all fields")
            return
        }

        if (endDate < startDate) {
            toast.error("End date cannot be before start date")
            return
        }

        setSubmitting(true)

        try {
            await addDoc(collection(db, "time_off_requests"), {
                userId: user.uid,
                userName: userData.name || user.email,
                locationId: userData.locationId || "unknown",
                startDate: Timestamp.fromDate(startDate),
                endDate: Timestamp.fromDate(endDate),
                reason: reason.trim(),
                status: 'pending',
                createdAt: serverTimestamp()
            })

            toast.success("Request submitted successfully")
            // Reset form
            setStartDate(undefined)
            setEndDate(undefined)
            setReason("")
        } catch (error) {
            console.error("Submission error:", error)
            toast.error("Failed to submit request")
        } finally {
            setSubmitting(false)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">Approved</Badge>
            case 'rejected':
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">Rejected</Badge>
            default:
                return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200">Pending</Badge>
        }
    }

    return (
        <div className="container mx-auto p-4 max-w-5xl space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-slate-900">Time Off</h1>
                <p className="text-slate-500">Request leave and track your history.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* --- REQUEST FORM --- */}
                <div className="md:col-span-5">
                    <Card className="border-slate-200 shadow-sm sticky top-4">
                        <CardHeader>
                            <CardTitle>New Request</CardTitle>
                            <CardDescription>Submit a new time-off request for approval.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Start Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !startDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={startDate}
                                                onSelect={setStartDate}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-2">
                                    <Label>End Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !endDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={endDate}
                                                onSelect={setEndDate}
                                                initialFocus
                                                disabled={(date) => startDate ? date < startDate : false}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-2">
                                    <Label>Reason</Label>
                                    <Textarea
                                        placeholder="e.g., Vacation, Doctor's appointment..."
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="resize-none h-32"
                                    />
                                </div>

                                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={submitting}>
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Submit Request
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* --- REQUEST HISTORY --- */}
                <div className="md:col-span-7">
                    <Card className="border-slate-200 shadow-sm h-full">
                        <CardHeader>
                            <CardTitle>Request History</CardTitle>
                            <CardDescription>Your past and pending requests.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-12 text-slate-400">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                    Loading history...
                                </div>
                            ) : requests.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <Clock className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                                    <h3 className="text-sm font-bold text-slate-600">No requests yet</h3>
                                    <p className="text-xs text-slate-400">Submit your first request on the left.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {requests.map((req) => (
                                        <div key={req.id} className="p-4 rounded-xl border border-slate-100 bg-white hover:shadow-md transition-shadow flex flex-col gap-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                                        <CalendarIcon size={14} className="text-indigo-500" />
                                                        {req.startDate?.seconds ? format(new Date(req.startDate.seconds * 1000), "MMM d, yyyy") : "N/A"}
                                                        <span className="text-slate-300 mx-1">→</span>
                                                        {req.endDate?.seconds ? format(new Date(req.endDate.seconds * 1000), "MMM d, yyyy") : "N/A"}
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{req.reason}</p>
                                                </div>
                                                {getStatusBadge(req.status)}
                                            </div>

                                            {/* Rejection Details */}
                                            {req.status === 'rejected' && req.rejectionReason && (
                                                <div className="mt-2 text-xs bg-red-50 text-red-600 p-2 rounded-lg border border-red-100">
                                                    <strong>Note:</strong> {req.rejectionReason}
                                                </div>
                                            )}

                                            <div className="pt-2 border-t border-slate-50 flex justify-between items-center text-[10px] text-slate-400">
                                                <span>Requested on {req.createdAt?.seconds ? format(new Date(req.createdAt.seconds * 1000), "MMM d, yyyy") : "Just now"}</span>
                                                {req.status === 'approved' && <CheckCircle2 size={12} className="text-green-500" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
