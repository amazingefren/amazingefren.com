export default {
  purpose: 'Define dashboard metrics before collection or presentation.',
  status: 'declared',
  definitions: [
    {
      id: 'page-views',
      label: 'Page views',
      unit: 'count',
      source: 'consented-audience-aggregates',
      definition:
        'Accepted opted-in public page-view events within the selected window. Reloads may count again. Not unique people or all traffic.',
      numerator: 'accepted page-view events',
      denominator: null,
    },
    {
      id: 'honeypot-triggers',
      label: 'Trap triggers',
      unit: 'count',
      source: 'operational-security-aggregates',
      definition:
        'Accepted trap-trigger events within the window. Signals can include benign automation or human actions; not a verified AI-agent count.',
      numerator: 'accepted trap-trigger events',
      denominator: null,
    },
    {
      id: 'honeypot-trigger-rate',
      label: 'Trigger rate',
      unit: 'ratio',
      source: 'operational-security-aggregates',
      definition:
        'Triggered eligible evaluations divided by all eligible evaluations of the same rule and window. Deduplicate by evaluation; missing or zero denominator produces null.',
      numerator: 'eligible evaluations with a trigger',
      denominator: 'all eligible evaluations of the same rule and window',
    },
  ],
  presentation: {
    missing: 'unavailable with null value',
    stale: 'show source timestamp and stale state',
    guest: 'synthetic label; separate from measured values',
    comparisons:
      'same source, rule, window size, consent population, and denominator definition',
  },
  collection:
    'Not enabled by this manifest. Collectors and tests remain unimplemented.',
} as const;
