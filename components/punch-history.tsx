"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface TimeEntry {
  id: string
  timestamp: Date
  type: "clock-in" | "clock-out"
  location: string
}

interface PunchHistoryProps {
  punches: TimeEntry[]
}

export default function PunchHistory({ punches }: PunchHistoryProps) {
  const todayPunches = punches.filter((p) => {
    const punchDate = new Date(p.timestamp)
    const today = new Date()
    return punchDate.toDateString() === today.toDateString()
  })

  if (todayPunches.length === 0) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-lg">Today's Punches</CardTitle>
          <CardDescription>No punches recorded yet</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Today's Punches</CardTitle>
        <CardDescription>
          {todayPunches.length} punch{todayPunches.length !== 1 ? "es" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {todayPunches.map((punch) => (
            <div key={punch.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${punch.type === "clock-in" ? "bg-accent" : "bg-destructive"}`} />
                <div>
                  <p className="font-medium text-foreground">
                    {punch.type === "clock-in" ? "Clocked In" : "Clocked Out"}
                  </p>
                  <p className="text-xs text-muted-foreground">{punch.location}</p>
                </div>
              </div>
              <p className="text-sm font-mono text-foreground">
                {new Date(punch.timestamp).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
