import type { DashboardCaller } from "../../ports/auth/index.ts";
import type { DashboardError, DashboardResult } from "../../contracts/summary.ts";
import type { ReadGuestSummaryDependencies, ReadGuestSummaryCommand } from "../../operations/read-guest-summary/index.ts";
import { readGuestSummary } from "../../operations/read-guest-summary/index.ts";
import type { ReadSummaryDependencies, ReadSummaryCommand } from "../../operations/read-summary/index.ts";
import { readSummary } from "../../operations/read-summary/index.ts";
import { errorStatus, parseSummaryQuery } from "../shared.ts";

export function createGuestSummaryHttpHandler(
  dependencies: ReadGuestSummaryDependencies,
  sessionId: string
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== "GET") return errorResponse({ code: "invalid_input", message: "Only GET is supported" }, 405, { allow: "GET" });
    const input = parseSummaryQuery(request.url);
    if (!input.ok) return errorResponse(input.error);
    const command: ReadGuestSummaryCommand = { input: input.value, sessionId };
    return resultResponse(await readGuestSummary(dependencies, command));
  };
}

export function createOwnerSummaryHttpHandler(
  dependencies: ReadSummaryDependencies,
  resolveCaller: (request: Request) => DashboardCaller | null | Promise<DashboardCaller | null>
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== "GET") return errorResponse({ code: "invalid_input", message: "Only GET is supported" }, 405, { allow: "GET" });
    const input = parseSummaryQuery(request.url);
    if (!input.ok) return errorResponse(input.error);
    let caller: DashboardCaller | null;
    try {
      caller = await resolveCaller(request);
    } catch {
      return errorResponse({ code: "unavailable", message: "Authentication is unavailable" });
    }
    const command: ReadSummaryCommand = { input: input.value, caller: caller ?? unauthenticatedCaller() };
    return resultResponse(await readSummary(dependencies, command));
  };
}

function resultResponse<T>(result: DashboardResult<T>): Response {
  if (result.ok) {
    return new Response(JSON.stringify(result.value), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
    });
  }
  return errorResponse(result.error);
}

function errorResponse(error: DashboardError, status = errorStatus(error.code), extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(error), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extraHeaders }
  });
}

function unauthenticatedCaller(): DashboardCaller {
  return { id: "anonymous", ownerId: "", kind: "guest" };
}
