import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MapPin, FileSpreadsheet, BarChart3, Smartphone, Clock, Check } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32 lg:pt-32 lg:pb-40">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              The trusted standard for 500+ businesses
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-neutral-900 mb-6">
              The modern way to track <span className="text-primary italic">time</span> and <span className="text-primary italic">operations</span>.
            </h1>
            <p className="text-lg md:text-xl text-neutral-600 mb-10 max-w-2xl">
              Hourglass helps business owners streamline attendance with precision geofencing and automated payroll exports. Built for trust, designed for scale.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link href="/get-started" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:px-10 h-14 text-lg rounded-xl">
                  Start your 14-day free trial
                </Button>
              </Link>
              <Link href="/features" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:px-10 h-14 text-lg rounded-xl bg-white">
                  See how it works
                </Button>
              </Link>
            </div>

            {/* Visual Social Proof / Branding */}
            <div className="mt-16 flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale">
              {["Gusto", "QuickBooks", "ADP", "Xero"].map((partner) => (
                <div key={partner} className="text-xl font-semibold text-neutral-400">{partner}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-secondary/5 rounded-full blur-[100px]"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-neutral-50/50" id="features">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">Precision tools for busy pharmacies</h2>
            <p className="text-neutral-600">Eliminate manual logs and human error with our automated workforce management suite.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-xl mb-3">Precision Geofencing</h3>
              <p className="text-neutral-600 text-sm leading-relaxed">
                Staff can only clock in when they are within 100 meters of the pharmacy location. Verified by GPS and IP.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-6">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-xl mb-3">Payroll-Ready Exports</h3>
              <p className="text-neutral-600 text-sm leading-relaxed">
                Generate bi-weekly CSV reports formatted for QuickBooks, ADP, or Gusto in seconds.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-accent-purple/10 rounded-xl flex items-center justify-center text-accent-purple mb-6">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-xl mb-3">Live Labor Analytics</h3>
              <p className="text-neutral-600 text-sm leading-relaxed">
                See who's clocked in across all locations in real-time. Track overtime before it happens.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-accent-yellow/10 rounded-xl flex items-center justify-center text-accent-yellow mb-6">
                <Smartphone className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-xl mb-3">Mobile-First UI</h3>
              <p className="text-neutral-600 text-sm leading-relaxed">
                A simple, intuitive interface for technicians and pharmacists. Works on any device without app stores.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-4 md:px-6" id="pricing">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-neutral-600">Grow your pharmacy without worrying about per-user costs.</p>
          </div>

          <div className="max-w-xl mx-auto bg-white rounded-3xl border border-primary/20 shadow-xl overflow-hidden">
            <div className="p-8 md:p-12 text-center border-b border-neutral-50 flex flex-col items-center">
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold mb-4">MOST POPULAR</span>
              <h3 className="text-lg font-bold text-neutral-500 mb-2">Professional Plan</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-bold text-neutral-900">$49</span>
                <span className="text-neutral-500">/per month</span>
              </div>
              <Button size="lg" className="w-full h-12 rounded-xl text-lg">Start free trial</Button>
            </div>
            <div className="p-8 md:p-12 bg-neutral-50/30">
              <ul className="space-y-4">
                {[
                  "Up to 25 employees included",
                  "Unlimited pharmacy locations",
                  "Automated bi-weekly payroll exports",
                  "Precision GPS geofencing",
                  "Real-time attendance dashboard",
                  "HIPAA compliant security"
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-neutral-700">
                    <div className="h-5 w-5 bg-primary/20 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 container mx-auto px-4 md:px-6">
        <div className="bg-primary rounded-3xl p-8 md:p-16 text-center text-white relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to automate your pharmacy's payroll?</h2>
            <p className="text-primary-100 text-lg mb-10">
              Join 50+ pharmacies who have simplified their workforce management. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/get-started">
                <Button size="lg" className="bg-white text-primary hover:bg-neutral-100 h-14 px-10 rounded-xl text-lg w-full sm:w-auto">
                  Get Started for Free
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="ghost" size="lg" className="text-white hover:bg-white/10 h-14 px-10 rounded-xl text-lg w-full sm:w-auto">
                  Book a Demo
                </Button>
              </Link>
            </div>
          </div>

          {/* Background Patterns for CTA */}
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Clock className="h-64 w-64" />
          </div>
          <div className="absolute bottom-0 left-0 p-8 opacity-10">
            <MapPin className="h-32 w-32" />
          </div>
        </div>
      </section>
    </div>
  )
}