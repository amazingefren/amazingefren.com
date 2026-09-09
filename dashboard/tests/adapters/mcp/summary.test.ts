import assert from "node:assert/strict";
import test from "node:test";
import { readGuestSummaryMcp, readSummaryMcp } from "../../../adapters/mcp/summary.ts";
import { createSyntheticGuestTelemetry } from "../../../ports/telemetry/synthetic.ts";
import type { DashboardCaller } from "../../../ports/auth/index.ts";

const input = { from: "2026-09-01T00:00", to: "2026-09-02T00:00" };
const caller: DashboardCaller = { id: "session-1", ownerId: "owner-1", kind: "owner" };

test("MCP adapters share guest operation results and reject extra fields", async () => {
  const dependencies = { now: () => 0, guestTelemetry: createSyntheticGuestTelemetry() };
  const result = await readGuestSummaryMcp(dependencies, input, "guest-preview");
  const invalid = await readGuestSummaryMcp(dependencies, { ...input, ownerId: "owner-1" }, "guest-preview");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.metrics[2].value, 2 / 24);
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.equal(invalid.error.code, "invalid_input");
});

test("MCP owner adapter delegates authorization before telemetry", async () => {
  let reads = 0;
  const result = await readSummaryMcp(
    {
      now: () => 0,
      auth: { authorize: async () => ({ allowed: false, error: { code: "forbidden", message: "denied" } }) },
      ownerTelemetry: { read: async () => { reads += 1; return { kind: "unavailable", source: "owner", observedAt: null }; } }
    },
    input,
    caller
  );
  assert.deepEqual(result, { ok: false, error: { code: "forbidden", message: "denied" } });
  assert.equal(reads, 0);
});
