"use client"

import { useEffect, useState } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { MoreHorizontal, MapPin, Mail, Calendar } from "lucide-react"

interface User {
    uid: string
    name: string
    email: string
    role: string
    locationId: string
    createdAt: string
}

export function EmployeeList({ locationId }: { locationId: string }) {
    const [employees, setEmployees] = useState<User[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchEmployees = async () => {
            setLoading(true)
            try {
                const q = query(collection(db, "users"), where("locationId", "==", locationId))
                const querySnapshot = await getDocs(q)
                const users = querySnapshot.docs.map(doc => ({
                    // 1. Get all the data fields (name, email, role, etc)
                    ...doc.data(),
                    // 2. FORCE the 'uid' to be the Document ID
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
    }, [locationId])

    if (loading) {
        return <div className="text-center py-4">Loading employees...</div>
    }

    if (employees.length === 0) {
        return <div className="text-center py-4 text-muted-foreground">No employees found for this location.</div>
    }

    return (
        <div className="space-y-4">
            {employees.map((employee) => (
                <div
                    key={employee.uid}
                    className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
                >
                    <div className="flex items-center gap-4">
                        <Avatar>
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${employee.name}`} />
                            <AvatarFallback>{employee.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{employee.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{employee.email}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Badge variant={employee.role === "admin" ? "default" : "secondary"} className="capitalize">
                            {employee.role}
                        </Badge>

                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent>
                                <SheetHeader>
                                    <SheetTitle>Employee Details</SheetTitle>
                                </SheetHeader>
                                <div className="py-6 space-y-6">
                                    <div className="flex flex-col items-center gap-4">
                                        <Avatar className="w-20 h-20">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${employee.name}`} />
                                            <AvatarFallback className="text-xl">{employee.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="text-center">
                                            <h3 className="text-xl font-bold">{employee.name}</h3>
                                            <p className="text-muted-foreground">{employee.email}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 text-sm">
                                            <MapPin className="w-4 h-4 text-muted-foreground" />
                                            <span className="capitalize">{employee.locationId} Store</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <Mail className="w-4 h-4 text-muted-foreground" />
                                            <span>{employee.email}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                            <span>Joined {new Date(employee.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t">
                                        <h4 className="font-medium mb-4">Stats</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Card>
                                                <CardContent className="p-4 text-center">
                                                    <div className="text-2xl font-bold">--</div>
                                                    <div className="text-xs text-muted-foreground">Hours this week</div>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardContent className="p-4 text-center">
                                                    <div className="text-2xl font-bold">--</div>
                                                    <div className="text-xs text-muted-foreground">Avg Shift</div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            ))}
        </div>
    )
}
