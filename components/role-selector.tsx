"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface RoleSelectorProps {
  onSelectRole: (role: "technician" | "admin") => void
}

export default function RoleSelector({ onSelectRole }: RoleSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 rounded-full bg-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">PharmaClock</h1>
          <p className="text-muted-foreground">Time Tracking System</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Card
            onClick={() => onSelectRole("technician")}
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-primary"
          >
            <CardHeader>
              <CardTitle>Technician</CardTitle>
              <CardDescription>Clock in and out, view your punches</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-primary hover:bg-primary/90">Continue as Technician</Button>
            </CardContent>
          </Card>

          <Card
            onClick={() => onSelectRole("admin")}
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-secondary"
          >
            <CardHeader>
              <CardTitle>Administrator</CardTitle>
              <CardDescription>Manage hours, view reports</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full bg-transparent">
                Continue as Admin
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-8">Demo app with 2 pharmacy locations</p>
      </div>
    </div>
  )
}
