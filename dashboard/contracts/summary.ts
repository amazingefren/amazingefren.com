export const DASHBOARD_METRIC_IDS = [
  'page-views',
  'honeypot-triggers',
  'honeypot-trigger-rate',
] as const;

export type DashboardMetricId = (typeof DASHBOARD_METRIC_IDS)[number];

export type DashboardMetricUnit = 'count' | 'ratio';

export type DashboardMetricStatus =
  'available' | 'unavailable' | 'stale' | 'suppressed';

export type DashboardDataScope = 'owner' | 'synthetic';

export interface DashboardSummaryInput {
  from: string;
  to: string;
}

export interface DashboardMetric {
  id: DashboardMetricId;
  value: number | null;
  unit: DashboardMetricUnit;
  status: DashboardMetricStatus;
  numerator: number | null;
  denominator: number | null;
  source: string;
}

export interface DashboardSummary {
  dataScope: DashboardDataScope;
  from: string;
  to: string;
  generatedAt: string;
  freshness: string | null;
  metrics: readonly DashboardMetric[];
}

export type DashboardErrorCode =
  | 'not_found'
  | 'invalid_input'
  | 'unavailable'
  | 'forbidden'
  | 'unauthenticated'
  | 'conflict';

export interface DashboardError {
  code: DashboardErrorCode;
  message: string;
}

export type DashboardResult<T> =
  { ok: true; value: T } | { ok: false; error: DashboardError };
