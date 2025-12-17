"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useRouter } from "next/navigation"

interface UserData {
    uid: string
    email: string
    role: "admin" | "technician"
    locationId: string
    name: string
    hourlyRate?: number
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
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser)

            if (firebaseUser) {
                try {
                    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
                    if (userDoc.exists()) {
                        setUserData(userDoc.data() as UserData)
                    } else {
                        console.error("User document not found")
                        // Handle case where user exists in Auth but not Firestore
                        setUserData(null)
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error)
                }
            } else {
                setUserData(null)
            }
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    return (
        <AuthContext.Provider value={{ user, userData, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
