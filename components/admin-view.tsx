"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase" // Ensure this path is correct
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, UserPlus, FileDown, MapPin, Clock } from "lucide-react"

// If you don't have this component yet, just use standard HTML date inputs for now
// import DateRangePicker from "@/components/date-range-picker" 

export default function AdminView({ userData }: { userData: any }) {
  // --- STATE ---
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Date State (Default to last 14 days)
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 14)).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  // Invite State
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteLocation, setInviteLocation] = useState(userData?.locationId || "north")
  const [inviteLoading, setInviteLoading] = useState(false)

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // 1. Fetch Employees (Users)
        // If admin has a location, only fetch users from that location.
        let userQuery = query(collection(db, "users"), where("role", "==", "technician"))

        if (userData?.locationId) {
          userQuery = query(collection(db, "users"), where("role", "==", "technician"), where("locationId", "==", userData.locationId))
        }

        const userSnapshot = await getDocs(userQuery)
        const userMap: any = {}
        const userList: any[] = []

        userSnapshot.forEach(doc => {
          const data = doc.data()
          userMap[doc.id] = { id: doc.id, ...data, logs: [] }
          userList.push(userMap[doc.id])
        })

        // 2. Fetch Time Logs
        // Note: For production, you'd want to query by date range in Firestore. 
        // For now, fetching all and filtering in JS is easier for small teams.
        const logsQuery = query(collection(db, "time_logs"), orderBy("timestamp", "asc"))
        const logsSnapshot = await getDocs(logsQuery)

        logsSnapshot.forEach(doc => {
          const log = doc.data()
          // Only add log if it belongs to one of our fetched users
          if (userMap[log.userId]) {
            const logDate = log.timestamp.toDate() // Convert Firestore Timestamp to JS Date
            // DATE FILTER CHECK
            if (logDate >= new Date(startDate) && logDate <= new Date(endDate + 'T23:59:59')) {
              userMap[log.userId].logs.push({ ...log, dateObj: logDate })
            }
          }
        })

        // 3. Calculate Hours for each user
        const processedEmployees = userList.map(user => {
          const totalHours = calculateHours(user.logs)
          return { ...user, totalHours }
        })

        setEmployees(processedEmployees)

      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [startDate, endDate, userData]) // Re-run when dates or user changes

  // --- LOGIC HELPER: Calculate Hours ---
  const calculateHours = (logs: any[]) => {
    let totalMs = 0
    // Sort just in case
    logs.sort((a, b) => a.dateObj - b.dateObj)

    for (let i = 0; i < logs.length; i++) {
      const current = logs[i]
      const next = logs[i + 1]

      // We look for pairs: IN -> OUT
      if (current.type === 'in' && next && next.type === 'out') {
        totalMs += next.dateObj - current.dateObj
        i++ // Skip the 'out' log since we used it
      }
    }
    return (totalMs / (1000 * 60 * 60)).toFixed(2)
  }

  // --- INVITE SYSTEM ---
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)
    try {
      // Add to 'whitelisted_emails' collection
      await addDoc(collection(db, "whitelisted_emails"), {
        email: inviteEmail.toLowerCase().trim(),
        locationId: inviteLocation,
        invitedBy: userData?.email || "admin",
        createdAt: serverTimestamp()
      })

      alert(`Success! Tell ${inviteEmail} to go to the website and Sign Up.`)
      setInviteEmail("")
    } catch (error) {
      console.error("Error inviting:", error)
      alert("Failed to invite user.")
    } finally {
      setInviteLoading(false)
    }
  }

  // --- EXPORT CSV ---
  const handleExportCSV = () => {
    const csvRows = ["Employee Name,Location,Total Hours,Pay Period"]
    employees.forEach(emp => {
      csvRows.push(`${emp.name || emp.email},${emp.locationId || "N/A"},${emp.totalHours},${startDate} to ${endDate}`)
    })

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Payroll_${startDate}_${endDate}.csv`
    a.click()
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="space-y-6">

      {/* TOP STATS / INVITE ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* STAT CARD */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">For {userData?.locationId || "all"} locations</p>
          </CardContent>
        </Card>

        {/* INVITE CARD */}
        <Card className="md:col-span-2 border-blue-100 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
              <UserPlus size={16} /> Register New Employee
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="technician@gmail.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="bg-white"
                />
              </div>
              <div className="w-[140px]">
                <Select value={inviteLocation} onValueChange={setInviteLocation} disabled={!!userData?.locationId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="north">North Store</SelectItem>
                    <SelectItem value="south">South Store</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={inviteLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                {inviteLoading ? "Adding..." : "Authorize"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* MAIN PAYROLL TABLE */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payroll Period</CardTitle>
            <CardDescription>Manage hours and export reports</CardDescription>
          </div>
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <FileDown size={16} /> Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          {/* CONTROLS */}
          <div className="flex items-center gap-4 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="grid gap-1.5">
              <Label className="text-xs text-slate-500">Start Date</Label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-slate-500">End Date</Label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
          </div>

          {/* TABLE */}
          <div className="border rounded-md">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3 text-right">Total Hours</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No employees found for this location/period.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {emp.name || emp.email}
                        <div className="text-xs text-slate-400 font-normal">{emp.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-xs text-slate-600">
                          <MapPin size={10} /> {emp.locationId?.toUpperCase() || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-slate-700">
                        {emp.totalHours} hrs
                        {Number(emp.totalHours) > 40 && (
                          <span className="ml-2 text-[10px] text-red-600 font-bold bg-red-50 px-1 rounded">OT</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {/* Check if last log was IN */}
                        {emp.logs.length > 0 && emp.logs[emp.logs.length - 1].type === 'in' ? (
                          <span className="text-green-600 text-xs font-bold flex items-center justify-end gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Clocked In
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Offline</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}