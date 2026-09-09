import {
  DASHBOARD_METRIC_IDS,
  type DashboardError,
  type DashboardMetric,
  type DashboardMetricId,
  type DashboardMetricStatus,
  type DashboardMetricUnit,
  type DashboardSummary,
  type DashboardSummaryInput
} from "../contracts/summary.ts";
import type { DashboardWindow, TelemetryObservation, TelemetrySnapshot } from "../ports/telemetry/index.ts";

export const MAX_QUERY_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;

export type SummaryValidation =
  | { ok: true; window: DashboardWindow }
  | { ok: false; error: DashboardError };

export function validateSummaryInput(input: unknown): SummaryValidation {
  if (!isSummaryInput(input)) {
    return { ok: false, error: invalidInput("from and to must be date-time strings") };
  }

  const fromMs = parseTimestamp(input.from);
  const toMs = parseTimestamp(input.to);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
    return { ok: false, error: invalidInput("from and to must be finite timestamps") };
  }
  if (fromMs >= toMs) {
    return { ok: false, error: invalidInput("from must be before to") };
  }
  if (toMs - fromMs > MAX_QUERY_WINDOW_MS) {
    return { ok: false, error: invalidInput("the requested window exceeds the maximum of 31 days") };
  }

  return { ok: true, window: { from: input.from, to: input.to, fromMs, toMs } };
}

export function buildSummary(
  dataScope: "owner" | "synthetic",
  input: DashboardSummaryInput,
  generatedAt: string,
  snapshot: TelemetrySnapshot | null,
  source: string,
  freshness: string | null = snapshot?.observedAt ?? null
): DashboardSummary {
  const metrics = DASHBOARD_METRIC_IDS.map((id) => toMetric(id, snapshot?.metrics[id] ?? null, snapshot?.source ?? source, dataScope));
  return { dataScope, from: input.from, to: input.to, generatedAt, freshness: validDateTimeOrNull(freshness), metrics };
}

function toMetric(
  id: DashboardMetricId,
  observation: TelemetryObservation | null,
  fallbackSource: string,
  dataScope: "owner" | "synthetic"
): DashboardMetric {
  const unit: DashboardMetricUnit = id === "honeypot-trigger-rate" ? "ratio" : "count";
  const source = dataScope === "synthetic" ? "synthetic-fixture" : sourceName(observation?.source, fallbackSource);
  if (!observation || observation.status === "unavailable" || observation.status === "suppressed") {
    return emptyMetric(id, unit, observation?.status ?? "unavailable", source);
  }

  const numerator = integerOrNull(observation.numerator);
  const denominator = integerOrNull(observation.denominator);
  if (unit === "ratio") {
    if (numerator === null || denominator === null || denominator === 0) {
      return emptyMetric(id, unit, "unavailable", source);
    }
    return { id, value: numerator / denominator, unit, status: observation.status, numerator, denominator, source };
  }

  if (numerator === null) {
    return emptyMetric(id, unit, "unavailable", source);
  }
  return { id, value: numerator, unit, status: observation.status, numerator, denominator: null, source };
}

function emptyMetric(
  id: DashboardMetricId,
  unit: DashboardMetricUnit,
  status: DashboardMetricStatus,
  source: string
): DashboardMetric {
  return { id, value: null, unit, status, numerator: null, denominator: null, source };
}

function sourceName(metricSource: string | undefined, fallbackSource: string): string {
  if (typeof metricSource === "string" && metricSource.trim().length > 0) return metricSource;
  if (fallbackSource.trim().length > 0) return fallbackSource;
  return "unavailable";
}

function integerOrNull(value: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0 ? value : null;
}

function isSummaryInput(input: unknown): input is DashboardSummaryInput {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const candidate = input as Record<string, unknown>;
  return Object.keys(candidate).every((key) => key === "from" || key === "to") && typeof candidate.from === "string" && typeof candidate.to === "string";
}

function parseTimestamp(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/i.exec(value);
  if (!match) return NaN;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1]) return NaN;
  return Date.parse(value);
}

function invalidInput(message: string): DashboardError {
  return { code: "invalid_input", message };
}

function validDateTimeOrNull(value: string | null): string | null {
  if (value === null || !Number.isFinite(parseTimestamp(value))) return null;
  return value;
}
