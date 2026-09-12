export default {
  id: 'web-readings-surface',
  status: 'implemented',
  purpose:
    'Present public publications as an editorial index and readable documents.',
  decisions: [
    '2026-09-11: Show publication and release-update date plus time in the snapshot IANA timezone, defaulting to America/Denver for legacy data. Never use a private draft mutation time as a public update date.',
    'Use a featured latest reading followed by compact archive rows; preserve native links and server rendering.',
    'Show publication kind, date, tags, summary, word count, and reading time only when derived from the snapshot.',
    'Keep chapter navigation and revision provenance visible in the reader without adding client state.',
  ],
  paths: ['web/ui/readings/'],
} as const;
