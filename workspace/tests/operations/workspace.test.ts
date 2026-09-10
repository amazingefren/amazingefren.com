import assert from "node:assert/strict";
import test from "node:test";
import { createSyntheticWorkspaceState, executeWorkspaceCommand, parseWorkspaceCommand, type WorkspaceDependencies } from "../../domain/index.ts";

function dependencies(): WorkspaceDependencies {
  let id = 0;
  return { now: () => Date.parse("2026-09-09T12:00:00.000Z"), nextId: () => `id-${++id}` };
}

function seed() {
  const result = createSyntheticWorkspaceState(dependencies());
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("seed failed");
  return result.value;
}

test("workspace commands preserve exact revision snapshots when publishing", () => {
  const deps = dependencies();
  const initial = createSyntheticWorkspaceState(deps);
  assert.equal(initial.ok, true);
  if (!initial.ok) return;
  const document = initial.value.documents[0];
  const saved = executeWorkspaceCommand(initial.value, { operation: "workspace.save-document", input: { id: document.id, title: "Edited", body: "Draft revision two", revision: 1 } }, deps);
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  const published = executeWorkspaceCommand(saved.value, { operation: "workspace.publish", input: { id: document.id, revision: 1 } }, deps);
  assert.equal(published.ok, true);
  if (!published.ok) return;
  assert.deepEqual(published.value.publications[0], { documentId: document.id, title: "Welcome", body: "This guest workspace uses synthetic records.", revision: 1, publishedAt: "2026-09-09T12:00:00.000Z" });
  assert.equal(published.value.documents[0].revision, 2);
  const conflicted = executeWorkspaceCommand(published.value, { operation: "workspace.save-document", input: { id: document.id, title: "Lost", body: "Lost", revision: 1 } }, deps);
  assert.deepEqual(conflicted, { ok: false, error: { code: "conflict", message: "Document revision does not match" } });
});

test("workspace restore creates a new draft revision and bounds revisions", () => {
  const deps = dependencies();
  const initial = createSyntheticWorkspaceState(deps);
  assert.equal(initial.ok, true);
  if (!initial.ok) return;
  const id = initial.value.documents[0].id;
  const saved = executeWorkspaceCommand(initial.value, { operation: "workspace.save-document", input: { id, title: "Later", body: "Later", revision: 1 } }, deps);
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  const restored = executeWorkspaceCommand(saved.value, { operation: "workspace.restore-document", input: { id, sourceRevision: 1, revision: 2 } }, deps);
  assert.equal(restored.ok, true);
  if (!restored.ok) return;
  assert.equal(restored.value.documents[0].revision, 3);
  assert.equal(restored.value.documents[0].body, "This guest workspace uses synthetic records.");
});

test("workspace runtime parsing denies undeclared commands and extra fields", () => {
  assert.deepEqual(parseWorkspaceCommand({ operation: "workspace.read", input: { ownerId: "owner-1" } }), { ok: false, error: { code: "invalid", message: "This operation accepts no input" } });
  assert.deepEqual(parseWorkspaceCommand({ operation: "workspace.create-task", input: { title: "Task", hidden: true } }), { ok: false, error: { code: "invalid", message: "Task input is invalid" } });
  assert.deepEqual(parseWorkspaceCommand({ operation: "workspace.delete-all", input: {} }), { ok: false, error: { code: "denied", message: "Workspace operation is undeclared" } });
  const result = executeWorkspaceCommand(seed(), { operation: "workspace.complete-task", input: { id: "missing", done: true } }, dependencies());
  assert.deepEqual(result, { ok: false, error: { code: "missing", message: "Task was not found" } });
});

test("workspace link and publication operations reject missing records", () => {
  const state = seed();
  const deps = dependencies();
  const linked = executeWorkspaceCommand(state, { operation: "workspace.link-documents", input: { from: state.documents[0].id, to: "missing", label: "depends" } }, deps);
  assert.equal(linked.ok, false);
  if (!linked.ok) assert.equal(linked.error.code, "missing");
  const withdrawn = executeWorkspaceCommand(state, { operation: "workspace.withdraw", input: { id: state.documents[0].id } }, deps);
  assert.equal(withdrawn.ok, false);
  if (!withdrawn.ok) assert.equal(withdrawn.error.code, "missing");
});
