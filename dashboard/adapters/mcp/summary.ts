import type {
  DashboardCaller,
  DashboardAuthPort,
} from '../../ports/auth/index.ts';
import type {
  DashboardResult,
  DashboardSummary,
  DashboardSummaryInput,
} from '../../contracts/summary.ts';
import type {
  GuestTelemetryPort,
  OwnerTelemetryPort,
} from '../../ports/telemetry/index.ts';
import { readGuestSummary } from '../../operations/read-guest-summary/index.ts';
import { readSummary } from '../../operations/read-summary/index.ts';
import { parseSummaryInput } from '../shared.ts';

export interface McpSummaryDependencies {
  now: () => number;
  auth: DashboardAuthPort;
  ownerTelemetry: OwnerTelemetryPort;
  guestTelemetry: GuestTelemetryPort;
}

export async function readGuestSummaryMcp(
  dependencies: Pick<McpSummaryDependencies, 'now' | 'guestTelemetry'>,
  input: unknown,
  sessionId: string,
): Promise<DashboardResult<DashboardSummary>> {
  const parsed = parseSummaryInput(input);
  if (!parsed.ok) return parsed;
  return readGuestSummary(
    { now: dependencies.now, telemetry: dependencies.guestTelemetry },
    { input: parsed.value, sessionId },
  );
}

export async function readSummaryMcp(
  dependencies: Pick<McpSummaryDependencies, 'now' | 'auth' | 'ownerTelemetry'>,
  input: unknown,
  caller: DashboardCaller,
): Promise<DashboardResult<DashboardSummary>> {
  const parsed = parseSummaryInput(input);
  if (!parsed.ok) return parsed;
  return readSummary(
    {
      now: dependencies.now,
      auth: dependencies.auth,
      telemetry: dependencies.ownerTelemetry,
    },
    { input: parsed.value, caller },
  );
}

export type McpInput = DashboardSummaryInput;
