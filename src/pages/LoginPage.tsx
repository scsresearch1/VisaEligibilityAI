import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { appConfig } from '../config/app.config'
import { signIn, validateCredentials } from '../lib/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    await new Promise((r) => setTimeout(r, 400))

    if (validateCredentials(username, password)) {
      signIn()
      navigate('/dashboard', { replace: true }) // Assessment hub
      return
    }

    setError('Invalid username or password. Please try again.')
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <aside className="hidden lg:flex lg:w-[48%] relative bg-navy-950 text-white overflow-hidden">
        <div className="absolute inset-0 mesh-gradient hero-grid" />
        <div className="absolute top-1/3 -left-20 w-72 h-72 rounded-full bg-gold-500/15 blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 rounded-full bg-navy-600/40 blur-3xl" />

        <div className="relative flex flex-col justify-between p-12 xl:p-16 w-full">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="max-w-md">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-500/20 text-gold-400 mb-8">
              <Shield className="h-7 w-7" />
            </div>
            <h1 className="font-display text-4xl xl:text-5xl leading-tight tracking-tight">
              Secure access to your{' '}
              <span className="italic text-gradient-gold">eligibility workspace</span>
            </h1>
            <p className="mt-6 text-white/60 leading-relaxed">
              Sign in to continue assessments, review reports, and manage your immigration profile — all in one protected dashboard.
            </p>

            <ul className="mt-12 space-y-4">
              {[
                'Bank-level encryption for all sessions',
                'Automatic session timeout for inactive users',
                'Full activity history available for export',
              ].map((text) => (
                <li key={text} className="flex items-start gap-3 text-sm text-white/70">
                  <ShieldCheck className="h-5 w-5 text-gold-400 shrink-0 mt-0.5" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} {appConfig.appName}. Protected by industry-standard security controls.
          </p>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24 bg-slate-50">
        <div className="lg:hidden mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>

        <div className="w-full max-w-md mx-auto">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-navy-900">{appConfig.appName}</p>
              <p className="text-xs text-slate-500 uppercase tracking-widest">Sign In</p>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight">
            Welcome back
          </h2>
          <p className="mt-2 text-slate-600">
            Enter your credentials to access your account.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Input
              label="Username"
              type="text"
              name="username"
              autoComplete="username"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={[
                    'w-full px-4 py-3 pr-12 rounded-xl border bg-white text-slate-900 placeholder:text-slate-400',
                    'focus:outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-700 transition-colors hover:border-slate-300',
                    error ? 'border-red-400' : 'border-slate-200',
                  ].join(' ')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-navy-900 focus:ring-navy-900/20"
                />
                <span className="text-sm text-slate-600">Remember me</span>
              </label>
              <button type="button" className="text-sm font-medium text-navy-700 hover:text-navy-900 transition-colors">
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              variant="secondary"
              size="lg"
              fullWidth
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          {appConfig.features.enableGoogleSignIn && (
            <>
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest">
                  <span className="bg-slate-50 px-4 text-slate-400">Or continue with</span>
                </div>
              </div>
              <Button variant="ghost" size="lg" fullWidth className="border border-slate-200 bg-white">
                <Mail className="h-4 w-4" />
                Google
              </Button>
            </>
          )}

          {appConfig.features.enableRegistration && (
            <p className="mt-8 text-center text-sm text-slate-600">
              Don&apos;t have an account?{' '}
              <button type="button" className="font-semibold text-navy-900 hover:text-gold-600 transition-colors">
                Request access
              </button>
            </p>
          )}

          <p className="mt-10 text-center text-xs text-slate-400 leading-relaxed">
            By signing in, you agree to our Terms of Service and Privacy Policy.
            Need help? Contact{' '}
            <a href={`mailto:${appConfig.supportEmail}`} className="text-navy-700 hover:underline">
              {appConfig.supportEmail}
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
