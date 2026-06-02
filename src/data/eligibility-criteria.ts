import type { VisaCriterion } from '../types/assessment'

/**
 * Official EB-1 pathway criteria — aligned to INA §203(b)(1) and 8 CFR §204.5.
 * Numbering follows RM checklists; regulatory mapping noted per row.
 * Assessment must use evidenceStandard — no assumptions beyond uploaded profile.
 */
export const VISA_CRITERIA: VisaCriterion[] = [
  // —— EB-1A (8 CFR §204.5(h)(3) — ten regulatory criteria; items 11–12 = final merits) ——
  {
    id: 'eb1a-1',
    category: 'EB1A',
    code: '1',
    title: 'Nationally or internationally recognized awards or honors',
    regulatoryCitation: '8 CFR §204.5(h)(3)(i) — lesser nationally/internationally recognized prizes or awards for excellence.',
    description:
      'Document receipt of prizes or awards for excellence in the field of endeavor. The award must be recognized beyond the employer and tied to the beneficiary’s discipline.',
    evidenceStandard:
      'Award certificate or official announcement; criteria for selection; scope (national/international); number of recipients; significance of granting body. Internal employer-only awards generally do not qualify without broader recognition.',
    evaluationCaution:
      'Do not treat participation certificates, training completions, or university grades as qualifying awards unless profile shows independent recognition.',
  },
  {
    id: 'eb1a-2',
    category: 'EB1A',
    code: '2',
    title: 'Membership in associations requiring outstanding achievements',
    regulatoryCitation: '8 CFR §204.5(h)(3)(ii) — membership requiring outstanding achievements judged by experts.',
    description:
      'Membership in associations in the field that require outstanding achievements for admission, as judged by recognized national or international experts in the discipline.',
    evidenceStandard:
      'Association bylaws or admission standards; evidence that membership is selective (not fee-only open enrollment); expert review process; beneficiary’s admission documentation.',
    evaluationCaution:
      'General professional memberships (pay-to-join, student chapters only) do not satisfy this criterion without selective achievement requirements in the record.',
  },
  {
    id: 'eb1a-3',
    category: 'EB1A',
    code: '3',
    title: 'Published material about the beneficiary',
    regulatoryCitation:
      '8 CFR §204.5(h)(3)(iii) — published material in professional/major trade publications or major media about the beneficiary’s work.',
    description:
      'Published material about the beneficiary (not merely by the beneficiary) in professional journals, major trade publications, or other major media, relating to work in the field of endeavor.',
    evidenceStandard:
      'Full article with title, date, author, circulation or journal metrics; translation if not English; proof of publication channel significance. Press releases solely initiated by employer count less unless independent editorial coverage is shown.',
    evaluationCaution:
      'Self-authored blog posts, LinkedIn articles, or employer marketing pages about the beneficiary are not “about” the beneficiary in the regulatory sense unless profile shows independent third-party publication.',
  },
  {
    id: 'eb1a-4',
    category: 'EB1A',
    code: '4',
    title: 'Judge, reviewer, panelist, or evaluator of others’ work',
    regulatoryCitation:
      '8 CFR §204.5(h)(3)(iv) — participation as judge of the work of others in the same or allied field.',
    description:
      'Service as a judge, reviewer, panelist, or evaluator of the work of others in the same or a closely allied field of specialization.',
    evidenceStandard:
      'Invitation letters, program committee appointments, peer-review logs, journal reviewer certificates, grant panel service, competition judging with scope and selection process.',
    evaluationCaution:
      'Routine internal code review or student grading without profile evidence of external peer review does not qualify unless documented as field-wide evaluation duty.',
  },
  {
    id: 'eb1a-5',
    category: 'EB1A',
    code: '5',
    title: 'Original contributions of major significance',
    regulatoryCitation:
      '8 CFR §204.5(h)(3)(v) — original scientific, scholarly, artistic, athletic, or business contributions of major significance.',
    description:
      'Original contributions of major significance to the field — impact must be field-wide, not only internal to one employer, unless employer work is proven to have broader adoption or influence.',
    evidenceStandard:
      'Patents with citation or licensing; deployed products with adoption metrics; research cited by independent groups; expert letters explaining significance; industry adoption, standards influence, or repeatable impact data.',
    evaluationCaution:
      'Job duties described as “innovative” without patents, citations, deployments, or independent expert validation must be scored weak/unsupported — do not assume major significance.',
  },
  {
    id: 'eb1a-6',
    category: 'EB1A',
    code: '6',
    title: 'Authorship of scholarly articles',
    regulatoryCitation:
      '8 CFR §204.5(h)(3)(vi) — authorship of scholarly articles in professional or major trade publications or major media.',
    description:
      'Authorship of scholarly articles in the field in peer-reviewed journals, professional publications, or major trade media.',
    evidenceStandard:
      'Bibliography with journal name, date, co-authors; peer-review status; indexing (e.g., Scopus, Web of Science) if claimed; citation counts from verifiable sources. Conference abstracts alone are weaker than journal articles.',
    evaluationCaution:
      'Thesis titles, internal reports, or unverifiable publication claims without venue detail must not be scored as strong scholarly authorship.',
  },
  {
    id: 'eb1a-7',
    category: 'EB1A',
    code: '7',
    title: 'Display of work at artistic exhibitions or showcases',
    regulatoryCitation: '8 CFR §204.5(h)(3)(vii) — display of work at artistic exhibitions or showcases.',
    description:
      'Display of work at artistic exhibitions or showcases (most relevant for arts/design; may be inapplicable to pure engineering profiles — note N/A if field is non-artistic).',
    evidenceStandard:
      'Exhibition catalogs, invitations, reviews, sales records at recognized venues; proof the beneficiary’s work was displayed (not only attendance).',
    evaluationCaution:
      'If profile is STEM-only with no artistic work, mark as not applicable rather than inventing exhibition evidence.',
  },
  {
    id: 'eb1a-8',
    category: 'EB1A',
    code: '8',
    title: 'Leading or critical role for distinguished organizations',
    regulatoryCitation:
      '8 CFR §204.5(h)(3)(viii) — leading or critical role for organizations or establishments with distinguished reputation.',
    description:
      'Performance in a leading or critical role for organizations or establishments with a distinguished reputation in the field.',
    evidenceStandard:
      'Organizational reputation evidence (rankings, funding, market position); org chart; role scope; letters tying beneficiary’s role to organizational outcomes; “critical” requires proven dependence on beneficiary’s contributions.',
    evaluationCaution:
      'Standard job titles without distinguished-org proof or without showing leading/critical impact must not be scored as satisfied.',
  },
  {
    id: 'eb1a-9',
    category: 'EB1A',
    code: '9',
    title: 'High salary or remuneration',
    regulatoryCitation:
      '8 CFR §204.5(h)(3)(ix) — high salary or significantly high remuneration relative to others in the field.',
    description:
      'Commanding a high salary or other significantly high remuneration for services in relation to others in the field, supported by objective comparative data.',
    evidenceStandard:
      'Tax returns, pay slips, offer letters, compensation surveys (geography + role + field); W-2/1099; benchmarking from reputable salary surveys — not employer assertions alone.',
    evaluationCaution:
      'Do not infer “high salary” from senior title alone; without figures and comparators, score unsupported/missing.',
  },
  {
    id: 'eb1a-10',
    category: 'EB1A',
    code: '10',
    title: 'Commercial success in the performing arts',
    regulatoryCitation: '8 CFR §204.5(h)(3)(x) — commercial success in the performing arts.',
    description:
      'Commercial success in the performing arts (box office, sales, streaming, ratings) — typically N/A for non-performing-arts fields.',
    evidenceStandard:
      'Verifiable revenue, attendance, chart rankings, contracts, industry reports tied to the beneficiary’s performances.',
    evaluationCaution:
      'For engineering/academic profiles, state not applicable unless profile documents performing-arts commercial metrics.',
  },
  {
    id: 'eb1a-11',
    category: 'EB1A',
    code: '11',
    title: 'Sustained national or international acclaim',
    regulatoryCitation: 'Final merits — Kazarian step 2; INA §203(b)(1)(A) extraordinary ability standard.',
    description:
      'Holistic factor: whether acclaim is sustained over time and recognized nationally or internationally, not isolated or short-term success.',
    evidenceStandard:
      'Timeline of achievements; progression of impact; geographic spread of recognition; independent validators across multiple years.',
    evaluationCaution:
      'Single recent achievement does not prove sustained acclaim without documented continuity.',
  },
  {
    id: 'eb1a-12',
    category: 'EB1A',
    code: '12',
    title: 'Small percentage at the top of the field',
    regulatoryCitation: 'Final merits — “small percentage at the very top of the field of endeavor.”',
    description:
      'Holistic factor: whether the beneficiary is among the small percentage who have risen to the very top of the field of endeavor.',
    evidenceStandard:
      'Comparative expert testimony; elite fellowships; field-wide impact metrics; awards and roles considered in totality with regulatory criteria.',
    evaluationCaution:
      'Do not declare “top of field” from self-description; requires corroborated comparative standing.',
  },
  // —— EB-1B (8 CFR §204.5(i)(3)) ——
  {
    id: 'eb1b-1',
    category: 'EB1B',
    code: '1',
    title: 'Major prizes, awards, or honors',
    regulatoryCitation: '8 CFR §204.5(i)(3)(i) — major prizes or awards for outstanding achievement.',
    description:
      'Receipt of major prizes or awards for outstanding achievement in the academic field — awards must be competitive and recognized in the discipline.',
    evidenceStandard:
      'Award documentation, selection criteria, granting body reputation, national/international scope, beneficiary’s role in earning the award.',
    evaluationCaution:
      'Teaching excellence awards at one institution alone need context; do not over-score without broader recognition evidence.',
  },
  {
    id: 'eb1b-2',
    category: 'EB1B',
    code: '2',
    title: 'Membership requiring outstanding accomplishments',
    regulatoryCitation: '8 CFR §204.5(i)(3)(ii) — membership requiring outstanding accomplishments.',
    description:
      'Membership in associations that require outstanding accomplishments for admission, judged by recognized experts.',
    evidenceStandard:
      'Selective membership rules; proof of review by experts; fellowship-grade associations where applicable.',
    evaluationCaution:
      'Open memberships without achievement gates do not qualify.',
  },
  {
    id: 'eb1b-3',
    category: 'EB1B',
    code: '3',
    title: 'Published material by others about the beneficiary',
    regulatoryCitation:
      '8 CFR §204.5(i)(3)(iii) — published material by others about the beneficiary’s academic work.',
    description:
      'Published material in professional or major trade publications or major media written by others about the beneficiary’s academic work.',
    evidenceStandard:
      'Independent articles or profiles; book reviews of beneficiary’s research; interviews — with full citation metadata.',
    evaluationCaution:
      'Bibliography of own papers is not “by others about” the beneficiary.',
  },
  {
    id: 'eb1b-4',
    category: 'EB1B',
    code: '4',
    title: 'Judge, peer reviewer, or panel member',
    regulatoryCitation: '8 CFR §204.5(i)(3)(iv) — participation as judge of others’ work in the field.',
    description:
      'Participation as judge, peer reviewer, or panel member evaluating others’ work in the same or allied academic field.',
    evidenceStandard:
      'Journal reviewer records, conference PC service, grant review panels, thesis examiner appointments with scope.',
    evaluationCaution:
      'Advising students only, without external peer review documentation, is insufficient.',
  },
  {
    id: 'eb1b-5',
    category: 'EB1B',
    code: '5',
    title: 'Original research contributions with significant impact',
    regulatoryCitation: '8 CFR §204.5(i)(3)(v) — original scientific or scholarly research contributions.',
    description:
      'Original scientific or scholarly research contributions that have significantly impacted the field (citations, adoption, follow-on research).',
    evidenceStandard:
      'Citation metrics from verifiable databases; patent/licensing; replication; expert letters on impact; h-index only with field context.',
    evaluationCaution:
      'Publication count without impact evidence does not alone prove significant impact.',
  },
  {
    id: 'eb1b-6',
    category: 'EB1B',
    code: '6',
    title: 'Authorship of scholarly books or articles',
    regulatoryCitation: '8 CFR §204.5(i)(3)(vi) — authorship of scholarly books or articles.',
    description:
      'Authorship of scholarly books or articles in international academic journals or comparable professional publications.',
    evidenceStandard:
      'Complete publication list with venues; peer review; ISBN for books; independent verification of journal quality.',
    evaluationCaution:
      'Unverifiable or predatory-journal claims must be flagged weak until venue legitimacy is documented.',
  },
  // —— EB-1C (8 CFR §204.5(j) — managerial capacity) ——
  {
    id: 'eb1c-1',
    category: 'EB1C',
    code: '1',
    title: 'Manages organization, department, or essential function',
    regulatoryCitation: '8 CFR §204.5(j) — managerial capacity includes managing the organization, department, subdivision, or essential function.',
    description:
      'The role must manage the organization, a department, subdivision, or an essential function — not only perform specialized technical tasks.',
    evidenceStandard:
      'Job description; org chart; scope of managed unit; budget or P&L authority if claimed; functional-manager analysis if managing essential function only.',
    evaluationCaution:
      'Individual contributor or technical lead without management scope must not be scored as satisfied.',
  },
  {
    id: 'eb1c-2',
    category: 'EB1C',
    code: '2',
    title: 'Supervises managerial or professional employees',
    regulatoryCitation: '8 CFR §204.5(j) — supervision of professional or managerial staff or management of essential function.',
    description:
      'Supervises and controls supervisory, managerial, or professional employees, or manages an essential function with appropriate staffing.',
    evidenceStandard:
      'Staff roster; titles and education of subordinates; reporting lines; payroll headcount; evidence subordinates are professionals/managers not clerical staff only.',
    evaluationCaution:
      'Do not assume subordinates exist from title “Manager” alone — require documented team structure.',
  },
  {
    id: 'eb1c-3',
    category: 'EB1C',
    code: '3',
    title: 'Personnel authority',
    regulatoryCitation: '8 CFR §204.5(j) — authority to hire, fire, promote, or make personnel decisions.',
    description:
      'Authority to hire, fire, promote, reward, or otherwise make personnel decisions — or, for functional managers, authority over personnel performing the essential function.',
    evidenceStandard:
      'HR delegation letters; job offer approval authority; documented hiring decisions signed by beneficiary; organizational policies assigning personnel authority.',
    evaluationCaution:
      'Recommending hires without final authority is weaker; do not assume full HR authority without documentation.',
  },
  {
    id: 'eb1c-4',
    category: 'EB1C',
    code: '4',
    title: 'Day-to-day operational discretion',
    regulatoryCitation: '8 CFR §204.5(j) — discretion over day-to-day operations of the managed activity.',
    description:
      'Exercises discretion over day-to-day operations and decision-making for the managed activity or function, at a policy/strategic level appropriate to managers.',
    evidenceStandard:
      'Decision examples; budget control; strategic plans; exclusion of purely routine tasks executed under close supervision.',
    evaluationCaution:
      'Closely supervised technical execution without operational discretion must be scored partial/weak.',
  },
]
