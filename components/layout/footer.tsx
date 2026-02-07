import Link from "next/link"

export function Footer() {
    return (
        <footer className="bg-neutral-900 text-neutral-300 py-16 px-4 md:px-6">
            <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                <div className="col-span-2 lg:col-span-1">
                    <Link href="/" className="text-white text-xl font-bold flex items-center gap-2 mb-4">
                        PharmaClock
                    </Link>
                    <p className="text-sm text-neutral-400 max-w-[200px]">
                        Modern pharmacy payroll management with location-verified clock-ins.
                    </p>
                </div>
                <div>
                    <h4 className="text-white font-semibold mb-4">Product</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link href="/features" className="hover:text-primary-400 transition-colors">Features</Link></li>
                        <li><Link href="/pricing" className="hover:text-primary-400 transition-colors">Pricing</Link></li>
                        <li><Link href="/integrations" className="hover:text-primary-400 transition-colors">Integrations</Link></li>
                        <li><Link href="/security" className="hover:text-primary-400 transition-colors">Security</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-white font-semibold mb-4">Resources</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link href="/docs" className="hover:text-primary-400 transition-colors">Documentation</Link></li>
                        <li><Link href="/api" className="hover:text-primary-400 transition-colors">API Reference</Link></li>
                        <li><Link href="/support" className="hover:text-primary-400 transition-colors">Support</Link></li>
                        <li><Link href="/status" className="hover:text-primary-400 transition-colors">Status</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-white font-semibold mb-4">Company</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link href="/about" className="hover:text-primary-400 transition-colors">About</Link></li>
                        <li><Link href="/blog" className="hover:text-primary-400 transition-colors">Blog</Link></li>
                        <li><Link href="/careers" className="hover:text-primary-400 transition-colors">Careers</Link></li>
                        <li><Link href="/contact" className="hover:text-primary-400 transition-colors">Contact</Link></li>
                    </ul>
                </div>
                <div className="col-span-2 md:col-span-1">
                    <h4 className="text-white font-semibold mb-4">Legal</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link href="/privacy" className="hover:text-primary-400 transition-colors">Privacy</Link></li>
                        <li><Link href="/terms" className="hover:text-primary-400 transition-colors">Terms</Link></li>
                        <li><Link href="/hipaa" className="hover:text-primary-400 transition-colors">HIPAA Compliance</Link></li>
                    </ul>
                </div>
            </div>
            <div className="container mx-auto mt-16 pt-8 border-t border-neutral-800 text-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <p>© 2024 PharmaClock. All rights reserved.</p>
                <div className="flex gap-6">
                    <Link href="#" className="hover:text-white">Twitter</Link>
                    <Link href="#" className="hover:text-white">LinkedIn</Link>
                    <Link href="#" className="hover:text-white">GitHub</Link>
                </div>
            </div>
        </footer>
    )
}
