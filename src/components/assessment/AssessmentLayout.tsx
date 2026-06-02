import { Link, Outlet, useLocation } from 'react-router-dom'
import { LogOut, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AssessmentProvider } from '../../context/AssessmentContext'
import { FLOW_STEPS } from '../../lib/assessment-flow'
import { appConfig } from '../../config/app.config'
import { signOut } from '../../lib/auth'
import Button from '../ui/Button'
import AssessmentSidebar from './AssessmentSidebar'

function AssessmentShell() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const currentStep = FLOW_STEPS.find((s) => s.path === pathname)

  const handleSignOut = () => {
    signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-gold-400">
                <Shield className="h-4 w-4" />
              </div>
              <span className="font-bold text-navy-900 text-sm sm:text-base hidden sm:inline">{appConfig.appName}</span>
            </Link>
            {currentStep && (
              <span className="hidden md:inline text-sm text-slate-500 border-l border-slate-200 pl-4">
                {currentStep.title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button to="/dashboard" variant="ghost" size="sm">
              Hub
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <AssessmentSidebar />
          <main className="flex-1 min-w-0">
            <div className="glass-panel rounded-2xl p-6 sm:p-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

function AssessmentGate() {
  return (
    <AssessmentProvider>
      <AssessmentShell />
    </AssessmentProvider>
  )
}

export default function AssessmentLayout() {
  return <AssessmentGate />
}
