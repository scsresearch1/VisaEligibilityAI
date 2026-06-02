import { Hammer } from 'lucide-react'
import { CONSULTING_BUILD_PRINCIPLE, CONSULTING_BUILD_PRINCIPLE_SHORT } from '../../lib/consulting-build-principle'

interface BuildPrincipleBannerProps {
  compact?: boolean
}

export default function BuildPrincipleBanner({ compact }: BuildPrincipleBannerProps) {
  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-navy-900 flex gap-3">
      <Hammer className="h-5 w-5 text-gold-600 shrink-0 mt-0.5" aria-hidden />
      <div>
        <p className="font-semibold">Consulting build model</p>
        <p className="mt-1 text-slate-700 leading-relaxed">
          {compact ? CONSULTING_BUILD_PRINCIPLE_SHORT : CONSULTING_BUILD_PRINCIPLE}
        </p>
      </div>
    </div>
  )
}
