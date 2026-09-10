import type { Command, State } from '../../contracts/work/index.ts';
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const keys = (v: Record<string, unknown>, names: string[]) => Object.keys(v).length === names.length && names.every(k => Object.hasOwn(v, k));
const text = (v: unknown, max: number, required = false): v is string => typeof v === 'string' && v.length <= max && (!required || !!v.trim());
const id = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(v);
const integer = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 1 && (v as number) < Number.MAX_SAFE_INTEGER;
const fieldNames = ['title', 'system', 'outcome', 'next', 'acceptance', 'blocker', 'dependencies', 'agentAllowed', 'evidence'];
function fields(v: unknown) {
  return record(v) && keys(v, fieldNames) && text(v.title, 160, true) && ['system', 'outcome', 'next', 'acceptance', 'blocker', 'evidence'].every(k => text(v[k], 4000)) && typeof v.agentAllowed === 'boolean' && Array.isArray(v.dependencies) && v.dependencies.length <= 100 && v.dependencies.every(id) && new Set(v.dependencies).size === v.dependencies.length;
}
export function parseCommand(value: unknown): Command | null {
  if (!record(value)) return null;
  const v = value;
  if (v.operation === 'work.read') return keys(v, ['operation']) ? v as Command : null;
  if (v.operation === 'work.create-space') return keys(v, ['operation', 'id', 'title', 'agents']) && id(v.id) && text(v.title, 100, true) && typeof v.agents === 'boolean' ? v as Command : null;
  if (v.operation === 'work.create-item') return keys(v, ['operation', 'id', 'spaceId', 'title', 'kind']) && id(v.id) && id(v.spaceId) && text(v.title, 160, true) && ['feature', 'bug', 'publication'].includes(v.kind as string) ? v as Command : null;
  if (!id(v.id) || !integer(v.revision)) return null;
  if (v.operation === 'work.edit') return keys(v, ['operation', 'id', 'revision', 'fields']) && fields(v.fields) ? v as Command : null;
  return ['work.focus', 'work.start', 'work.submit', 'work.accept', 'work.return', 'work.reopen'].includes(v.operation as string) && keys(v, ['operation', 'id', 'revision']) ? v as Command : null;
}
export function isState(value: unknown): value is State {
  if (!record(value) || !keys(value, ['schemaVersion', 'version', 'synthetic', 'spaces', 'items']) || value.schemaVersion !== 1 || !(value.version === 0 || integer(value.version)) || typeof value.synthetic !== 'boolean' || !Array.isArray(value.spaces) || !Array.isArray(value.items) || value.spaces.length > 100 || value.items.length > 1000) return false;
  if (!value.spaces.every(s => record(s) && keys(s, ['id', 'title', 'agents']) && id(s.id) && text(s.title, 100, true) && typeof s.agents === 'boolean')) return false;
  const spaces = new Map(value.spaces.map(s => [s.id, s]));
  if (spaces.size !== value.spaces.length) return false;
  const names = ['id', 'spaceId', 'kind', 'assignee', 'phase', 'focus', 'revision', 'history', ...fieldNames];
  if (!value.items.every(i => {
    if (!record(i) || !keys(i, names) || !id(i.id) || !id(i.spaceId) || !spaces.has(i.spaceId) || !['feature', 'bug', 'publication'].includes(i.kind as string) || !['open', 'active', 'review', 'done'].includes(i.phase as string) || ![null, 'me', 'agent'].includes(i.assignee as null) || typeof i.focus !== 'boolean' || !integer(i.revision) || !Array.isArray(i.history) || i.history.length > 100 || !i.history.every(h => text(h, 200, true))) return false;
    if (!fields(Object.fromEntries(fieldNames.map(k => [k, i[k]])))) return false;
    if (i.agentAllowed && (i.kind === 'publication' || !spaces.get(i.spaceId)?.agents)) return false;
    if (i.assignee === 'agent' && !i.agentAllowed) return false;
    if (i.phase === 'open' && i.assignee !== null || ['active', 'review'].includes(i.phase as string) && i.assignee === null) return false;
    if (['review', 'done'].includes(i.phase as string) && !text(i.evidence, 4000, true)) return false;
    return !(i.phase === 'done' && i.focus);
  })) return false;
  const state = value as State;
  const items = new Map(state.items.map(i => [i.id, i]));
  if (items.size !== state.items.length || state.items.filter(i => i.focus).length > 3) return false;
  const visiting = new Set<string>(); const visited = new Set<string>();
  function visit(key: string): boolean {
    if (visiting.has(key) || !items.has(key)) return false;
    if (visited.has(key)) return true;
    visiting.add(key);
    if (!items.get(key)!.dependencies.every(visit)) return false;
    visiting.delete(key); visited.add(key); return true;
  }
  return state.items.every(i => visit(i.id));
}
