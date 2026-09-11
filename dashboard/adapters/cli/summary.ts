import type {
  DashboardCaller,
  DashboardAuthPort,
} from '../../ports/auth/index.ts';
import type {
  DashboardResult,
  DashboardSummary,
} from '../../contracts/summary.ts';
import type {
  GuestTelemetryPort,
  OwnerTelemetryPort,
} from '../../ports/telemetry/index.ts';
import { readGuestSummary } from '../../operations/read-guest-summary/index.ts';
import { readSummary } from '../../operations/read-summary/index.ts';
import { parseSummaryInput } from '../shared.ts';

export interface CliSummaryDependencies {
  now: () => number;
  auth: DashboardAuthPort;
  ownerTelemetry: OwnerTelemetryPort;
  guestTelemetry: GuestTelemetryPort;
}

export function parseSummaryCliArgs(args: readonly string[]) {
  const input: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag !== '--from' && flag !== '--to')
      return {
        ok: false as const,
        error: {
          code: 'invalid_input' as const,
          message: `Unknown option: ${flag}`,
        },
      };
    if (flag.slice(2) in input)
      return {
        ok: false as const,
        error: {
          code: 'invalid_input' as const,
          message: `${flag} must be provided once`,
        },
      };
    const value = args[index + 1];
    if (!value || value.startsWith('--'))
      return {
        ok: false as const,
        error: {
          code: 'invalid_input' as const,
          message: `${flag} requires a value`,
        },
      };
    input[flag.slice(2)] = value;
    index += 1;
  }
  return parseSummaryInput(input);
}

export async function readGuestSummaryCli(
  dependencies: Pick<CliSummaryDependencies, 'now' | 'guestTelemetry'>,
  args: readonly string[],
  sessionId: string,
): Promise<DashboardResult<DashboardSummary>> {
  const parsed = parseSummaryCliArgs(args);
  if (!parsed.ok) return parsed;
  return readGuestSummary(
    { now: dependencies.now, telemetry: dependencies.guestTelemetry },
    { input: parsed.value, sessionId },
  );
}

export async function readSummaryCli(
  dependencies: Pick<CliSummaryDependencies, 'now' | 'auth' | 'ownerTelemetry'>,
  args: readonly string[],
  caller: DashboardCaller,
): Promise<DashboardResult<DashboardSummary>> {
  const parsed = parseSummaryCliArgs(args);
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
