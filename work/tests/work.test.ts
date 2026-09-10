import test from 'node:test';
import assert from 'node:assert/strict';
import type { State, Item, Fields, Command } from '../../contracts/work/index.ts';
import { execute, seed, agentReady } from '../domain/index.ts';
import { parseCommand, isState } from '../operations/validation.ts';
import { maxWorkStateBytes } from '../../contracts/work/index.ts';
import { createGuestWorkPort, resetGuestWork } from '../adapters/guest.ts';
import { createWorkHttp, createWorkMcp, createWorkCli } from '../adapters/transports.ts';
const item = (id: string, patch: Partial<Item> = {}): Item => ({ id, spaceId: 'dev', title: id, kind: 'feature', system: '', outcome: '', next: 'Implement', acceptance: 'Independent behavior checks pass', blocker: '', dependencies: [], agentAllowed: true, assignee: null, phase: 'open', evidence: '', focus: false, revision: 1, history: [], ...patch });
const initial = (): State => ({ schemaVersion: 1, version: 0, synthetic: true, spaces: [{ id: 'dev', title: 'Development', agents: true }], items: [item('a'), item('b', { dependencies: ['a'] })] });
const fields = (i: Item): Fields => ({ title: i.title, system: i.system, outcome: i.outcome, next: i.next, acceptance: i.acceptance, blocker: i.blocker, dependencies: [...i.dependencies], agentAllowed: i.agentAllowed, evidence: i.evidence });
function apply(s: State, c: Command, actor: 'owner' | 'agent' = 'owner') { const result = execute(s, c, actor); assert.equal(result.ok, true, JSON.stringify(result)); if (!result.ok) throw Error(result.message); return result.state; }
test('strict command parsing rejects undeclared keys and malformed values', () => {
  for (const value of [null, [], {}, { operation: 'work.read', ownerId: 'x' }, { operation: 'work.delete' }, { operation: 'work.start', id: 'a', revision: 1.2 }, { operation: 'work.create-space', id: '__proto__', title: 'x', agents: true }, { operation: 'work.edit', id: 'a', revision: 1, fields: { ...fields(item('a')), dependencies: ['b', 'b'] } }]) assert.equal(parseCommand(value), null);
  assert.deepEqual(parseCommand({ operation: 'work.read' }), { operation: 'work.read' });
});
test('state validation rejects malformed graphs, permissions, focus and extra fields', () => {
  assert.equal(isState(seed()), true);
  const corruptions = [
    (s: State) => { s.items.push(item('a')); },
    (s: State) => { s.items[0].dependencies = ['b']; },
    (s: State) => { s.items[0].dependencies = ['missing']; },
    (s: State) => { s.items[0].kind = 'publication'; },
    (s: State) => { s.spaces[0].agents = false; },
    (s: State) => { s.items[0].phase = 'review'; },
    (s: State) => { s.items.push(item('c'), item('d')); s.items.forEach(i => { i.focus = true; }); },
    (s: State) => { Object.assign(s.items[0], { secret: true }); }
  ];
  for (const corrupt of corruptions) { const s = initial(); corrupt(s); assert.equal(isState(s), false); }
});
test('agent evidence submission requires a claim and preserves owner scope', () => {
  let s = initial();
  assert.equal(agentReady(s, s.items[1]), false);
  s = apply(s, { operation: 'work.start', id: 'a', revision: 1 }, 'agent');
  assert.equal(s.version, 1);
  assert.equal(execute(s, { operation: 'work.start', id: 'a', revision: 1 }, 'agent').ok, false);
  assert.equal(execute(s, { operation: 'work.edit', id: 'a', revision: 2, fields: { ...fields(s.items[0]), acceptance: 'Changed', evidence: 'Passed' } }, 'agent').ok, false);
  assert.equal(execute(s, { operation: 'work.submit', id: 'a', revision: 2 }, 'agent').ok, false);
  s = apply(s, { operation: 'work.edit', id: 'a', revision: 2, fields: { ...fields(s.items[0]), evidence: 'Run 14: denied unauthenticated writes and saved authorized changes.' } }, 'agent');
  s = apply(s, { operation: 'work.submit', id: 'a', revision: 3 }, 'agent');
  assert.equal(execute(s, { operation: 'work.accept', id: 'a', revision: 4 }, 'agent').ok, false);
  s = apply(s, { operation: 'work.accept', id: 'a', revision: 4 });
  assert.equal(s.items[0].phase, 'done'); assert.equal(agentReady(s, s.items[1]), true);
  assert.equal(execute(s, { operation: 'work.edit', id: 'a', revision: 5, fields: fields(s.items[0]) }).ok, false);
  s = apply(s, { operation: 'work.reopen', id: 'a', revision: 5 });
  assert.equal(s.items[0].evidence, ''); assert.equal(agentReady(s, s.items[1]), false);
});
test('publication and space gates reject agents; owner can work on publications', () => {
  const s = initial(); s.items[0] = item('a', { kind: 'publication', agentAllowed: false });
  assert.equal(execute(s, { operation: 'work.start', id: 'a', revision: 1 }, 'agent').ok, false);
  assert.equal(apply(s, { operation: 'work.start', id: 'a', revision: 1 }).items[0].assignee, 'me');
  assert.equal(execute(s, { operation: 'work.edit', id: 'a', revision: 1, fields: { ...fields(s.items[0]), agentAllowed: true } }).ok, false);
});
test('focus bound, cycles, revoked review claims and snapshots preserve invariants', () => {
  let s = initial(); s.items.push(item('c'), item('d'));
  const original = structuredClone(s);
  assert.equal(execute(s, { operation: 'work.edit', id: 'a', revision: 1, fields: { ...fields(s.items[0]), dependencies: ['b'] } }).ok, false);
  assert.deepEqual(s, original);
  for (const id of ['a', 'b', 'c']) s = apply(s, { operation: 'work.focus', id, revision: 1 });
  assert.equal(execute(s, { operation: 'work.focus', id: 'd', revision: 1 }).ok, false);
  s.items[3] = item('d', { phase: 'review', assignee: 'agent', evidence: 'Checks' });
  s = apply(s, { operation: 'work.edit', id: 'd', revision: 1, fields: { ...fields(s.items[3]), agentAllowed: false } });
  assert.equal(s.items[3].phase, 'open'); assert.equal(s.items[3].assignee, null);
  const read = apply(s, { operation: 'work.read' }); read.items[0].title = 'Changed'; assert.equal(s.items[0].title, 'a');
});
test('guest persistence reloads, fails closed and preserves saved state on failure', async () => {
  let raw: string | null = null; let fail = false;
  const storage = { getItem: () => raw, setItem: (_: string, value: string) => { if (fail) throw Error('quota'); raw = value; } };
  const port = createGuestWorkPort(storage);
  assert.equal((await port.execute({ operation: 'work.create-space', id: 'mine', title: 'Mine', agents: false })).ok, true);
  const saved = raw; fail = true;
  assert.equal((await port.execute({ operation: 'work.create-space', id: 'other', title: 'Other', agents: false })).ok, false);
  assert.equal(raw, saved);
  const read = await createGuestWorkPort(storage).execute({ operation: 'work.read' });
  assert.ok(read.ok); if (read.ok) assert.ok(read.state.spaces.some(s => s.id === 'mine'));
  for (const bad of ['{', JSON.stringify({ ...seed(), synthetic: false }), 'x'.repeat(2_000_001)]) { raw = bad; assert.equal((await port.execute({ operation: 'work.read' })).ok, false); }
  assert.equal(execute({ ...initial(), synthetic: false }, { operation: 'work.read' }).ok, false);
});
test('HTTP MCP and CLI delegate to one port and reject invalid requests before calls', async () => {
  const calls: Command[] = [];
  const port = { async execute(command: Command) { calls.push(command); return { ok: true as const, state: initial() }; } };
  const http = createWorkHttp(port);
  assert.equal((await http(new Request('http://localhost', { method: 'POST', body: '{"operation":"work.read"}' }))).status, 200);
  assert.equal((await createWorkMcp(port)({ operation: 'work.read' })).ok, true);
  assert.equal((await createWorkCli(port)('{"operation":"work.read"}')).ok, true);
  assert.equal(calls.length, 3);
  assert.equal((await http(new Request('http://localhost'))).status, 405);
  assert.equal((await createWorkMcp(port)({ operation: 'work.read', extra: true })).ok, false);
  assert.equal((await createWorkCli(port)('{')).ok, false);
  assert.equal(calls.length, 3);
});

