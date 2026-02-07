"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/auth-context"
import { Loader2 } from "lucide-react"

interface LocationSelectorProps {
  value: string
  onChange: (location: string) => void
}

export default function LocationSelector({ value, onChange }: LocationSelectorProps) {
  const { userData } = useAuth()
  const [locations, setLocations] = useState<{ id: string, name: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLocations = async () => {
      if (!userData?.organizationId) return
      setLoading(true)
      try {
        const querySnapshot = await getDocs(collection(db, "organizations", userData.organizationId, "locations"))
        const locs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }))
        setLocations(locs)

        // Auto-select first location if none selected
        if (!value && locs.length > 0) {
          onChange(locs[0].name)
        }
      } catch (error) {
        console.error("Error fetching locations:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchLocations()
  }, [userData?.organizationId])

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="animate-spin h-5 w-5 text-slate-400" /></div>

  return (
    <div className="mb-8 text-center sm:text-left">
      <label className="block text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Select Location</label>
      <div className="flex flex-wrap justify-center sm:justify-start gap-3">
        {locations.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No locations configured.</p>
        ) : (
          locations.map((loc) => (
            <Button
              key={loc.id}
              onClick={() => onChange(loc.name)}
              variant={value === loc.name ? "default" : "outline"}
              className={`rounded-full px-6 ${value === loc.name ? "bg-indigo-600 hover:bg-indigo-700 shadow-md transform scale-105" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-indigo-200"}`}
            >
              {loc.name}
            </Button>
          ))
        )}
      </div>
    </div>
  )
}
