import type { ExtractedProfileSignals } from '../benchmark-report/extract-profile'
import { primaryFieldForDeliverables } from '../profile-field-inference'
import { detectProfileArchetype } from './profile-archetype'

export interface DomainDeliverableSet {
  papers: string[]
  patents: string[]
  products: { name: string; financialImpact: string; socialImpact: string; technicalImpact: string }[]
  whitePapers: string[]
}

function isPharmaDomain(field: string, text: string): boolean {
  return /pharma|vaccine|drug|formulation|chitosan|pulmonary|dpi/i.test(`${field} ${text}`)
}

function isEnterpriseIt(field: string, text: string): boolean {
  return /integration|mulesoft|tibco|api|middleware|erp|sap|cloud|edi/i.test(`${field} ${text}`)
}

function isAcademicEngineering(field: string): boolean {
  return /electrical|power|engineering teaching|higher education/i.test(field)
}

function buildPharmaDeliverables(profile: ExtractedProfileSignals, count: number): DomainDeliverableSet {
  const topic = profile.workExperience[0]?.highlights[0]?.slice(0, 60) ?? 'vaccine delivery systems'
  return {
    papers: [
      `Chitosan-Enhanced Pulmonary Vaccine Delivery: Stability and Immunogenicity Framework`,
      `Dry Powder Inhaler (DPI) Formulation Analytics for ${topic}`,
      `Quality-by-Design Metrics for Nano-Particulate Vaccine Carriers`,
    ].slice(0, count),
    patents: [
      'System and Method for Stabilized Pulmonary Vaccine Formulation in DPI Devices',
      'Apparatus for Controlled Release of Chitosan-Coated Vaccine Particles',
    ],
    products: [
      {
        name: 'PulmoVax-DPI Development Kit',
        financialImpact: 'Reduces formulation iteration cost; supports licensing and grant partnerships.',
        socialImpact: 'Improves vaccine access via shelf-stable pulmonary delivery.',
        technicalImpact: 'Demonstrates DPI formulation, aerosol characterization, and batch QA.',
      },
      {
        name: 'NanoForm Vaccine Analytics Dashboard',
        financialImpact: 'Accelerates R&D reporting and regulatory documentation workflows.',
        socialImpact: 'Supports reproducible pharma R&D and training.',
        technicalImpact: 'Software validation package with audit trail for formulation studies.',
      },
    ],
    whitePapers: [
      'Reference architecture for pulmonary vaccine scale-up and DPI validation',
      'Regulatory-ready documentation framework for chitosan vaccine programs',
    ],
  }
}

function buildEnterpriseItDeliverables(
  profile: ExtractedProfileSignals,
  count: number,
): DomainDeliverableSet {
  const anchor = profile.keyClaims.find((c) => /repo|tibco|edi|mulesoft|sap/i.test(c)) ?? profile.keyClaims[0]
  const topic = anchor?.slice(0, 55) ?? 'enterprise integration repositories'
  return {
    papers: [
      'Reliability-Oriented Configuration Drift Detection in Enterprise Integration Repositories',
      'API Modernization Complexity Scoring for Large-Scale ERP and Cloud Migration Programs',
      'Hybrid Cloud Integration Governance for MuleSoft, TIBCO, and SAP S/4HANA Ecosystems',
    ].slice(0, count),
    patents: [
      'System and Method for Detecting Configuration Drift Across Enterprise Integration Repositories',
      'AI-Assisted API Modernization Scoring for Legacy Middleware Migration',
    ],
    products: [
      {
        name: 'Cloud Repository Drift Analyzer',
        financialImpact:
          'Reduces production rework, lowers integration defect cost, improves release predictability.',
        socialImpact:
          'Improves reliability of healthcare, finance, utilities, and public-service integrations.',
        technicalImpact:
          'Repository comparison, drift detection, deployment-risk scoring, API consistency validation.',
      },
      {
        name: 'Enterprise Integration Maturity Analyzer',
        financialImpact: 'Supports pre-sales consulting and transformation planning ROI.',
        socialImpact: 'Helps organizations reduce failed digital transformation risk.',
        technicalImpact: 'Scores API-led architecture, middleware dependency, and ERP migration complexity.',
      },
    ],
    whitePapers: [
      `Technical framework for ${topic} with audit-ready governance`,
      'Reference architecture for hybrid cloud ERP integration at enterprise scale',
    ],
  }
}

