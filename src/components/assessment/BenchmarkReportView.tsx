import { useMemo } from 'react'
import type { BenchmarkReport } from '../../types/benchmark-report'
import { sanitizeBenchmarkForDisplay } from '../../lib/benchmark-report/sanitize-display'
import {
  displayReportFootnote,
  displaySubmissionReadyStatus,
} from '../../lib/user-facing-labels'

interface BenchmarkReportViewProps {
  report: BenchmarkReport
}

export default function BenchmarkReportView({ report }: BenchmarkReportViewProps) {
  const r = useMemo(() => sanitizeBenchmarkForDisplay(report), [report])

  return (
    <article className="benchmark-report space-y-10 text-slate-800">
      <header className="border-b border-slate-200 pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-600">
          Visa Eligibility AI Benchmark Report
        </p>
        <h2 className="mt-2 font-display text-3xl text-navy-900 tracking-tight">{r.reportTitle}</h2>
        <p className="mt-2 text-sm text-slate-500">
          Generated {new Date(r.generatedAt).toLocaleString()} · {r.visaCategory}
        </p>
      </header>

      <section>
        <h3 className="text-lg font-bold text-navy-900">1. Corrected Evaluation Logic</h3>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-700">
          {r.evaluationLogic.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-navy-900 text-white p-6">
        <h3 className="text-lg font-bold text-gold-400">2. Current EB1A Baseline</h3>
        <dl className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-white/60">Current EB1A Readiness</dt>
            <dd className="text-2xl font-bold mt-1">{r.baseline.readinessScore} / 100</dd>
          </div>
          <div>
            <dt className="text-white/60">Evidence Strength</dt>
            <dd className="text-lg font-semibold mt-1">{r.baseline.evidenceStrength}</dd>
          </div>
          <div>
            <dt className="text-white/60">Submission-ready status</dt>
            <dd className="text-lg font-semibold mt-1 text-amber-300">
              {displaySubmissionReadyStatus(r.baseline.attorneyReadyStatus)}
            </dd>
          </div>
          <div>
            <dt className="text-white/60">Primary Gap</dt>
            <dd className="mt-1">{r.baseline.primaryGap}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-white/60">Consulting Requirement</dt>
            <dd className="mt-1">{r.baseline.consultingRequirement}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-white/60">Verification</dt>
            <dd className="mt-1">{r.baseline.verificationOwner}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 className="text-lg font-bold text-navy-900">3. Final Quantified Roadmap Output</h3>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-navy-900 text-white text-left">
                <th className="px-4 py-3 font-semibold">Roadmap area</th>
                <th className="px-3 py-3 font-semibold">Outline</th>
                <th className="px-3 py-3 font-semibold">Current</th>
                <th className="px-3 py-3 font-semibold">Target</th>
                <th className="px-3 py-3 font-semibold">Qty to Build</th>
                <th className="px-3 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold">Consulting Team Responsibility</th>
              </tr>
            </thead>
            <tbody>
              {r.roadmapTable.map((row, i) => (
                <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-4 py-3 font-medium text-navy-900 align-top">{row.area}</td>
                  <td className="px-3 py-3 align-top text-slate-600 text-xs">
                    {row.areaOutline || '—'}
                  </td>
                  <td className="px-3 py-3 align-top tabular-nums">{row.currentScore}/100</td>
                  <td className="px-3 py-3 align-top tabular-nums">{row.targetScore}/100</td>
                  <td className="px-3 py-3 align-top font-bold text-navy-900">{row.quantityToBuild}</td>
                  <td className="px-3 py-3 align-top">
                    <span
                      className={[
                        'inline-block px-2 py-0.5 rounded text-xs font-semibold',
                        row.priority === 'Critical'
                          ? 'bg-red-100 text-red-800'
                          : row.priority === 'High'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-slate-100 text-slate-700',
                      ].join(' ')}
                    >
                      {row.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top text-slate-600">{row.consultingResponsibility}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold text-navy-900">4. Total Roadmap Build Requirement</h3>
        <p className="mt-2 text-sm font-medium text-navy-900">Minimum recommended build package:</p>
        <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm text-slate-700">
          {r.minimumBuildPackage.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-gold-600">•</span>
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xl font-bold text-navy-900">
          Total roadmap assets to build: <span className="text-gold-600">{r.totalAssetsToBuild}</span>
        </p>
      </section>

      {r.sections.map((sec) => (
        <section key={sec.id}>
          <h3 className="text-lg font-bold text-navy-900">
            {sec.number}. {sec.title}
          </h3>
          {sec.intro && <p className="mt-2 text-sm text-slate-600">{sec.intro}</p>}
          {sec.items && (
            <div className="mt-4 space-y-4">
              {sec.items.map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 p-5 bg-white">
                  <h4 className="font-semibold text-navy-900">{item.title}</h4>
                  {item.purpose && <p className="mt-2 text-sm text-slate-600"><strong>Purpose:</strong> {item.purpose}</p>}
                  {item.technicalBasis && <p className="mt-2 text-sm text-slate-600"><strong>Technical basis:</strong> {item.technicalBasis}</p>}
                  {item.eb1aContribution && (
                    <p className="mt-2 text-sm text-emerald-800"><strong>EB1A contribution:</strong> {item.eb1aContribution}</p>
                  )}
                  {item.coreModules && (
                    <ul className="mt-2 text-sm text-slate-600 list-disc pl-5">
                      {item.coreModules.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
          {sec.table && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border border-slate-200">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-4 py-2 text-left">EB1A Evidence Area</th>
                    <th className="px-4 py-2 text-left">Current</th>
                    <th className="px-4 py-2 text-left">Build</th>
                    <th className="px-4 py-2 text-left">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {sec.table.map((t) => (
                    <tr key={t.label} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium">{t.label}</td>
                      <td className="px-4 py-2">{t.current}</td>
                      <td className="px-4 py-2">{t.build}</td>
                      <td className="px-4 py-2">{t.target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <section>
        <h3 className="text-lg font-bold text-navy-900">Implementation Timeline</h3>
        <ol className="mt-4 space-y-4">
          {r.timeline.map((phase) => (
            <li key={phase.phase} className="rounded-xl border border-slate-200 p-4">
              <p className="font-semibold text-navy-900">{phase.phase}</p>
              <p className="text-sm text-slate-500">Duration: {phase.duration}</p>
              <ul className="mt-2 text-sm text-slate-600 list-disc pl-5">
                {phase.outputs.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border-2 border-gold-500/30 bg-gold-500/5 p-6">
        <h3 className="text-lg font-bold text-navy-900">Final Benchmark Conclusion</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          {r.conclusion.summary}
        </p>
        <dl className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-slate-500">Current readiness</dt>
            <dd className="font-bold text-navy-900">{r.conclusion.currentReadiness} / 100</dd>
          </div>
          <div>
            <dt className="text-slate-500">Projected after roadmap</dt>
            <dd className="font-bold text-emerald-700">
              {r.conclusion.projectedReadinessMin}–{r.conclusion.projectedReadinessMax} / 100
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Projected submission-ready score</dt>
            <dd className="font-bold text-navy-900">
              {r.conclusion.projectedAttorneyMin}–{r.conclusion.projectedAttorneyMax} / 100
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Total assets</dt>
            <dd className="font-bold text-navy-900">{r.conclusion.totalAssets}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-slate-500">{displayReportFootnote(r)}</p>
      </section>
    </article>
  )
}
