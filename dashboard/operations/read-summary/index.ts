import type {
  DashboardError,
  DashboardResult,
  DashboardSummary,
  DashboardSummaryInput
} from "../../contracts/summary.ts";
import type { DashboardAuthPort, DashboardCaller } from "../../ports/auth/index.ts";
import type { OwnerTelemetryPort } from "../../ports/telemetry/index.ts";
import { buildSummary, validateSummaryInput } from "../summary.ts";

export interface ReadSummaryDependencies {
  auth: DashboardAuthPort;
  telemetry: OwnerTelemetryPort;
  now: () => number;
}

export interface ReadSummaryCommand {
  input: DashboardSummaryInput;
  caller: DashboardCaller;
  ownerId?: string;
}

export async function readSummary(
  dependencies: ReadSummaryDependencies,
  command: ReadSummaryCommand
): Promise<DashboardResult<DashboardSummary>> {
  const validation = validateSummaryInput(command.input);
  if (!validation.ok) return validation;

  const ownerId = command.ownerId ?? command.caller?.ownerId;
  if (!ownerId || command.caller.kind !== "owner") {
    return { ok: false, error: { code: "unauthenticated", message: "An authenticated owner is required" } };
  }
  if (command.caller.ownerId !== ownerId) {
    return { ok: false, error: { code: "forbidden", message: "The caller cannot read another owner" } };
  }

  let authorization;
  try {
    authorization = await dependencies.auth.authorize({
      operation: "dashboard.read-summary",
      permission: "dashboard.read",
      caller: command.caller,
      ownerId
    });
  } catch {
    return { ok: false, error: { code: "unavailable", message: "Authorization is unavailable" } };
  }
  if (!authorization.allowed) return { ok: false, error: authorization.error };
  if (authorization.ownerId !== ownerId) {
    return { ok: false, error: { code: "forbidden", message: "The authorized owner does not match the caller" } };
  }

  const generatedAt = generatedAtOrNull(dependencies.now());
  if (!generatedAt) return { ok: false, error: unavailable("The dashboard clock is unavailable") };

  try {
    const result = await dependencies.telemetry.read({ ownerId, window: validation.window });
    if (result.kind === "unavailable") {
      return { ok: true, value: buildSummary("owner", command.input, generatedAt, null, result.source, result.observedAt) };
    }
    return { ok: true, value: buildSummary("owner", command.input, generatedAt, result.snapshot, result.snapshot.source) };
  } catch {
    return { ok: true, value: buildSummary("owner", command.input, generatedAt, null, "telemetry-unavailable") };
  }
}

function generatedAtOrNull(value: number): string | null {
  if (!Number.isFinite(value)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function unavailable(message: string): DashboardError {
  return { code: "unavailable", message };
}
