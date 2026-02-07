"use client"

import { Building2, Users, ArrowRight, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion } from "framer-motion"

export default function GetStartedPage() {
    return (
        <div className="space-y-8">
            <div className="space-y-2 text-center lg:text-left">
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Get Started</h1>
                <p className="text-neutral-500">Choose how you want to use Hourglass today</p>
            </div>

            <div className="grid gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Link href="/setup-company">
                        <div className="group relative overflow-hidden rounded-[32px] border-2 border-neutral-100 bg-white p-8 transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5">
                            <div className="flex items-start justify-between">
                                <div className="space-y-4">
                                    <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 transition-colors group-hover:bg-primary group-hover:text-white">
                                        <Building2 className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-neutral-900">Setup New Company</h3>
                                        <p className="text-sm font-medium text-neutral-500 mt-1 max-w-[240px]">
                                            Register your company and start managing your team's time.
                                        </p>
                                    </div>
                                </div>
                                <div className="h-10 w-10 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-2">
                                    <ArrowRight className="h-5 w-5" />
                                </div>
                            </div>
                        </div>
                    </Link>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Link href="/join-team">
                        <div className="group relative overflow-hidden rounded-[32px] border-2 border-neutral-100 bg-white p-8 transition-all hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5">
                            <div className="flex items-start justify-between">
                                <div className="space-y-4">
                                    <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
                                        <Users className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-neutral-900">Join My Team</h3>
                                        <p className="text-sm font-medium text-neutral-500 mt-1 max-w-[240px]">
                                            Join an existing company using a code provided by your admin.
                                        </p>
                                    </div>
                                </div>
                                <div className="h-10 w-10 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-2">
                                    <ArrowRight className="h-5 w-5" />
                                </div>
                            </div>
                        </div>
                    </Link>
                </motion.div>
            </div>

            <div className="text-center text-sm text-neutral-500 pt-4">
                Already have an account?{" "}
                <Link href="/login" className="font-bold text-primary hover:underline">
                    Sign in
                </Link>
            </div>
        </div>
    )
}
