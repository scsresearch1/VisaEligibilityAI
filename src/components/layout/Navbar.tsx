import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Shield } from 'lucide-react'
import { useState } from 'react'
import { appConfig } from '../../config/app.config'
import Button from '../ui/Button'

interface NavbarProps {
  variant?: 'light' | 'dark'
}

export default function Navbar({ variant = 'light' }: NavbarProps) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const isDark = variant === 'dark'

  const linkClass = (path: string) =>
    [
      'text-sm font-medium transition-colors',
      location.pathname === path
        ? isDark
          ? 'text-gold-400'
          : 'text-navy-900'
        : isDark
          ? 'text-white/80 hover:text-white'
          : 'text-slate-600 hover:text-navy-900',
    ].join(' ')

  return (
    <header
      className={[
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isDark ? 'bg-navy-950/80 backdrop-blur-xl border-b border-white/5' : 'bg-white/80 backdrop-blur-xl border-b border-slate-200/60',
      ].join(' ')}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link to="/" className="flex items-center gap-3 group">
          <div
            className={[
              'flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
              isDark ? 'bg-gold-500/20 text-gold-400' : 'bg-navy-900 text-gold-400',
            ].join(' ')}
          >
            <Shield className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className={['text-base font-bold tracking-tight', isDark ? 'text-white' : 'text-navy-900'].join(' ')}>
              {appConfig.appName}
            </span>
            <span className={['text-[10px] uppercase tracking-widest', isDark ? 'text-white/50' : 'text-slate-500'].join(' ')}>
              Secure Assessment
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className={linkClass('')}>
            Features
          </a>
          <a href="#how-it-works" className={linkClass('')}>
            How It Works
          </a>
          <a href="#trust" className={linkClass('')}>
            Security
          </a>
          <Button to="/login" variant={isDark ? 'outline' : 'secondary'} size="sm">
            Sign In
          </Button>
        </div>

        <button
          type="button"
          className={['md:hidden p-2 rounded-lg', isDark ? 'text-white' : 'text-navy-900'].join(' ')}
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <div className={['md:hidden border-t px-6 py-4 space-y-4', isDark ? 'border-white/10 bg-navy-950' : 'border-slate-200 bg-white'].join(' ')}>
          <a href="#features" className="block py-2 text-sm font-medium" onClick={() => setOpen(false)}>
            Features
          </a>
          <a href="#how-it-works" className="block py-2 text-sm font-medium" onClick={() => setOpen(false)}>
            How It Works
          </a>
          <a href="#trust" className="block py-2 text-sm font-medium" onClick={() => setOpen(false)}>
            Security
          </a>
          <Button to="/login" variant="secondary" size="md" fullWidth onClick={() => setOpen(false)}>
            Sign In
          </Button>
        </div>
      )}
    </header>
  )
}
