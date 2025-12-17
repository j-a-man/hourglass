"use client"

import { Button } from "@/components/ui/button"

interface LocationSelectorProps {
  value: string
  onChange: (location: string) => void
}

export default function LocationSelector({ value, onChange }: LocationSelectorProps) {
  const locations = ["Downtown", "Uptown"]

  return (
    <div className="mb-8">
      <label className="block text-sm font-medium text-foreground mb-3">Select Location</label>
      <div className="grid grid-cols-2 gap-3">
        {locations.map((loc) => (
          <Button
            key={loc}
            onClick={() => onChange(loc)}
            variant={value === loc ? "default" : "outline"}
            className={value === loc ? "bg-primary text-primary-foreground" : ""}
          >
            {loc}
          </Button>
        ))}
      </div>
    </div>
  )
}