function buildAcademicDeliverables(profile: ExtractedProfileSignals, count: number): DomainDeliverableSet {
  const field = primaryFieldForDeliverables(profile.domains, profile.fullText)
  const topic = profile.workExperience[0]?.highlights[0]?.slice(0, 50) ?? 'power electronics laboratories'
  return {
    papers: [
      `AI-Assisted Fault Diagnosis in ${field} Laboratory Instruction`,
      `Renewable Energy Project Outcomes from Supervised Student Engineering Work`,
      `Pedagogical Framework for Outcome-Based Accreditation in ${field}`,
    ].slice(0, count),
    patents: [
      `System for Smart Monitoring of ${field} Training Equipment`,
      'Apparatus for Hybrid Renewable-Energy Laboratory Demonstrators',
    ],
    products: [
      {
        name: 'Renewable Energy & Power Electronics Laboratory Kit',
        financialImpact: 'Reduces lab setup cost; supports institutional procurement and grants.',
        socialImpact: 'Improves hands-on engineering education and workforce readiness.',
        technicalImpact: 'Hardware–software demonstrator with validation reports for original contribution.',
      },
      {
        name: 'Engineering Outcomes Analytics Dashboard',
        financialImpact: 'Streamlines accreditation reporting and project assessment.',
        socialImpact: 'Supports transparent student project evaluation.',
        technicalImpact: 'Documented software with test harness and departmental validation letter.',
      },
    ],
    whitePapers: [
      `Curriculum framework for ${topic}`,
      `Accreditation-aligned technical narrative for ${field} programs`,
    ],
  }
}

export function buildDomainDeliverables(
  profile: ExtractedProfileSignals,
  paperCount: number,
  patentCount: number,
  productCount: number,
): DomainDeliverableSet {
  const field = primaryFieldForDeliverables(profile.domains, profile.fullText)
  const archetype = detectProfileArchetype(profile)

  if (isPharmaDomain(field, profile.fullText) || (archetype === 'research_phd' && profile.patents.length >= 2)) {
    const d = buildPharmaDeliverables(profile, Math.max(paperCount, 3))
    return {
      papers: d.papers.slice(0, paperCount),
      patents: d.patents.slice(0, patentCount),
      products: d.products.slice(0, productCount),
      whitePapers: d.whitePapers,
    }
  }

  if (isEnterpriseIt(field, profile.fullText) || archetype === 'industry_senior') {
    const d = buildEnterpriseItDeliverables(profile, Math.max(paperCount, 3))
    return {
      papers: d.papers.slice(0, paperCount),
      patents: d.patents.slice(0, patentCount),
      products: d.products.slice(0, productCount),
      whitePapers: d.whitePapers,
    }
  }

  if (isAcademicEngineering(field) || archetype === 'academic_teaching') {
    const d = buildAcademicDeliverables(profile, Math.max(paperCount, 3))
    return {
      papers: d.papers.slice(0, paperCount),
      patents: d.patents.slice(0, patentCount),
      products: d.products.slice(0, productCount),
      whitePapers: d.whitePapers,
    }
  }

  const d = buildAcademicDeliverables(profile, paperCount)
  return {
    papers: d.papers.slice(0, paperCount),
    patents: d.patents.slice(0, patentCount),
    products: d.products.slice(0, productCount),
    whitePapers: d.whitePapers,
  }
}

export function publicationTitlesForProfile(
  profile: ExtractedProfileSignals,
  count: number,
): string[] {
  return buildDomainDeliverables(profile, count, 2, 2).papers
}

export function patentTitlesForProfile(profile: ExtractedProfileSignals, count: number): string[] {
  return buildDomainDeliverables(profile, 2, count, 2).patents
}

export function productSpecsForProfile(
  profile: ExtractedProfileSignals,
  count: number,
): DomainDeliverableSet['products'] {
  return buildDomainDeliverables(profile, 2, 2, count).products
}

