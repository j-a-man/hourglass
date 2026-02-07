"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Clock } from "lucide-react"

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                <div className="flex items-center gap-2">
                    <Link href="/" className="flex items-center gap-2 font-bold text-neutral-900">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                            <Clock className="h-4 w-4" />
                        </div>
                        <span className="text-xl tracking-tight">Hourglass</span>
                    </Link>
                    <nav className="hidden md:ml-10 md:flex md:gap-8">
                        <Link href="/features" className="text-sm font-medium text-neutral-600 hover:text-primary transition-colors">Features</Link>
                        <Link href="/pricing" className="text-sm font-medium text-neutral-600 hover:text-primary transition-colors">Pricing</Link>
                        <Link href="/about" className="text-sm font-medium text-neutral-600 hover:text-primary transition-colors">About</Link>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/login">
                        <Button variant="ghost" size="sm" className="hidden sm:inline-flex">Login</Button>
                    </Link>
                    <Link href="/get-started">
                        <Button size="sm">Get Started</Button>
                    </Link>
                </div>
            </div>
        </header>
    )
}
