"use client"

import { useState } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, deleteDoc, doc, writeBatch, query, where } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2, RefreshCcw } from "lucide-react"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function DuplicateShiftCleaner() {
    const [analyzing, setAnalyzing] = useState(false)
    const [cleaning, setCleaning] = useState(false)
    const [duplicateCount, setDuplicateCount] = useState(0)
    const [duplicates, setDuplicates] = useState<string[]>([])
    const [targetCollection, setTargetCollection] = useState<"shifts" | "time_logs">("shifts")
    const [isOpen, setIsOpen] = useState(false)

    const analyze = async (target: "shifts" | "time_logs") => {
        setTargetCollection(target)
        setAnalyzing(true)
        try {
            const ref = collection(db, target)
            const snapshot = await getDocs(ref)

            const map = new Map<string, string[]>()
            const toDelete: string[] = []

            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data()
                let key = ""

                if (target === "shifts") {
                    // Unique: User + Start + End
                    key = `${data.userId}-${data.startTime.toMillis()}-${data.endTime.toMillis()}`
                } else {
                    // Time Logs Unique: User + Timestamp + Type
                    // If multiple logs exist for exact same second, they are dupes.
                    // Also checking locationId to be safe, but userId+time is enough collision.
                    key = `${data.userId}-${data.timestamp.toMillis()}-${data.type}`
                }

                if (map.has(key)) {
                    toDelete.push(docSnap.id)
                } else {
                    map.set(key, [docSnap.id])
                }
            })

            setDuplicateCount(toDelete.length)
            setDuplicates(toDelete)

            if (toDelete.length === 0) {
                toast.success(`No duplicate ${target.replace("_", " ")} found.`)
            } else {
                setIsOpen(true)
            }

        } catch (error) {
            console.error("Error analyzing:", error)
            toast.error("Failed to analyze data.")
        } finally {
            setAnalyzing(false)
        }
    }

    const cleanDuplicates = async () => {
        setCleaning(true)
        try {
            const batchSize = 500
            const chunks = []

            for (let i = 0; i < duplicates.length; i += batchSize) {
                chunks.push(duplicates.slice(i, i + batchSize))
            }

            for (const chunk of chunks) {
                const batch = writeBatch(db)
                chunk.forEach(id => {
                    batch.delete(doc(db, targetCollection, id))
                })
                await batch.commit()
            }

            toast.success(`Removed ${duplicates.length} duplicate ${targetCollection.replace("_", " ")}.`)
            setDuplicateCount(0)
            setDuplicates([])
            setIsOpen(false)
        } catch (error) {
            console.error("Error cleaning:", error)
            toast.error("Failed to delete duplicates.")
        } finally {
            setCleaning(false)
        }
    }

    return (
        <>
            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Found {duplicateCount} Duplicate {targetCollection === "shifts" ? "Shifts" : "Logs"}</AlertDialogTitle>
                        <AlertDialogDescription>
                            We found {duplicateCount} {targetCollection.replace("_", " ")} that are exact duplicates.
                            This will result in cleaner data and accurate payroll.
                            <br /><br />
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={cleaning}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                cleanDuplicates()
                            }}
                            disabled={cleaning}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {cleaning ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Cleaning...
                                </>
                            ) : (
                                "Yes, Remove Duplicates"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={analyzing}
                        className="bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    >
                        {analyzing ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <RefreshCcw className="h-4 w-4 mr-2" />
                        )}
                        {analyzing ? "Scanning..." : "Clean Data"}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white">
                    <DropdownMenuItem onClick={() => analyze("shifts")}>
                        Scan Duplicate Shifts
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => analyze("time_logs")}>
                        Scan Duplicate Time Logs
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}
