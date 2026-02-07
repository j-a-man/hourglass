"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, query, where, updateDoc, doc, Timestamp } from "firebase/firestore"
import { Database, Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "./auth-context"

export function SeedDataButton() {
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)
    const { user, userData } = useAuth()

    const handleSeed = async () => {
        setLoading(true)
        try {
            // 1. Update ALL users with a default hourly rate if missing
            const usersSnapshot = await getDocs(collection(db, "users"))
            const updatePromises = usersSnapshot.docs.map(userDoc => {
                const data = userDoc.data()
                if (!data.hourlyRate) {
                    return updateDoc(doc(db, "users", userDoc.id), {
                        hourlyRate: 25.00 // Default rate
                    })
                }
                return Promise.resolve()
            })
            await Promise.all(updatePromises)

            // 2. Create sample Shifts for the next 7 days for this organization's users
            if (!userData?.organizationId) return
            const orgId = userData.organizationId

            const shiftsCollection = collection(db, "organizations", orgId, "shifts")
            const today = new Date()

            // For each user, give them 3 shifts in the next week
            for (const userDoc of usersSnapshot.docs) {
                const userId = userDoc.id
                const userData = userDoc.data()

                // Shift 1: Tomorrow 9am-5pm
                const shift1Start = new Date(today)
                shift1Start.setDate(today.getDate() + 1)
                shift1Start.setHours(9, 0, 0, 0)
                const shift1End = new Date(shift1Start)
                shift1End.setHours(17, 0, 0, 0)

                // Shift 2: Day after tomorrow 10am-6pm
                const shift2Start = new Date(today)
                shift2Start.setDate(today.getDate() + 2)
                shift2Start.setHours(10, 0, 0, 0)
                const shift2End = new Date(shift2Start)
                shift2End.setHours(18, 0, 0, 0)

                // Shift 3: 3 days from now 9am-2pm (half day)
                const shift3Start = new Date(today)
                shift3Start.setDate(today.getDate() + 3)
                shift3Start.setHours(9, 0, 0, 0)
                const shift3End = new Date(shift3Start)
                shift3End.setHours(14, 0, 0, 0)

                await addDoc(shiftsCollection, {
                    userId,
                    userName: userData.name,
                    locationId: userData.locationId || "north",
                    startTime: Timestamp.fromDate(shift1Start),
                    endTime: Timestamp.fromDate(shift1End),
                    role: userData.role || "employee"
                })

                await addDoc(shiftsCollection, {
                    userId,
                    userName: userData.name,
                    locationId: userData.locationId || "north",
                    startTime: Timestamp.fromDate(shift2Start),
                    endTime: Timestamp.fromDate(shift2End),
                    role: userData.role || "employee"
                })

                await addDoc(shiftsCollection, {
                    userId,
                    userName: userData.name,
                    locationId: userData.locationId || "north",
                    startTime: Timestamp.fromDate(shift3Start),
                    endTime: Timestamp.fromDate(shift3End),
                    role: userData.role || "employee"
                })
            }

            // 3. REPAIR/CREATE Locations with Coordinates
            const locationsToRepair = [
                { id: "north", name: "North Pharmacy", address: "123 North St", lat: 42.08977, lng: -75.970381 },
                { id: "downtown", name: "Downtown Clinic", address: "456 Main St", lat: 42.09, lng: -75.90 },
                { id: "uptown", name: "Uptown Medical", address: "789 High Ave", lat: 42.11, lng: -75.92 },
            ]

            // We use setDoc with merge to ensure IDs match and coordinates exist
            const { setDoc } = await import("firebase/firestore")
            for (const loc of locationsToRepair) {
                await setDoc(doc(db, "organizations", orgId, "locations", loc.id), {
                    name: loc.name,
                    address: loc.address,
                    geofenceRadius: 250, // Slightly larger for better reliability
                    organizationId: "hourglass_main",
                    coordinates: {
                        latitude: loc.lat,
                        longitude: loc.lng
                    },
                    status: "active"
                }, { merge: true })
                console.log(`Repaired location: ${loc.id}`)
            }

            // 4. Ensure current user has a valid locationId if missing
            if (user?.uid) {
                await updateDoc(doc(db, "users", user.uid), {
                    locationId: "north"
                })
            }

            setDone(true)
            toast.success("Database seeded with Rates & Shifts!")
        } catch (error) {
            console.error("Seeding error:", error)
            toast.error("Failed to seed data.")
        } finally {
            setLoading(false)
        }
    }

    if (done) {
        return (
            <Button variant="outline" className="bg-green-50 text-green-600 border-green-200" disabled>
                <CheckCircle className="mr-2 h-4 w-4" />
                Data Seeded
            </Button>
        )
    }

    return (
        <Button
            variant="outline"
            onClick={handleSeed}
            disabled={loading}
            className="bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100"
        >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            Seed Data (Dev)
        </Button>
    )
}
