import type {
  DashboardResult,
  DashboardSummary,
  DashboardSummaryInput
} from "../../contracts/summary.ts";
import type { GuestTelemetryPort } from "../../ports/telemetry/index.ts";
import { buildSummary, validateSummaryInput } from "../summary.ts";

export interface ReadGuestSummaryDependencies {
  telemetry: GuestTelemetryPort;
  now: () => number;
}

export interface ReadGuestSummaryCommand {
  input: DashboardSummaryInput;
  sessionId: string;
}

export async function readGuestSummary(
  dependencies: ReadGuestSummaryDependencies,
  command: ReadGuestSummaryCommand
): Promise<DashboardResult<DashboardSummary>> {
  const validation = validateSummaryInput(command.input);
  if (!validation.ok) return validation;
  if (command.sessionId.trim().length === 0) {
    return { ok: false, error: { code: "invalid_input", message: "A guest session is required" } };
  }

  const generatedAt = generatedAtOrNull(dependencies.now());
  if (!generatedAt) {
    return { ok: false, error: { code: "unavailable", message: "The dashboard clock is unavailable" } };
  }

  try {
    const result = await dependencies.telemetry.read({ sessionId: command.sessionId, window: validation.window });
    if (result.kind === "unavailable") {
      return { ok: true, value: buildSummary("synthetic", command.input, generatedAt, null, "synthetic-unavailable", result.observedAt) };
    }
    return { ok: true, value: buildSummary("synthetic", command.input, generatedAt, result.snapshot, "synthetic-fixture") };
  } catch {
    return { ok: true, value: buildSummary("synthetic", command.input, generatedAt, null, "synthetic-unavailable") };
  }
}

function generatedAtOrNull(value: number): string | null {
  if (!Number.isFinite(value)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
