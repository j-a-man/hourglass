"use client"

import Link from "next/link"
import { Clock } from "lucide-react"

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            <div className="flex flex-col items-center justify-center bg-neutral-50 p-4 lg:p-12">
                <div className="w-full max-w-md space-y-8">
                    <Link href="/" className="flex items-center gap-2 font-bold text-2xl text-neutral-900 transition-opacity hover:opacity-80">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                            <Clock className="h-6 w-6" />
                        </div>
                        <span>Hourglass</span>
                    </Link>
                    {children}
                </div>
            </div>
            <div className="hidden lg:flex flex-col justify-center bg-primary p-12 text-white">
                <div className="max-w-lg mx-auto space-y-6">
                    <h1 className="text-4xl font-bold tracking-tight">Time tracking that respects your team's time.</h1>
                    <p className="text-primary-100 text-lg">
                        Automated payroll, location verification, and shift management for modern pharmacies.
                    </p>
                </div>
            </div>
        </div>
    )
}
