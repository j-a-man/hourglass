"use client"

import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, onSnapshot, Timestamp, where } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/components/auth-context"
import { format } from "date-fns"
import { Calendar, MapPin, User, Clock } from "lucide-react"

interface Shift {
    id: string
    userId: string
    userName: string
    locationId: string
    locationName?: string
    startTime: Timestamp
    endTime: Timestamp
    status: string
}

export function ShiftList({ locationId }: { locationId?: string }) {
    const { userData } = useAuth()
    const [shifts, setShifts] = useState<Shift[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!userData?.organizationId) return
        const orgId = userData.organizationId

        let q = query(
            collection(db, "organizations", orgId, "shifts"),
            orderBy("startTime", "asc")
        )

        if (locationId) {
            q = query(
                collection(db, "organizations", orgId, "shifts"),
                where("locationId", "==", locationId),
                orderBy("startTime", "asc")
            )
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const shiftsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Shift[]

            // Filter for future shifts (or recent past + future)
            // Let's show shifts starting from today onwards
            const now = new Date()
            now.setHours(0, 0, 0, 0)

            const upcoming = shiftsData.filter(s => s.startTime.toDate() >= now)

            setShifts(upcoming)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [locationId])

    if (loading) {
        return <div className="text-sm text-muted-foreground animate-pulse">Loading schedule...</div>
    }

    if (shifts.length === 0) {
        return (
            <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                    No upcoming shifts scheduled.
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {shifts.map((shift) => (
                <Card key={shift.id} className="overflow-hidden">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center space-x-2 font-medium">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>{shift.userName}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span>{shift.locationName || shift.locationId}</span>
                            </div>
                        </div>
                        <div className="text-right space-y-1">
                            <div className="flex items-center justify-end space-x-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>{format(shift.startTime.toDate(), "MMM d, yyyy")}</span>
                            </div>
                            <div className="flex items-center justify-end space-x-2 text-sm font-medium">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>
                                    {format(shift.startTime.toDate(), "h:mm a")} - {format(shift.endTime.toDate(), "h:mm a")}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
