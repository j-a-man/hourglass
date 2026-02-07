import { Check, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function PricingPage() {
    const tiers = [
        {
            name: "Starter",
            price: "19",
            description: "Perfect for single locations with small teams.",
            features: [
                "Up to 5 employees",
                "1 Pharmacy location",
                "Basic attendance tracking",
                "Email support"
            ]
        },
        {
            name: "Professional",
            price: "49",
            description: "Everything you need to automate your payroll.",
            featured: true,
            features: [
                "Up to 25 employees",
                "Unlimited locations",
                "Bi-weekly CSV exports",
                "Precision Geofencing",
                "Scheduling calendar",
                "Priority support"
            ]
        },
        {
            name: "Enterprise",
            price: "99",
            description: "For large pharmacy chains and custom needs.",
            features: [
                "Unlimited employees",
                "Whitelabel option",
                "API access",
                "Dedicated account manager",
                "Custom integrations",
                "HIPAA BAA agreement"
            ]
        }
    ]

    return (
        <div className="flex flex-col pb-24">
            <section className="bg-neutral-50 py-24">
                <div className="container mx-auto px-4 md:px-6 text-center max-w-3xl">
                    <h1 className="text-4xl md:text-6xl font-bold text-neutral-900 mb-6">Simple, fair pricing.</h1>
                    <p className="text-xl text-neutral-600">
                        Choose the plan that fits your pharmacy. All plans include a 14-day free trial. No credit card required.
                    </p>
                </div>
            </section>

            <section className="py-24 px-4 md:px-6">
                <div className="container mx-auto">
                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {tiers.map((tier) => (
                            <div
                                key={tier.name}
                                className={`relative flex flex-col p-8 bg-white rounded-3xl border ${tier.featured ? "border-primary shadow-2xl scale-105 z-10" : "border-neutral-100 shadow-sm"
                                    }`}
                            >
                                {tier.featured && (
                                    <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs font-bold py-1 px-3 rounded-full">
                                        MOST POPULAR
                                    </span>
                                )}
                                <div className="mb-8">
                                    <h3 className="text-xl font-bold text-neutral-900 mb-2">{tier.name}</h3>
                                    <p className="text-neutral-500 text-sm">{tier.description}</p>
                                </div>
                                <div className="flex items-baseline gap-1 mb-8">
                                    <span className="text-4xl font-bold text-neutral-900">${tier.price}</span>
                                    <span className="text-neutral-500 text-sm">/per month</span>
                                </div>
                                <Link href="/get-started" className="mb-8">
                                    <Button
                                        className="w-full h-12 rounded-xl"
                                        variant={tier.featured ? "default" : "outline"}
                                    >
                                        Start free trial
                                    </Button>
                                </Link>
                                <div className="space-y-4">
                                    <p className="text-sm font-bold text-neutral-400 uppercase tracking-wider">What's included</p>
                                    <ul className="space-y-3">
                                        {tier.features.map((feature) => (
                                            <li key={feature} className="flex items-center gap-3 text-neutral-700 text-sm">
                                                <Check className="h-4 w-4 text-semantic-success flex-shrink-0" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Placeholder */}
            <section className="py-24 bg-neutral-900 text-white">
                <div className="container mx-auto px-4 md:px-6 max-w-4xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
                        <p className="text-neutral-400">Everything you need to know about PharmaClock.</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        {[
                            { q: "Can I cancel anytime?", a: "Yes, you can cancel your subscription at any time with one click from your settings." },
                            { q: "Do you offer HIPAA compliance?", a: "Our Enterprise plan includes a signed Business Associate Agreement (BAA)." },
                            { q: "How does the trial work?", a: "You get full access to all Professional features for 14 days. No credit card required to start." },
                            { q: "What payroll systems do you support?", a: "We export CSVs compatible with QuickBooks, ADP, Xero, Gusto, and more." }
                        ].map((faq, i) => (
                            <div key={i} className="p-6 rounded-2xl bg-neutral-800 border border-neutral-700">
                                <h4 className="font-bold flex items-center gap-2 mb-3">
                                    <HelpCircle className="h-4 w-4 text-primary" />
                                    {faq.q}
                                </h4>
                                <p className="text-neutral-400 text-sm leading-relaxed">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    )
}
