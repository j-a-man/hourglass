"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { doc, getDoc, onSnapshot, type DocumentSnapshot } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useRouter } from "next/navigation"

// Aligned with Firestore Schema
export interface UserData {
    uid: string
    email: string
    name: string
    role: 'owner' | 'admin' | 'manager' | 'staff' | 'associate'
    organizationId: string
    status: 'active' | 'inactive' | 'terminated'
    locationId?: string
    hourlyRate?: number
    phone?: string
    photoUrl?: string
    employeeDetails?: {
        employeeId: string
        payRate: number
        position: string
        hireDate: string
        timeOffBalance: {
            vacation: number
            sick: number
            personal: number
        }
    }
}

interface AuthContextType {
    user: User | null
    userData: UserData | null
    loading: boolean
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userData: null,
    loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [userData, setUserData] = useState<UserData | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        let unsubscribeDoc: (() => void) | null = null

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser)

            if (firebaseUser) {
                // Use onSnapshot for real-time updates and to handle the registration race condition
                unsubscribeDoc = onSnapshot(
                    doc(db, "users", firebaseUser.uid),
                    (userDocDetail: DocumentSnapshot) => {
                        if (userDocDetail.exists()) {
                            setUserData(userDocDetail.data() as UserData)
                        } else {
                            setUserData(null)
                        }
                        setLoading(false)
                    },
                    (errorDetail: Error) => {
                        console.error("Error listening to user data:", errorDetail)
                        setUserData(null)
                        setLoading(false)
                    }
                )
            } else {
                setUserData(null)
                setLoading(false)
            }
        })

        return () => {
            unsubscribeAuth()
            if (unsubscribeDoc) unsubscribeDoc()
        }
    }, [])

    return (
        <AuthContext.Provider value={{ user, userData, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
