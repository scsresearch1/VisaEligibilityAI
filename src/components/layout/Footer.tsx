import { Link } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { appConfig } from '../../config/app.config'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-navy-950 text-white border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/20 text-gold-400">
                <Shield className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold">{appConfig.appName}</span>
            </Link>
            <p className="mt-4 max-w-md text-sm text-white/60 leading-relaxed">
              Enterprise-grade AI assessment for U.S. visa eligibility. Built with security,
              transparency, and compliance at the core.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-white/70">
              <li><a href="#features" className="hover:text-gold-400 transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-gold-400 transition-colors">How It Works</a></li>
              <li><Link to="/login" className="hover:text-gold-400 transition-colors">Sign In</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">Legal</h4>
            <ul className="space-y-3 text-sm text-white/70">
              <li><span className="cursor-default">Privacy Policy</span></li>
              <li><span className="cursor-default">Terms of Service</span></li>
              <li><span className="cursor-default">Disclaimer</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-4 text-xs text-white/40">
          <p>© {year} {appConfig.appName}. All rights reserved.</p>
          <p>
            This tool provides informational guidance only — not legal advice. Consult a qualified immigration professional before filing.
          </p>
        </div>
      </div>
    </footer>
  )
}
