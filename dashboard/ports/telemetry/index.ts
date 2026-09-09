import type { DashboardMetricId, DashboardMetricStatus } from "../../contracts/summary.ts";

export interface DashboardWindow {
  from: string;
  to: string;
  fromMs: number;
  toMs: number;
}

export interface TelemetryObservation {
  status: DashboardMetricStatus;
  numerator: number | null;
  denominator: number | null;
  source: string;
}

export interface TelemetrySnapshot {
  source: string;
  observedAt: string | null;
  metrics: Partial<Record<DashboardMetricId, TelemetryObservation>>;
}

export type TelemetryReadResult =
  | { kind: "snapshot"; snapshot: TelemetrySnapshot }
  | { kind: "unavailable"; source: string; observedAt: string | null };

export interface OwnerTelemetryPort {
  read(request: { ownerId: string; window: DashboardWindow }): Promise<TelemetryReadResult>;
}

export interface GuestTelemetryPort {
  read(request: { sessionId: string; window: DashboardWindow }): Promise<TelemetryReadResult>;
}
