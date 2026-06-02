import { appConfig } from '../../config/app.config'
import { isGeminiReady, isGroqReady, usesHybridRouting } from '../llm/llm-router'

export interface ModelStackEntry {
  role: string
  provider: string
  model: string
  task: string
}

export function getAnalysisModelStack(): ModelStackEntry[] {
  const stack: ModelStackEntry[] = [
    {
      role: 'Deterministic',
      provider: 'Rule engine',
      model: '8 CFR §204.5 rubric',
      task: 'Criterion scoring & regulatory mapping',
    },
    {
      role: 'Structural',
      provider: 'Section parser',
      model: 'Multi-layout CV segmenter',
      task: 'Document segmentation & entity resolution',
    },
  ]

  if (usesHybridRouting()) {
    if (isGroqReady()) {
      stack.unshift({
        role: 'Long-context',
        provider: 'Groq',
        model: appConfig.llm.groqModel,
        task: 'Scientific assessment JSON · roadmap synthesis',
      })
    }
    if (isGeminiReady()) {
      stack.unshift({
        role: 'Critical reasoning',
        provider: 'Google',
        model: appConfig.llm.geminiModel,
        task: 'Strategy insights · fallback reconciliation',
      })
    }
  } else if (appConfig.llm.provider === 'groq' && isGroqReady()) {
    stack.unshift({
      role: 'Primary LLM',
      provider: 'Groq',
      model: appConfig.llm.groqModel,
      task: 'Full assessment & insights',
    })
  } else if (isGeminiReady()) {
    stack.unshift({
      role: 'Primary LLM',
      provider: 'Google',
      model: appConfig.llm.geminiModel,
      task: 'Full assessment & insights',
    })
  }

  return stack
}
