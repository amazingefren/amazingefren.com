import { isState, parseCommand } from '../operations/validation.ts';
import type { State, Item, Command, Result } from '../../contracts/work/index.ts';
export function waitingOn(state: State, item: Item) { return item.dependencies.filter(id => state.items.find(i => i.id === id)?.phase !== 'done'); }
export function reason(state: State, item: Item): string {
  if (item.blocker.trim()) return item.blocker;
  const pending = waitingOn(state, item);
  if (pending.length) return `Waiting for ${pending.map(id => state.items.find(i => i.id === id)?.title ?? 'missing item').join(', ')}`;
  if (!item.next.trim()) return 'Add a next action';
  if (!item.acceptance.trim()) return 'Add completion criteria';
  return '';
}
export function agentReady(state: State, item: Item) { return item.phase === 'open' && !item.assignee && item.kind !== 'publication' && item.agentAllowed && !!state.spaces.find(s => s.id === item.spaceId)?.agents && !reason(state, item); }
export function label(state: State, item: Item) { return item.phase === 'done' ? 'Done' : reason(state, item) ? 'Waiting' : item.phase === 'review' ? 'Review' : item.phase === 'active' ? (item.assignee === 'agent' ? 'Agent working' : 'In progress') : 'Available'; }
function cycle(state: State, id: string, dependencies: string[]): boolean {
  const visit = (target: string, seen: Set<string>): boolean => {
    if (target === id) return true;
    if (seen.has(target)) return false;
    seen.add(target);
    return (state.items.find(i => i.id === target)?.dependencies ?? []).some(d => visit(d, seen));
  };
  return dependencies.some(d => visit(d, new Set()));
}
function reduce(state: State, command: Command, actor: 'owner' | 'agent'): Result {
  const fail = (error: 'invalid' | 'denied' | 'conflict', message: string): Result => ({ ok: false, error, message });
  if (actor !== 'owner' && actor !== 'agent') return fail('denied', 'Unknown actor.');
  if (actor === 'agent' && !['work.read', 'work.start', 'work.submit', 'work.edit'].includes(command.operation)) return fail('denied', 'This action belongs to you.');
  if (command.operation === 'work.read') return { ok: true, state };
  if (command.operation === 'work.create-space') {
    if (state.spaces.length >= 100) return fail('invalid', 'Space limit reached.');
    if (!command.title.trim() || command.title.length > 100 || state.spaces.some(s => s.id === command.id)) return fail('invalid', 'Enter a space name under 100 characters.');
    return { ok: true, state: { ...state, spaces: [...state.spaces, { id: command.id, title: command.title.trim(), agents: command.agents }] } };
  }
  if (command.operation === 'work.create-item') {
    if (state.items.length >= 1000) return fail('invalid', 'Item limit reached.');
    if (!state.spaces.some(s => s.id === command.spaceId) || state.items.some(i => i.id === command.id) || !command.title.trim() || command.title.length > 160 || !['publication', 'feature', 'bug'].includes(command.kind)) return fail('invalid', 'Choose a space, a type, and a title under 160 characters.');
    const item: Item = { id: command.id, spaceId: command.spaceId, title: command.title.trim(), kind: command.kind, system: '', outcome: '', next: '', acceptance: '', blocker: '', dependencies: [], agentAllowed: false, assignee: null, phase: 'open', evidence: '', focus: false, revision: 1, history: ['Captured by you'] };
    return { ok: true, state: { ...state, items: [...state.items, item] } };
  }
  const item = state.items.find(i => i.id === command.id);
  if (!item) return fail('invalid', 'Item not found.');
  if (actor === 'agent' && (item.kind === 'publication' || !item.agentAllowed || !state.spaces.find(s => s.id === item.spaceId)?.agents)) return fail('denied', 'Agent access is not allowed for this work.');
  if (command.revision !== item.revision) return fail('conflict', 'This item changed. Reopen it before trying again.');
  let next = { ...item };
  let event = '';
  switch (command.operation) {
    case 'work.edit': {
      if (item.phase === 'done') return fail('invalid', 'Reopen accepted work before changing its scope.');
      const f = command.fields;
      if (actor === 'agent' && (item.phase !== 'active' || item.assignee !== 'agent' || Object.keys(f).some(key => key !== 'evidence' && JSON.stringify(f[key as keyof typeof f]) !== JSON.stringify(item[key as keyof typeof f])))) return fail('denied', 'Only evidence may change on your assigned work.');
      if (!f.title.trim() || f.title.length > 160 || [f.system, f.outcome, f.next, f.acceptance, f.blocker, f.evidence].some(s => typeof s !== 'string' || s.length > 4000)) return fail('invalid', 'Use a title under 160 characters and details under 4,000.');
      if (f.dependencies.some(id => !state.items.some(i => i.id === id)) || new Set(f.dependencies).size !== f.dependencies.length || cycle(state, item.id, f.dependencies)) return fail('invalid', 'Dependencies must exist and cannot create a loop.');
      if (f.agentAllowed && (item.kind === 'publication' || !state.spaces.find(s => s.id === item.spaceId)?.agents)) return fail('denied', 'This work is human-only.');
      next = { ...item, ...f, title: f.title.trim() };
      if (item.assignee === 'agent' && !f.agentAllowed) { next.assignee = null; next.phase = 'open'; }
      if (item.phase === 'review' && next.assignee !== null) next.phase = 'active';
      event = actor === 'agent' ? 'Agent added evidence' : 'You updated the scope'; break;
    }
    case 'work.focus':
      if (item.phase === 'done') return fail('invalid', 'Accepted work does not need focus.');
      if (!item.focus && state.items.filter(i => i.focus && i.phase !== 'done').length >= 3) return fail('invalid', 'Make room in focus first. Keep up to three items.');
      next.focus = !item.focus; event = next.focus ? 'Added to your focus' : 'Removed from your focus'; break;
    case 'work.start':
      if (item.phase !== 'open' || item.assignee || reason(state, item)) return fail('invalid', reason(state, item) || 'This item is already assigned.');
      if (actor === 'agent' && !agentReady(state, item)) return fail('denied', 'This item is not available to agents.');
      next.assignee = actor === 'owner' ? 'me' : 'agent'; next.phase = 'active'; event = actor === 'owner' ? 'You started work' : 'Agent claimed work'; break;
    case 'work.submit':
      if (item.phase !== 'active' || !item.evidence.trim() || reason(state, item)) return fail('invalid', reason(state, item) || 'Active work needs evidence before review.');
      if (actor === 'agent' && item.assignee !== 'agent') return fail('denied', 'This work is not assigned to the agent.');
      next.phase = 'review'; event = 'Submitted for your review'; break;
    case 'work.accept':
      if (item.phase !== 'review' || !item.evidence.trim() || reason(state, item)) return fail('invalid', reason(state, item) || 'Review evidence before accepting.');
      next.phase = 'done'; next.focus = false; event = 'You accepted the evidence'; break;
    case 'work.return':
      if (!['active', 'review'].includes(item.phase)) return fail('invalid', 'Only assigned work can be returned.');
      next.phase = 'open'; next.assignee = null; event = 'Returned for another pass'; break;
    case 'work.reopen':
      if (item.phase !== 'done') return fail('invalid', 'Only accepted work can be reopened.');
      next.phase = 'open'; next.assignee = null; next.evidence = ''; event = 'You reopened the work'; break;
    default: return fail('invalid', 'Undeclared operation.');
  }
  next.revision += 1; next.history = [...item.history, event].slice(-100);
  return { ok: true, state: { ...state, items: state.items.map(i => i.id === item.id ? next : i) } };
}

