"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface Metric {
    label: string
    value: string | number
    icon: LucideIcon
    description?: string
    trend?: {
        value: number
        label: string
        isPositive: boolean
    }
}

interface AnalyticsDashboardProps {
    metrics: {
        clockedIn: Metric
        todayHours: Metric
        activeEmployees: Metric
        locations: Metric
    }
}

export function AnalyticsDashboard({ metrics }: AnalyticsDashboardProps) {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(metrics).map(([key, metric]) => (
                <Card
                    key={key}
                    className="rounded-[24px] border-neutral-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                >
                    <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
                        <CardTitle className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                            {metric.label}
                        </CardTitle>
                        <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-primary/5 text-primary">
                            <metric.icon className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-6">
                        <div className="text-3xl font-black text-neutral-900 tracking-tighter">
                            {metric.value}
                        </div>
                        {(metric.description || metric.trend) && (
                            <div className="flex items-center gap-2 mt-2">
                                {metric.trend && (
                                    <span className={cn(
                                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                        metric.trend.isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                    )}>
                                        {metric.trend.isPositive ? "+" : "-"}{metric.trend.value}%
                                    </span>
                                )}
                                <p className="text-xs text-neutral-500 font-medium">
                                    {metric.description || metric.trend?.label}
                                </p>
                            </div>
                        )}
                    </CardContent>
                    {/* Subtle accent bar at the bottom */}
                    <div className="h-1.5 w-full bg-primary/5" />
                </Card>
            ))}
        </div>
    )
}
