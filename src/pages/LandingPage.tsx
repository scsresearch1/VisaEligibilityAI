import {
  ArrowRight,
  Brain,
  CheckCircle2,
  FileSearch,
  Globe2,
  Lock,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import Button from '../components/ui/Button'
import { appConfig } from '../config/app.config'

const stats = [
  { value: '50+', label: 'Visa categories analyzed' },
  { value: '99.9%', label: 'Platform uptime SLA' },
  { value: '< 3 min', label: 'Average assessment time' },
  { value: '256-bit', label: 'AES encryption standard' },
]

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    description:
      'Advanced models evaluate your profile against current USCIS criteria and published policy guidance.',
  },
  {
    icon: FileSearch,
    title: 'Document Intelligence',
    description:
      'Structured review of credentials, employment history, and supporting evidence with clear gap identification.',
  },
  {
    icon: Scale,
    title: 'Compliance-First Design',
    description:
      'Built around U.S. immigration data handling standards with audit-ready activity logging.',
  },
  {
    icon: Globe2,
    title: 'Multi-Pathway Coverage',
    description:
      'From employment-based and family-sponsored visas to student and visitor categories — one unified platform.',
  },
  {
    icon: Zap,
    title: 'Real-Time Updates',
    description:
      'Policy change alerts and eligibility recalculation when regulations or forms are updated.',
  },
  {
    icon: Users,
    title: 'Professional review',
    description:
      'Secure export and sharing workflows designed for immigration law firms and accredited representatives.',
  },
]

const steps = [
  { step: '01', title: 'Create your secure account', desc: 'Verify identity with enterprise-grade authentication.' },
  { step: '02', title: 'Complete the guided intake', desc: 'Answer structured questions tailored to your visa goals.' },
  { step: '03', title: 'Receive your eligibility report', desc: 'Get a detailed breakdown with next steps and risk factors.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar variant="light" />

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-950 text-white pt-28 pb-24 lg:pt-36 lg:pb-32 mesh-gradient hero-grid">
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-navy-950/50 to-navy-950 pointer-events-none" />
        <div className="absolute top-1/4 -right-32 w-96 h-96 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="absolute bottom-0 -left-32 w-80 h-80 rounded-full bg-navy-600/30 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm mb-8">
              <Sparkles className="h-4 w-4 text-gold-400" />
              <span>Trusted by immigration professionals nationwide</span>
            </div>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight">
              Know your U.S. visa{' '}
              <span className="italic text-gradient-gold">eligibility</span>
              <br />
              with confidence
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-2xl leading-relaxed">
              {appConfig.appName} delivers precise, AI-driven pathway assessments — secure, transparent,
              and aligned with federal immigration standards.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button to="/login" variant="primary" size="lg">
                Get Started
                <ArrowRight className="h-5 w-5" />
              </Button>
              <a href="#how-it-works">
                <Button variant="outline" size="lg">
                  See How It Works
                </Button>
              </a>
            </div>

            <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/60">
              {['SOC 2 ready architecture', 'No legal advice — informational only', 'HIPAA-aware data practices'].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-gold-400 shrink-0" />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative -mt-12 mx-auto max-w-6xl px-6 lg:px-8 z-10">
        <div className="glass-panel rounded-2xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80">
          {stats.map((stat) => (
            <div key={stat.label} className="px-8 py-8 text-center">
              <p className="text-3xl font-bold text-navy-900 tracking-tight">{stat.value}</p>
              <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-600 mb-3">Platform Capabilities</p>
            <h2 className="font-display text-4xl sm:text-5xl text-navy-900 tracking-tight">
              Everything you need for informed decisions
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              A complete eligibility intelligence suite designed for applicants, employers, and legal teams.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="group rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm hover:shadow-xl hover:shadow-navy-900/5 hover:border-navy-700/20 transition-all duration-300"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-gold-400 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-navy-900">{title}</h3>
                <p className="mt-3 text-slate-600 leading-relaxed">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-navy-900 text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gold-400 mb-3">Simple Process</p>
              <h2 className="font-display text-4xl sm:text-5xl tracking-tight">
                Three steps to clarity
              </h2>
              <p className="mt-4 text-lg text-white/70">
                Our guided workflow removes complexity from visa eligibility research — so you can focus on what matters.
              </p>
              <Button to="/login" variant="primary" size="lg" className="mt-8">
                Start Your Assessment
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-6">
              {steps.map(({ step, title, desc }) => (
                <div
                  key={step}
                  className="flex gap-6 rounded-2xl glass-panel-dark p-6 hover:bg-white/5 transition-colors"
                >
                  <span className="text-4xl font-display text-gold-400/80 shrink-0">{step}</span>
                  <div>
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <p className="mt-1 text-white/60 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="rounded-3xl bg-linear-to-br from-navy-900 via-navy-800 to-navy-950 p-10 lg:p-16 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl" />
            <div className="relative grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 text-gold-400 mb-4">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-widest">Enterprise Security</span>
                </div>
                <h2 className="font-display text-4xl tracking-tight">
                  Your data deserves federal-grade protection
                </h2>
                <p className="mt-4 text-white/70 leading-relaxed">
                  End-to-end encryption, role-based access controls, and comprehensive audit trails —
                  engineered for organizations that cannot compromise on security.
                </p>
              </div>
              <ul className="space-y-4">
                {[
                  { icon: Lock, text: 'AES-256 encryption at rest and in transit' },
                  { icon: ShieldCheck, text: 'Multi-factor authentication & session management' },
                  { icon: FileSearch, text: 'Immutable audit logs for compliance reviews' },
                ].map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="flex items-center gap-4 rounded-xl bg-white/5 border border-white/10 px-5 py-4"
                  >
                    <Icon className="h-5 w-5 text-gold-400 shrink-0" />
                    <span className="text-sm text-white/90">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <h2 className="font-display text-4xl sm:text-5xl text-navy-900 tracking-tight">
            Ready to understand your pathway?
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Join thousands who use {appConfig.appName} for smarter immigration planning.
          </p>
          <Button to="/login" variant="secondary" size="lg" className="mt-8">
            Sign In to Your Account
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  )
}
