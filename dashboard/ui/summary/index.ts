import type {
  DashboardMetric,
  DashboardMetricId,
  DashboardMetricStatus,
} from '../../contracts/summary.ts';

export const DASHBOARD_METRIC_LABELS: Record<DashboardMetricId, string> = {
  'page-views': 'Page views',
  'honeypot-triggers': 'Trap triggers',
  'honeypot-trigger-rate': 'Trigger rate',
};

export const DASHBOARD_METRIC_DESCRIPTIONS: Record<DashboardMetricId, string> =
  {
    'page-views': 'Accepted opted-in public page-view events.',
    'honeypot-triggers': 'Accepted trap-trigger signals.',
    'honeypot-trigger-rate':
      'Triggered eligible evaluations divided by all eligible evaluations.',
  };

export function metricLabel(id: DashboardMetricId): string {
  return DASHBOARD_METRIC_LABELS[id];
}

export function metricDescription(id: DashboardMetricId): string {
  return DASHBOARD_METRIC_DESCRIPTIONS[id];
}

export function metricStatusLabel(
  status: DashboardMetricStatus | undefined,
): string {
  if (status === 'available') return 'Available';
  if (status === 'stale') return 'Stale source';
  if (status === 'suppressed') return 'Suppressed';
  return 'Unavailable';
}

export function metricValueLabel(metric: DashboardMetric | undefined): string {
  if (!metric || metric.value === null) return 'Unavailable';
  if (metric.unit === 'ratio') return `${(metric.value * 100).toFixed(1)}%`;
  return new Intl.NumberFormat('en-US').format(metric.value);
}

export function metricEvidenceLabel(
  metric: DashboardMetric | undefined,
): string {
  if (!metric || metric.value === null)
    return 'No measured value in this window';
  if (
    metric.unit === 'ratio' &&
    metric.numerator !== null &&
    metric.denominator !== null
  ) {
    return `${metric.numerator} triggered / ${metric.denominator} eligible evaluations`;
  }
  if (metric.numerator !== null) return `${metric.numerator} accepted events`;
  return 'No measured value in this window';
}

export function localDateTimeValue(value: string | undefined): string {
  if (!value) return '';
  const timestamp = parseDashboardTimestamp(value);
  if (!Number.isFinite(timestamp)) return '';
  return new Date(timestamp).toISOString().slice(0, 16);
}

function parseDashboardTimestamp(value: string): number {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(value)
    ? Date.parse(`${value}Z`)
    : Date.parse(value);
}
