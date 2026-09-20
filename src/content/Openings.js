/**
 * Roles shown on /careers.
 *
 * `status` is deliberately explicit. A careers page that lists five glamorous
 * openings none of which are actually funded wastes applicants' time, so each
 * role states whether it is an open vacancy or an area where we accept
 * expressions of interest. Set HORASAAR_OPEN_ROLES to a comma-separated list of
 * role ids to mark those as actively hiring on a deployment.
 */
const OPEN = new Set(String(process.env.HORASAAR_OPEN_ROLES || '').split(',').map(s => s.trim()).filter(Boolean));

const ROLES = [
  {
    id: 'astronomy-engineer',
    title: 'Astronomy & Calculation Engineer',
    location: 'Remote (India time zones)',
    type: 'Full-time',
    summary: 'Own the ephemeris layer: planetary positions, ayanamsa handling, nutation and delta-T corrections, house systems and the Dasha engines.',
    responsibilities: [
      'Maintain and extend the calculation engine and its numerical accuracy.',
      'Investigate every reported discrepancy against reference ephemerides, down to arc-minutes.',
      'Expand the validation corpus so regressions are caught before release.',
      'Handle historical time zones, calendar reform edge cases and high-latitude sunrise failures.',
    ],
    looking: [
      'Strong numerical programming, ideally in JavaScript, Python, C or Fortran.',
      'Comfort with spherical astronomy, coordinate transforms and orbital elements.',
      'A habit of writing the failing test before the fix.',
      'Astronomy background welcome; Jyotish background not required.',
    ],
  },
  {
    id: 'jyotish-scholar',
    title: 'Jyotish Scholar & Rule Editor',
    location: 'Remote or Ahmedabad',
    type: 'Full-time or long-term contract',
    summary: 'Read the classical sources and turn them into structured, attributable rules the engine can apply.',
    responsibilities: [
      'Encode interpretive rules from Sanskrit sources with a citation recorded for each.',
      'Resolve or document disagreements between texts rather than silently choosing one.',
      'Review generated readings for classical fidelity and for overstated claims.',
      'Expand the reference library with accurate, non-sensational entries.',
    ],
    looking: [
      'Working knowledge of Sanskrit and direct familiarity with BPHS, Phaladeepika, Saravali or Jataka Parijata.',
      'Formal study or a recognised teaching lineage in Jyotish.',
      'Willingness to write "the texts disagree" instead of picking the tidier answer.',
      'Absolutely no interest in fear-based or remedy-selling practice.',
    ],
  },
  {
    id: 'backend-engineer',
    title: 'Backend Engineer',
    location: 'Remote (India time zones)',
    type: 'Full-time',
    summary: 'Build and run the service: a dependency-light Node.js application, the payment and delivery pipelines, and the validation suite.',
    responsibilities: [
      'Extend the HTTP layer, the subscription lifecycle and the report scheduler.',
      'Keep the 07:00 daily delivery reliable and observable.',
      'Own payment verification and reconciliation correctness.',
      'Keep the security posture current: headers, rate limits, input handling, dependency hygiene.',
    ],
    looking: [
      'Solid modern Node.js, comfortable working without a heavy framework.',
      'Practical experience with payment integrations and idempotent webhook handling.',
      'Care about correctness in money and time handling.',
      'Testing instinct that does not need to be asked for.',
    ],
  },
  {
    id: 'content-writer',
    title: 'Content & Language Editor',
    location: 'Remote',
    type: 'Part-time or contract',
    summary: 'Make technical readings readable across our supported languages without overstating a single claim.',
    responsibilities: [
      'Write and edit forecast templates, reference entries and articles.',
      'Review translations for tone as well as accuracy.',
      'Enforce the house rule: nothing may be stated more confidently than the evidence allows.',
    ],
    looking: [
      'Excellent English plus at least one of Hindi, Gujarati, Marathi, Bengali, Tamil, Telugu, Kannada, Malayalam, Punjabi or Urdu.',
      'An eye for the sentence that quietly turns a tradition into a guarantee.',
      'Familiarity with Jyotish vocabulary is a strong advantage.',
    ],
  },
  {
    id: 'support-specialist',
    title: 'Customer Support & Trust Specialist',
    location: 'Remote (India time zones)',
    type: 'Full-time',
    summary: 'Answer every message properly, process refunds without argument, and handle privacy requests.',
    responsibilities: [
      'Respond to support, billing and delivery queries within the published targets.',
      'Process refunds, cancellations and data-rights requests end to end.',
      'Moderate submitted reviews, and escalate anything that looks like fraud in our name.',
      'Turn recurring complaints into product fixes rather than better canned replies.',
    ],
    looking: [
      'Clear, calm writing in English and Hindi; other Indian languages a plus.',
      'Patience with people who are worried, and the judgement to point them at real help.',
      'Comfort saying "we were wrong, here is your refund" without escalating.',
    ],
  },
];

export function listOpenings() {
  return ROLES.map(role => ({
    ...role,
    status: OPEN.has(role.id) ? 'open' : 'expression-of-interest',
    statusLabel: OPEN.has(role.id) ? 'Open vacancy' : 'Accepting expressions of interest',
  }));
}