export function execute(state: State, command: Command, actor: 'owner' | 'agent' = 'owner'): Result {
  if (!isState(state) || !parseCommand(command)) return { ok: false, error: 'invalid', message: 'Invalid work data.' };
  if (!state.synthetic) return { ok: false, error: 'denied', message: 'Guest work requires synthetic data.' };
  const result = reduce(state, command, actor);
  if (!result.ok) return result;
  const next = { ...result.state, version: state.version + (command.operation === 'work.read' ? 0 : 1) };
  if (!isState(next)) return { ok: false, error: 'invalid', message: 'Work limits exceeded.' };
  return { ok: true, state: structuredClone(next) };
}
export function seed(): State {
  const item = (id: string, title: string, fields: Partial<Item>): Item => ({ id, title, spaceId: 'ae', kind: 'feature', system: 'workspace', outcome: '', next: 'Implement the declared behavior', acceptance: 'Behavior, access denial, and failure checks pass.', blocker: '', dependencies: [], agentAllowed: false, assignee: null, phase: 'open', evidence: '', focus: false, revision: 1, history: ['Sample item; not an audit of AE'], ...fields });
  return { schemaVersion: 1, synthetic: true, version: 1, spaces: [{ id: 'writing', title: 'Publications', agents: false }, { id: 'ae', title: 'AE development', agents: true }, { id: 'bugs', title: 'Bugs', agents: true }], items: [
    item('essay', 'Essay draft', { spaceId: 'writing', kind: 'publication', system: '', outcome: 'A publication written and approved by me.', next: 'Write the opening in my manuscript', acceptance: 'I have edited and approved the complete manuscript.', phase: 'active', assignee: 'me', focus: true }),
    item('scope', 'Decide the owner access rules', { system: 'auth', outcome: 'Owner data has explicit access rules.', next: 'Review which operations agents may use', acceptance: 'Every protected operation names the required permission.', focus: true }),
    item('auth', 'Implement owner access checks', { system: 'auth', outcome: 'Protected reads fail closed.', dependencies: ['scope'], agentAllowed: true }),
    item('release', 'Connect publication releases', { system: 'publishing', outcome: 'Only an approved revision can become public.', next: 'Wire the approved release operation', dependencies: ['auth'], agentAllowed: true }),
    item('focus', 'Restore keyboard focus after closing details', { spaceId: 'bugs', kind: 'bug', outcome: 'Keyboard navigation resumes at the opened item.', next: 'Reproduce focus loss and fix the return target', agentAllowed: true, focus: true }),
    item('export', 'Review the catalog export', { system: 'system-explorer', outcome: 'The catalog contains approved public fields only.', next: 'Inspect the exported fields and denial checks', phase: 'review', assignee: 'agent', agentAllowed: true, evidence: 'Sample review evidence: allowlisted fields and denied private entries. Replace with a real check result.' }),
    item('reading', 'Reading notes', { spaceId: 'writing', kind: 'publication', system: '', next: 'Read source material and collect my own notes', acceptance: 'My source notes are complete.', blocker: 'Waiting for source material' }),
    item('retry', 'Handle a failed save without losing text', { spaceId: 'bugs', kind: 'bug', system: 'studio', next: 'Exercise a failed save and retry', agentAllowed: true }),
    item('tokens', 'Use the shared theme controls', { system: 'design', phase: 'done', evidence: 'Synthetic accepted result; not live implementation evidence.' })
  ] };
}
