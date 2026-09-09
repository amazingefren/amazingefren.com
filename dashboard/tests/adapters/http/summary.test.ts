import assert from "node:assert/strict";
import test from "node:test";
import { createGuestSummaryHttpHandler, createOwnerSummaryHttpHandler } from "../../../adapters/http/summary.ts";
import { createSyntheticGuestTelemetry } from "../../../ports/telemetry/synthetic.ts";
import type { DashboardCaller } from "../../../ports/auth/index.ts";

const query = "?from=2026-09-01T00%3A00&to=2026-09-02T00%3A00";
const caller: DashboardCaller = { id: "session-1", ownerId: "owner-1", kind: "owner" };

test("guest HTTP adapter normalizes datetime-local input and returns the shared summary", async () => {
  const handler = createGuestSummaryHttpHandler({ now: () => 0, telemetry: createSyntheticGuestTelemetry() }, "guest-preview");
  const response = await handler(new Request(`https://example.test/api/guest/dashboard/summary${query}`));
  const summary = await response.json() as { dataScope: string; from: string; metrics: Array<{ value: number | null }> };

  assert.equal(response.status, 200);
  assert.equal(summary.dataScope, "synthetic");
  assert.equal(summary.from, "2026-09-01T00:00:00Z");
  assert.equal(summary.metrics[0].value, 24);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("HTTP adapters reject invalid input and methods", async () => {
  const handler = createGuestSummaryHttpHandler({ now: () => 0, telemetry: createSyntheticGuestTelemetry() }, "guest-preview");
  const invalid = await handler(new Request("https://example.test/api/guest/dashboard/summary"));
  const method = await handler(new Request(`https://example.test/api/guest/dashboard/summary${query}`, { method: "POST" }));
  const unknown = await handler(new Request(`https://example.test/api/guest/dashboard/summary${query}&extra=1`));
  const duplicate = await handler(new Request(`https://example.test/api/guest/dashboard/summary${query}&from=2026-09-01T01%3A00`));
  assert.equal(invalid.status, 400);
  assert.equal(method.status, 405);
  assert.equal(method.headers.get("allow"), "GET");
  assert.equal(unknown.status, 400);
  assert.equal(duplicate.status, 400);
});

test("owner HTTP adapter denies an anonymous caller before owner telemetry", async () => {
  let reads = 0;
  const handler = createOwnerSummaryHttpHandler(
    {
      now: () => 0,
      auth: { authorize: async () => ({ allowed: true, ownerId: "owner-1" }) },
      telemetry: { read: async () => { reads += 1; return { kind: "unavailable", source: "owner", observedAt: null }; } }
    },
    () => null
  );
  const response = await handler(new Request(`https://example.test/api/dashboard/summary${query}`));
  const body = await response.json() as { code: string };
  assert.equal(response.status, 401);
  assert.equal(body.code, "unauthenticated");
  assert.equal(reads, 0);
});

test("owner HTTP adapter delegates an authorized caller to the shared operation", async () => {
  let reads = 0;
  const handler = createOwnerSummaryHttpHandler(
    {
      now: () => 0,
      auth: { authorize: async ({ ownerId }) => ({ allowed: true, ownerId }) },
      telemetry: { read: async () => { reads += 1; return { kind: "unavailable", source: "owner", observedAt: null }; } }
    },
    () => caller
  );
  const response = await handler(new Request(`https://example.test/api/dashboard/summary${query}`));
  assert.equal(response.status, 200);
  assert.equal(reads, 1);
});
