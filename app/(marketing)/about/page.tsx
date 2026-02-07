import { Award, Shield, Users, Heart } from "lucide-react"

export default function AboutPage() {
    return (
        <div className="flex flex-col pb-24">
            <section className="bg-white py-24">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="max-w-3xl">
                        <h1 className="text-4xl md:text-6xl font-bold text-neutral-900 mb-8 tracking-tight">
                            We're building the infrastructure for <span className="text-primary italic">modern pharmacies</span>.
                        </h1>
                        <p className="text-xl text-neutral-600 leading-relaxed mb-8">
                            PharmaClock was started with a simple belief: pharmacy owners and managers should focus on patient care, not paperwork. We've built the most reliable time tracking and payroll automation tool dedicated specifically to the needs of the pharmaceutical industry.
                        </p>
                    </div>
                </div>
            </section>

            <section className="py-24 bg-neutral-50/50 border-y border-neutral-100">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
                        <div>
                            <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
                                <Shield className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-neutral-900">Built on Trust</h3>
                            <p className="text-neutral-600 text-sm leading-relaxed">
                                Precision verification ensures that every recorded hour is legitimate, fostering trust between management and staff.
                            </p>
                        </div>
                        <div>
                            <div className="h-12 w-12 bg-semantic-success/10 rounded-xl flex items-center justify-center text-semantic-success mb-6">
                                <Award className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-neutral-900">Industry Quality</h3>
                            <p className="text-neutral-600 text-sm leading-relaxed">
                                We're committed to HIPAA-level security and compliance standards in everything we build.
                            </p>
                        </div>
                        <div>
                            <div className="h-12 w-12 bg-accent-purple/10 rounded-xl flex items-center justify-center text-accent-purple mb-6">
                                <Users className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-neutral-900">Human Centric</h3>
                            <p className="text-neutral-600 text-sm leading-relaxed">
                                Technology should stay out of the way. Our UI is designed to be used in seconds, not minutes.
                            </p>
                        </div>
                        <div>
                            <div className="h-12 w-12 bg-accent-pink/10 rounded-xl flex items-center justify-center text-accent-pink mb-6">
                                <Heart className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-neutral-900">Pharmacy First</h3>
                            <p className="text-neutral-600 text-sm leading-relaxed">
                                We design features for pharmacists, technicians, and owners—not for generic retail businesses.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-32">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="grid lg:grid-cols-2 gap-24 items-center">
                        <div className="relative">
                            <div className="aspect-square bg-neutral-200 rounded-3xl overflow-hidden shadow-2xl transition-transform hover:scale-[1.02]">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20"></div>
                                <div className="absolute inset-0 flex items-center justify-center text-white/20 font-bold text-4xl">PHARMACY IMAGERY</div>
                            </div>
                            <div className="absolute -bottom-8 -right-8 bg-primary p-6 rounded-2xl shadow-xl text-white hidden md:block">
                                <p className="text-4xl font-bold mb-1">50+</p>
                                <p className="text-sm opacity-80 uppercase tracking-widest font-bold">Pharmacies onboarded</p>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-3xl md:text-5xl font-bold text-neutral-900 mb-8">Our Mission</h2>
                            <div className="space-y-6 text-lg text-neutral-600 leading-relaxed">
                                <p>
                                    Our mission is to reduce administrative overhead in local pharmacies by 50% within the next 3 years. By automating the most tedious parts of workforce management, we enable pharmacy teams to focus on patient outcomes and community health.
                                </p>
                                <p>
                                    Today, PharmaClock serves independent pharmacies and small chains across the United States, providing them with enterprise-grade tools at an accessible price point.
                                </p>
                                <p className="font-bold text-neutral-900">
                                    Join us on our journey to modernize the pharmaceutical workplace.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
