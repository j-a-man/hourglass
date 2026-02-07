import { MapPin, FileSpreadsheet, BarChart3, Smartphone, Clock, ShieldCheck, Zap, Users } from "lucide-react"

export default function FeaturesPage() {
    const features = [
        {
            title: "Precision Geofencing",
            description: "Ensure staff are physically present at the pharmacy before they can clock in. Our system uses high-accuracy GPS and IP verification to prevent 'buddy punching' or remote clock-ins.",
            icon: MapPin,
            color: "text-primary",
            bgColor: "bg-primary/10"
        },
        {
            title: "Automated Payroll CSV",
            description: "Stop manually calculating hours. Export your entire staff's bi-weekly hours, including overtime and holiday pay, in a single CSV formatted for your payroll provider.",
            icon: FileSpreadsheet,
            color: "text-secondary",
            bgColor: "bg-secondary/10"
        },
        {
            title: "Real-time Attendance",
            description: "Monitor who is on-site at any moment. The admin dashboard provides a live view of clocked-in employees across all your pharmacy locations.",
            icon: Zap,
            color: "text-accent-yellow",
            bgColor: "bg-accent-yellow/10"
        },
        {
            title: "Overtime & Holiday Rules",
            description: "Configure custom overtime thresholds and holiday multipliers. PharmaClock automatically applies these rules during payroll generation based on your organization settings.",
            icon: Clock,
            color: "text-accent-purple",
            bgColor: "bg-accent-purple/10"
        },
        {
            title: "HIPAA Compliant Security",
            description: "We take security seriously. All staff data and attendance records are encrypted and stored in compliance with healthcare data protection standards.",
            icon: ShieldCheck,
            color: "text-semantic-success",
            bgColor: "bg-semantic-success/10"
        },
        {
            title: "Employee Scheduling",
            description: "Create and assign shifts with a simple drag-and-drop calendar. Detect conflicts and ensure optimal coverage for your peak pharmacy hours.",
            icon: Users,
            color: "text-primary",
            bgColor: "bg-primary/10"
        }
    ]

    return (
        <div className="flex flex-col pb-24">
            {/* Header */}
            <section className="bg-neutral-900 py-24 text-white">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="max-w-3xl">
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">Designed for the modern pharmacy.</h1>
                        <p className="text-xl text-neutral-400 leading-relaxed">
                            Every feature of PharmaClock is built to solve the unique challenges of pharmacy workforce management—from high compliance requirements to multi-location logistics.
                        </p>
                    </div>
                </div>
            </section>

            {/* Feature Grid */}
            <section className="py-24">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
                        {features.map((feature, index) => (
                            <div key={index} className="flex flex-col">
                                <div className={`h-14 w-14 ${feature.bgColor} ${feature.color} rounded-2xl flex items-center justify-center mb-6`}>
                                    <feature.icon className="h-7 w-7" />
                                </div>
                                <h3 className="text-2xl font-bold text-neutral-900 mb-4">{feature.title}</h3>
                                <p className="text-neutral-600 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Deep Dive: Geofencing */}
            <section className="py-24 bg-neutral-50 border-y border-neutral-100">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <span className="text-primary font-bold tracking-wider text-sm uppercase mb-4 inline-block">Security First</span>
                            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">How our geofencing works</h2>
                            <p className="text-neutral-600 text-lg mb-8 leading-relaxed">
                                When an employee attempts to clock in, PharmaClock performs a three-way verification:
                            </p>
                            <ul className="space-y-4">
                                {[
                                    "GPS Coordinates: Must be within 100m of the physical address.",
                                    "IP Address: Verification against the pharmacy's known static IP range.",
                                    "Optional Clock-in Photo: Visual verification for high-security environments."
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-4">
                                        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-1 flex-shrink-0">
                                            <span className="text-xs font-bold">{i + 1}</span>
                                        </div>
                                        <span className="text-neutral-800 font-medium">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-white p-8 rounded-3xl shadow-xl border border-neutral-100 aspect-square flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/light-v10/static/-73.9857,40.7484,15,0/600x600?access_token=MOCK_TOKEN')] bg-cover opacity-20"></div>
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="h-32 w-32 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                                    <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center shadow-lg">
                                        <MapPin className="text-white h-8 w-8" />
                                    </div>
                                </div>
                                <div className="mt-8 bg-white px-6 py-3 rounded-full shadow-lg border border-neutral-100 font-bold text-primary">
                                    100m Geofence Active
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