test('guest reset removes only its storage key and restores synthetic seed', async () => {
  const entries = new Map<string, string>([['other-session', 'preserve']]);
  const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); }, removeItem: (key: string) => { entries.delete(key); } };
  const port = createGuestWorkPort(storage);
  assert.equal((await port.execute({ operation: 'work.create-space', id: 'custom', title: 'Custom', agents: false })).ok, true);
  resetGuestWork(storage);
  assert.deepEqual([...entries], [['other-session', 'preserve']]);
  const read = await port.execute({ operation: 'work.read' });
  assert.ok(read.ok);
  if (read.ok) assert.deepEqual(read.state, seed());
});
test('guest limits count UTF-8 bytes on reads and preserve data on oversized writes', async () => {
  const state = initial();
  state.items = Array.from({ length: 250 }, (_, index) => item(`item-${index}`, { outcome: '界'.repeat(2000) }));
  let raw = JSON.stringify(state);
  assert.ok(raw.length < maxWorkStateBytes);
  assert.ok(new TextEncoder().encode(raw).byteLength > maxWorkStateBytes);
  const storage = { getItem: () => raw, setItem: (_: string, value: string) => { raw = value; } };
  const port = createGuestWorkPort(storage);
  assert.equal((await port.execute({ operation: 'work.read' })).ok, false);
  const original = initial();
  original.items = Array.from({ length: 250 }, (_, index) => item(`item-${index}`, { outcome: 'x'.repeat(4000), blocker: 'x'.repeat(1000) }));
  raw = JSON.stringify(original);
  while (new TextEncoder().encode(raw).byteLength < maxWorkStateBytes - 5000) {
    original.items.push(item(`item-${original.items.length}`, { outcome: 'x'.repeat(1000) }));
    raw = JSON.stringify(original);
  }
  assert.ok(new TextEncoder().encode(raw).byteLength < maxWorkStateBytes);
  const saved = raw;
  const result = await port.execute({ operation: 'work.edit', id: 'item-0', revision: 1, fields: { ...fields(original.items[0]), evidence: '界'.repeat(4000) } });
  assert.equal(result.ok, false);
  assert.equal(raw, saved);
});
