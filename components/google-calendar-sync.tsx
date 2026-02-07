"use client"

import { useState } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, writeBatch, doc, Timestamp, query, where } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Calendar, Loader2, Check, AlertCircle, RefreshCw, ArrowRight, HelpCircle, Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface GoogleCalendarSyncProps {
    locationId: string
    onSuccess?: () => void
}

export function GoogleCalendarSync({ locationId, onSuccess }: GoogleCalendarSyncProps) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<"input" | "preview" | "importing" | "success">("input")
    const [icalUrl, setIcalUrl] = useState("")

    // Store ALL events found
    const [parsedEvents, setParsedEvents] = useState<any[]>([])

    // Store Manual Assignments: { [eventIndex]: userId }
    const [assignments, setAssignments] = useState<Record<number, string>>({})

    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    // Helper: Parse ICS Date String (e.g. 20231225T143000Z)
    const parseICSDate = (dateStr: string) => {
        if (!dateStr) return null
        const year = parseInt(dateStr.substring(0, 4))
        const month = parseInt(dateStr.substring(4, 6)) - 1
        const day = parseInt(dateStr.substring(6, 8))
        const hour = dateStr.includes("T") ? parseInt(dateStr.substring(9, 11)) : 0
        const minute = dateStr.includes("T") ? parseInt(dateStr.substring(11, 13)) : 0
        const second = dateStr.includes("T") ? parseInt(dateStr.substring(13, 15)) : 0

        // Return date object (assuming local time if no Z, otherwise could adjust)
        // For simplicity in this demo, treating as local or respecting Z roughly
        return new Date(Date.UTC(year, month, day, hour, minute, second))
    }

    const parseICS = (icsData: string) => {
        // 1. Unfold lines (handle split lines per RFC 5545)
        // Lines starting with space/tab are continuations of the previous line
        const unfolded = icsData.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").replace(/\r[ \t]/g, "")

        const events = []
        const lines = unfolded.split(/\r\n|\n|\r/)
        let inEvent = false
        let currentEvent: any = {}

        for (const line of lines) {
            if (line.startsWith("BEGIN:VEVENT")) {
                inEvent = true
                currentEvent = {}
            } else if (line.startsWith("END:VEVENT")) {
                inEvent = false
                if (currentEvent.summary && currentEvent.start && currentEvent.end) {
                    events.push(currentEvent)
                }
            } else if (inEvent) {
                if (line.startsWith("SUMMARY:")) currentEvent.summary = line.substring(8)
                if (line.startsWith("DTSTART:")) currentEvent.start = parseICSDate(line.substring(8))
                if (line.startsWith("DTSTART;")) currentEvent.start = parseICSDate(line.split(":")[1])
                if (line.startsWith("DTEND:")) currentEvent.end = parseICSDate(line.substring(6))
                if (line.startsWith("DTEND;")) currentEvent.end = parseICSDate(line.split(":")[1])
                if (line.startsWith("DESCRIPTION:")) currentEvent.description = line.substring(12)
            }
        }
        return events.sort((a: any, b: any) => a.start - b.start)
    }

    const handleUrlSubmit = async () => {
        const cleanUrl = icalUrl.trim()
        if (!cleanUrl) return

        setLoading(true)
        setParsedEvents([])
        setAssignments({})

        try {
            // 1. Fetch Users (for dropdown options)
            const usersQ = query(collection(db, "users"), where("locationId", "==", locationId))
            const usersSnap = await getDocs(usersQ)
            const loadedUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            setUsers(loadedUsers)

            // 2. Fetch ICS Data via Proxy
            const response = await fetch(`/api/calendar-proxy?url=${encodeURIComponent(cleanUrl)}`)

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.error || `Failed to fetch calendar (${response.status})`)
            }

            const icsText = await response.text()

            // 3. Parse ICS
            const events = parseICS(icsText)

            // 4. Pre-Filter and Auto-Suggest
            const now = new Date()
            const filterStart = new Date(now)
            filterStart.setHours(now.getHours() - 24) // Past 24h
            const nextMonth = new Date()
            nextMonth.setDate(now.getDate() + 45) // Next 45 days

            const validEvents = events.filter(e => e.start && e.end && e.start >= filterStart && e.start <= nextMonth)

            // Auto-Suggest Assignments based on Name Match
            const newAssignments: Record<number, string> = {}
            validEvents.forEach((event, index) => {
                const summaryLower = event.summary?.toLowerCase() || ""
                const matchedUser = loadedUsers.find((u: any) => summaryLower.includes(u.name?.toLowerCase()))
                if (matchedUser) {
                    newAssignments[index] = matchedUser.id
                }
            })

            setParsedEvents(validEvents)
            setAssignments(newAssignments)
            setStep("preview")

        } catch (error: any) {
            console.error("Sync error:", error)
            toast.error(error.message || "Failed to sync calendar.")
        } finally {
            setLoading(false)
        }
    }

    const toggleAssignment = (index: number, userId: string) => {
        setAssignments(prev => {
            const next = { ...prev }
            if (userId === "ignore") {
                delete next[index]
            } else {
                next[index] = userId
            }
            return next
        })
    }

    const importShifts = async () => {
        setLoading(true)
        setStep("importing")

        try {
            const batch = writeBatch(db)
            let count = 0

            parsedEvents.forEach((event, index) => {
                const userId = assignments[index]
                if (userId) {
                    const user = users.find(u => u.id === userId)
                    if (user) {
                        const ref = doc(collection(db, "shifts"))
                        batch.set(ref, {
                            userId: user.id,
                            userName: user.name,
                            locationId: locationId,
                            startTime: Timestamp.fromDate(event.start),
                            endTime: Timestamp.fromDate(event.end),
                            createdAt: Timestamp.now(),
                            source: "google_calendar"
                        })
                        count++
                    }
                }
            })

            if (count > 0) {
                await batch.commit()
                toast.success(`Successfully imported ${count} shifts`)
                setStep("success")
                if (onSuccess) onSuccess()
            } else {
                toast.info("No shifts selected to import.")
                setStep("preview")
            }

            // Close after delay
            if (count > 0) {
                setTimeout(() => {
                    setOpen(false)
                    setStep("input")
                    setParsedEvents([])
                    setAssignments({})
                    setIcalUrl("")
                }, 2000)
            }

        } catch (error) {
            console.error("Import error:", error)
            toast.error("Failed to import shifts")
            setStep("preview")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50">
                    <RefreshCw size={16} />
                    Sync Google Calendar
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="text-indigo-600" />
                        Import Shifts from Google
                    </DialogTitle>
                    <DialogDescription>
                        Sync shifts using your calendar's private iCal link.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 flex-1 overflow-y-auto px-1">
                    {step === "input" && (
                        <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                <div className="flex gap-3">
                                    <div className="bg-white p-2 rounded-lg h-fit shadow-sm text-indigo-600">
                                        <LinkIcon size={18} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-sm text-indigo-900">Enter Secret iCal Address</h4>
                                        <p className="text-xs text-indigo-700 leading-relaxed">
                                            Go to Google Calendar &gt; Settings &gt; Integrate calendar &gt; Copy <strong>"Secret address in iCal format"</strong>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Input
                                placeholder="https://calendar.google.com/calendar/ical/..."
                                value={icalUrl}
                                onChange={(e) => setIcalUrl(e.target.value)}
                                className="font-mono text-xs"
                            />
                        </div>
                    )}

                    {step === "preview" && (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between sticky top-0 bg-white z-10 py-2 border-b">
                                <div>
                                    <h4 className="font-bold text-slate-800">Review Events</h4>
                                    <span className="text-xs text-slate-500">{parsedEvents.length} events found</span>
                                </div>
                                <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                    {Object.keys(assignments).length} Selected
                                </div>
                            </div>
                            <div className="space-y-2">
                                {parsedEvents.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">
                                        No recent or upcoming events found.
                                    </div>
                                ) : (
                                    parsedEvents.map((event, i) => (
                                        <div key={i} className="p-3 border rounded-lg flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between hover:border-indigo-200 transition-colors bg-white">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-slate-700 truncate">{event.summary || "No Title"}</div>
                                                <div className="text-xs text-slate-500 font-mono mt-0.5">
                                                    {format(event.start, "MMM d, h:mm a")} - {format(event.end, "h:mm a")}
                                                </div>
                                            </div>

                                            {/* Employee Selector */}
                                            <div className="w-full sm:w-[200px]">
                                                <select
                                                    className={`w-full text-sm border rounded-md px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 ${assignments[i] ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold' : 'bg-slate-50 text-slate-400'}`}
                                                    value={assignments[i] || "ignore"}
                                                    onChange={(e) => toggleAssignment(i, e.target.value)}
                                                >
                                                    <option value="ignore">Don't Import</option>
                                                    {users.map(u => (
                                                        <option key={u.id} value={u.id}>{u.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {(step === "importing" || step === "success") && (
                        <div className="text-center py-12">
                            {step === "success" ? (
                                <div className="flex flex-col items-center gap-2 text-green-600 animate-in zoom-in duration-300">
                                    <div className="p-3 bg-green-100 rounded-full"><Check size={32} /></div>
                                    <h3 className="font-bold text-lg">Import Complete!</h3>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-indigo-600">
                                    <Loader2 size={40} className="animate-spin" />
                                    <p className="text-sm font-medium">Creating {Object.keys(assignments).length} shifts...</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-shrink-0 pt-4 border-t">
                    {step === "input" && (
                        <Button onClick={handleUrlSubmit} disabled={!icalUrl || loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Fetch Shifts
                        </Button>
                    )}
                    {step === "preview" && (
                        <div className="flex gap-2 w-full">
                            <Button onClick={() => setStep("input")} variant="outline" className="flex-1">Back</Button>
                            <Button onClick={importShifts} disabled={loading || Object.keys(assignments).length === 0} className="flex-1 bg-green-600 hover:bg-green-700">
                                Import Shifts
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
