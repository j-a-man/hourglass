"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface DateRange {
  from: Date
  to: Date
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handlePreset = (preset: "week" | "biweekly" | "month") => {
    const to = new Date()
    const from = new Date()

    if (preset === "week") {
      from.setDate(to.getDate() - 7)
    } else if (preset === "biweekly") {
      from.setDate(to.getDate() - 14)
    } else {
      from.setDate(to.getDate() - 30)
    }

    onChange({ from, to })
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Button onClick={() => setIsOpen(!isOpen)} variant="outline" className="w-full justify-between">
        <span>
          {value.from.toLocaleDateString()} - {value.to.toLocaleDateString()}
        </span>
        <span>📅</span>
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-lg shadow-lg p-4 z-50">
          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" variant="outline" onClick={() => handlePreset("week")} className="text-xs">
              Last 7 Days
            </Button>
            <Button size="sm" variant="outline" onClick={() => handlePreset("biweekly")} className="text-xs">
              Last 14 Days
            </Button>
            <Button size="sm" variant="outline" onClick={() => handlePreset("month")} className="text-xs">
              Last 30 Days
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
