import BuildPrincipleBanner from '../../components/assessment/BuildPrincipleBanner'
import EvidenceBuildPlanView from '../../components/assessment/EvidenceBuildPlanView'
import { StepGuard } from '../../hooks/useStepGuard'
import StepInterimHeader from '../../components/assessment/StepInterimHeader'
import StepNavigation from '../../components/assessment/StepNavigation'
import { UI_COPY } from '../../lib/ui-copy'

export default function RecommendationsPage() {
  return (
    <StepGuard stepId="recommendations">
      <RecommendationsContent />
    </StepGuard>
  )
}

function RecommendationsContent() {
  return (
    <>
      <StepInterimHeader
        stepId="recommendations"
        title={UI_COPY.recommendationsTitle}
        description={UI_COPY.recommendationsDescription}
      />

      <div className="mt-4">
        <BuildPrincipleBanner compact />
      </div>

      <EvidenceBuildPlanView />

      <StepNavigation stepId="recommendations" />
    </>
  )
}
