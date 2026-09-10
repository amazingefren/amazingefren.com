import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Command, Fields, Item, Result, State, WorkProps } from '../../contracts/work/index.ts';
import { agentReady, label, reason } from '../domain/index.ts';
import './styles.css';

const views = ['My work', 'All', 'Available', 'Agent-ready', 'Waiting', 'Review', 'Systems', 'Done'] as const;
type View = typeof views[number];
type Action = Extract<Command, { revision: number }>['operation'];
const fieldNames = ['title', 'system', 'outcome', 'next', 'acceptance', 'blocker', 'dependencies', 'agentAllowed', 'evidence'] as const;
const fieldsOf = (item: Item): Fields => Object.fromEntries(fieldNames.map(name => [name, item[name]])) as Fields;

export function WorkView({ state, busy, execute, onDirtyChange }: WorkProps) {
  const [view, setView] = useState<View>('My work');
  const [space, setSpace] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [capture, setCapture] = useState<'item' | 'space' | null>(null);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<Item['kind']>('feature');
  const [captureSpace, setCaptureSpace] = useState('');
  const [agents, setAgents] = useState(false);
  const [detailDirty, setDetailDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const newButton = useRef<HTMLButtonElement>(null);
  const submitting = useRef(false);
  const dirty = detailDirty || !!capture && (!!title || agents || kind !== 'feature');
  const locked = busy || pending;
  const active = state.items.find(item => item.id === selected);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  async function run(command: Command): Promise<Result> {
    if (submitting.current || busy) return { ok: false, error: 'unavailable', message: 'A change is still saving.' };
    submitting.current = true;
    setPending(true);
    setError('');
    try {
      const result = await execute(command);
      if (!result.ok) setError(result.message);
      setConflict(!result.ok && result.error === 'conflict');
      return result;
    } catch {
      const result = { ok: false, error: 'unavailable', message: 'Could not save. Try again.' } as const;
      setError(result.message);
      return result;
    } finally { submitting.current = false; setPending(false); }
  }
  function canLeave() {
    if (locked) return false;
    if (dirty) { setError('Save or discard your changes first.'); return false; }
    setError('');
    setConflict(false);
    return true;
  }
  function open(id: string) {
    if (!canLeave()) return;
    returnFocus.current = document.activeElement as HTMLElement;
    setSelected(id);
    setCapture(null);
  }
  function close() {
    if (!canLeave()) return;
    setSelected(null);
    requestAnimationFrame(() => {
      if (returnFocus.current?.isConnected) returnFocus.current.focus();
      else (document.getElementById(`work-item-${selected}`) ?? newButton.current)?.focus();
    });
  }
  function begin(mode: 'item' | 'space') {
    if (!canLeave()) return;
    setSelected(null);
    setTitle('');
    setKind('feature');
    setAgents(false);
    setCaptureSpace(space === 'all' ? state.spaces[0]?.id ?? '' : space);
    setCapture(mode);
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = crypto.randomUUID();
    const result = await run(capture === 'space'
      ? { operation: 'work.create-space', id, title: title.trim(), agents }
      : { operation: 'work.create-item', id, title: title.trim(), kind, spaceId: captureSpace });
    if (!result.ok) return;
    setTitle('');
    setAgents(false);
    setKind('feature');
    setCapture(null);
    if (capture === 'space') { setSpace(id); newButton.current?.focus(); }
    else { returnFocus.current = newButton.current; setSelected(id); }
  }
  const scope = state.items.filter(item => (space === 'all' || item.spaceId === space) && `${item.title} ${item.system} ${item.next}`.toLowerCase().includes(query.toLowerCase()));
  function inView(item: Item, target: View) {
    if (target === 'All') return true;
    if (target === 'Done') return item.phase === 'done';
    if (target === 'Systems') return !!item.system;
    if (item.phase === 'done') return false;
    if (target === 'My work') return item.assignee === 'me' || item.focus;
    if (target === 'Agent-ready') return agentReady(state, item);
    if (target === 'Waiting') return !!reason(state, item);
    if (target === 'Review') return item.phase === 'review';
    return item.phase === 'open' && !reason(state, item);
  }
  const visible = scope.filter(item => inView(item, view) && !(view === 'My work' && item.focus));
  const focused = scope.filter(item => item.focus && item.phase !== 'done');
  const systems = [...new Set(scope.map(item => item.system).filter(Boolean))].sort();
  const spaceTitle = (id: string) => state.spaces.find(s => s.id === id)?.title ?? '';
  function row(item: Item) {
    const blocker = reason(state, item);
    return <button type="button" id={`work-item-${item.id}`} className="ae-work-row" key={item.id} onClick={() => open(item.id)} disabled={locked}>
      <span className="ae-work-kind" aria-label={item.kind}>{item.kind === 'publication' ? '¶' : item.kind === 'bug' ? '!' : '◇'}</span>
      <span className="ae-work-row-title"><strong>{item.title}</strong>{(blocker || item.next) && <span className={blocker ? 'ae-work-blocker' : ''}>{blocker || item.next}</span>}</span>
      <span className="ae-work-row-space">{spaceTitle(item.spaceId)}</span>
      <span className="ae-work-state" data-phase={blocker ? 'waiting' : item.phase}>{label(state, item)}</span>
      <span className="ae-work-arrow" aria-hidden="true">→</span>
    </button>;
  }
  return <section className="ae-work" aria-label="Work" aria-busy={locked}>
    <header className="ae-work-heading"><h1>Work</h1><button ref={newButton} type="button" className="ae-work-primary" onClick={() => begin(state.spaces.length ? 'item' : 'space')} disabled={locked}>{state.spaces.length ? '+ New item' : '+ New space'}</button></header>
    {error && <div className="ae-work-error" role="alert">{error}</div>}
    {capture ? <form className="ae-work-capture" onSubmit={create}>
      <fieldset disabled={locked}><label>{capture === 'space' ? 'Space name' : 'Title'}<input autoFocus required maxLength={capture === 'space' ? 100 : 160} value={title} onChange={event => setTitle(event.target.value)} /></label>
        {capture === 'item' ? <div className="ae-work-pair"><label>Space<select value={captureSpace} onChange={event => setCaptureSpace(event.target.value)}>{state.spaces.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label><label>Type<select value={kind} onChange={event => setKind(event.target.value as Item['kind'])}><option value="feature">Feature</option><option value="bug">Bug</option><option value="publication">Publication</option></select></label></div> : <label className="ae-work-check"><input type="checkbox" checked={agents} onChange={event => setAgents(event.target.checked)} />Allow agent work</label>}
        <div className="ae-work-actions"><button className="ae-work-primary" disabled={!title.trim() || capture === 'item' && !captureSpace}>{locked ? 'Creating…' : 'Create'}</button><button type="button" onClick={() => { setCapture(null); setTitle(''); setKind('feature'); setAgents(false); setError(''); newButton.current?.focus(); }}>Cancel</button></div>
      </fieldset>
    </form> : active ? <Detail key={active.id} item={active} state={state} pending={locked} conflict={conflict} run={run} close={close} open={open} onDirty={setDetailDirty} /> : <>
      <div className="ae-work-toolbar"><div className="ae-work-space"><select aria-label="Space" value={space} disabled={locked} onChange={event => { if (canLeave()) setSpace(event.target.value); }}><option value="all">All spaces</option>{state.spaces.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select><button type="button" aria-label="New space" title="New space" disabled={locked} onClick={() => begin('space')}>+</button></div><input aria-label="Search work" type="search" placeholder="Search work" value={query} onChange={event => setQuery(event.target.value)} /></div>
      <select className="ae-work-view-select" aria-label="Work view" value={view} disabled={locked} onChange={event => { if (canLeave()) setView(event.target.value as View); }}>{views.map(target => <option key={target} value={target}>{target} · {target === 'Systems' ? systems.length : scope.filter(item => inView(item, target)).length}</option>)}</select>
      <nav className="ae-work-tabs" aria-label="Work views">{views.map(target => <button type="button" key={target} aria-pressed={view === target} disabled={locked} onClick={() => { if (canLeave()) setView(target); }}>{target}<span>{target === 'Systems' ? systems.length : scope.filter(item => inView(item, target)).length}</span></button>)}</nav>
      {view === 'My work' && <section className="ae-work-focus"><header><h2>Focus</h2><span>{state.items.filter(item => item.focus && item.phase !== 'done').length}/3</span></header><div>{focused.map(item => <button type="button" id={`work-item-${item.id}`} key={item.id} disabled={locked} onClick={() => open(item.id)}><small>{spaceTitle(item.spaceId)}</small><strong>{item.title}</strong><span>{reason(state, item) || item.next || label(state, item)}</span></button>)}{!focused.length && <button type="button" className="ae-work-focus-empty" onClick={() => setView('Available')}>+ Choose work</button>}</div></section>}
      {view === 'Systems' ? <div className="ae-work-systems">{systems.map(system => {
        const items = scope.filter(item => item.system === system);
        const done = items.filter(item => item.phase === 'done').length;
        const bugs = items.filter(item => item.kind === 'bug' && item.phase !== 'done').length;
        return <details key={system}><summary><strong>{system}</strong><span>{done}/{items.length} done{bugs ? ` · ${bugs} ${bugs === 1 ? 'bug' : 'bugs'}` : ''}</span></summary><div>{items.map(row)}</div></details>;
      })}{!systems.length && <div className="ae-work-empty">No systems linked</div>}</div> : <div className="ae-work-list">{visible.map(row)}{!visible.length && !(view === 'My work' && focused.length) && <div className="ae-work-empty"><span>{query ? 'No matches' : view === 'My work' ? 'No work started' : `Nothing ${view === 'Done' ? 'done yet' : view === 'Waiting' ? 'waiting' : view === 'Review' ? 'to review' : 'available'}`}</span>{view === 'My work' && !query && <button type="button" onClick={() => setView('Available')}>Browse available</button>}</div>}</div>}
    </>}
  </section>;
}

function Detail({ item, state, pending, conflict, run, close, open, onDirty }: { item: Item; state: State; pending: boolean; conflict: boolean; run(command: Command): Promise<Result>; close(): void; open(id: string): void; onDirty(dirty: boolean): void }) {
  const [base, setBase] = useState(item);
  const [draft, setDraft] = useState(() => fieldsOf(item));
  const [saved, setSaved] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(fieldsOf(base));
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  useEffect(() => { if (!dirty && item.revision !== base.revision) { setBase(item); setDraft(fieldsOf(item)); } }, [item, dirty, base.revision]);
  const done = item.phase === 'done';
  const human = item.kind === 'publication' || !state.spaces.find(space => space.id === item.spaceId)?.agents;
  const blocker = reason(state, item);
  const actionReason = dirty ? 'Save changes first' : blocker;
  const focusFull = !item.focus && state.items.filter(candidate => candidate.focus && candidate.phase !== 'done').length >= 3;
  async function action(operation: Action) {
    if (operation === 'work.edit') return;
    await run({ operation, id: item.id, revision: item.revision });
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await run({ operation: 'work.edit', id: item.id, revision: base.revision, fields: draft });
    if (!result.ok) return;
    const updated = result.state.items.find(candidate => candidate.id === item.id);
    if (updated) { setBase(updated); setDraft(fieldsOf(updated)); setSaved(true); }
  }
  async function reload() {
    const result = await run({ operation: 'work.read' });
    if (!result.ok) return;
    const updated = result.state.items.find(candidate => candidate.id === item.id);
    if (updated) { setBase(updated); setDraft(fieldsOf(updated)); setSaved(false); }
  }
  function update<K extends keyof Fields>(name: K, value: Fields[K]) { setDraft(previous => ({ ...previous, [name]: value })); setSaved(false); }
  return <article className="ae-work-detail">
    <div className="ae-work-detail-bar"><button type="button" onClick={close} disabled={pending}>← Back</button><span className="ae-work-state" data-phase={blocker ? 'waiting' : item.phase}>{label(state, item)}</span><span>{state.spaces.find(space => space.id === item.spaceId)?.title}</span><span>{item.kind === 'publication' ? 'Human-only' : item.assignee === 'agent' ? 'Agent' : item.assignee === 'me' ? 'Me' : ''}</span></div>
    <h2 ref={heading} tabIndex={-1} className="ae-focus-target">{item.title}</h2>
    <div className="ae-work-detail-grid"><form onSubmit={save}>
      <fieldset disabled={pending || done}>
        <label>Title<input required maxLength={160} value={draft.title} onChange={event => update('title', event.target.value)} /></label>
        <label>Outcome<textarea rows={2} maxLength={4000} value={draft.outcome} onChange={event => update('outcome', event.target.value)} /></label>
        <label>Next action<input maxLength={4000} value={draft.next} onChange={event => update('next', event.target.value)} /></label>
        <label>Done when<textarea rows={2} maxLength={4000} value={draft.acceptance} onChange={event => update('acceptance', event.target.value)} /></label>
        <label>Result<textarea rows={3} maxLength={4000} value={draft.evidence} onChange={event => update('evidence', event.target.value)} /></label>
        <details className="ae-work-options"><summary>Details</summary><label>System<input maxLength={160} value={draft.system} onChange={event => update('system', event.target.value)} /></label><label>Blocked by<input maxLength={4000} value={draft.blocker} onChange={event => update('blocker', event.target.value)} /></label>
          <details><summary>Dependencies <span>{draft.dependencies.length}</span></summary><div className="ae-work-dependencies">{state.items.filter(candidate => candidate.id !== item.id).map(candidate => <label className="ae-work-check" key={candidate.id}><input type="checkbox" checked={draft.dependencies.includes(candidate.id)} onChange={event => update('dependencies', event.target.checked ? [...draft.dependencies, candidate.id] : draft.dependencies.filter(id => id !== candidate.id))} />{candidate.title}</label>)}</div></details>
          {!human && <label className="ae-work-check"><input type="checkbox" checked={draft.agentAllowed} onChange={event => update('agentAllowed', event.target.checked)} />Allow agent work</label>}
        </details>
      </fieldset>
      {!done && <div className="ae-work-actions ae-work-save"><button className="ae-work-primary" disabled={!dirty || pending}>{pending ? 'Saving…' : 'Save'}</button>{conflict ? <button type="button" disabled={pending} onClick={reload}>{dirty ? 'Discard and reload' : 'Reload'}</button> : dirty && <button type="button" disabled={pending} onClick={() => { setBase(item); setDraft(fieldsOf(item)); setSaved(false); }}>Discard</button>}<span role="status">{dirty ? 'Unsaved' : saved ? 'Saved' : ''}</span></div>}
    </form><aside className="ae-work-context">
      <div className="ae-work-action-stack">
        {blocker && <p className="ae-work-blocker">{blocker}</p>}
        {!done && <button type="button" disabled={pending || dirty || focusFull} title={dirty ? 'Save changes first' : focusFull ? 'Three items already in focus' : undefined} onClick={() => action('work.focus')}>{item.focus ? '− Remove focus' : '+ Focus'}{focusFull ? ' · 3/3' : ''}</button>}
        {item.phase === 'open' && <button type="button" className="ae-work-primary" disabled={pending || !!actionReason} title={actionReason || undefined} onClick={() => action('work.start')}>Start work</button>}
        {item.phase === 'active' && <button type="button" className="ae-work-primary" disabled={pending || !!actionReason || !item.evidence.trim()} title={actionReason || (!item.evidence.trim() ? 'Add a result first' : undefined)} onClick={() => action('work.submit')}>Send to review</button>}
        {item.phase === 'review' && <button type="button" className="ae-work-primary" disabled={pending || !!actionReason || !item.evidence.trim()} title={actionReason || (!item.evidence.trim() ? 'Add a result first' : undefined)} onClick={() => action('work.accept')}>Accept result</button>}
        {(item.phase === 'active' || item.phase === 'review') && <button type="button" disabled={pending || dirty} title={dirty ? 'Save changes first' : undefined} onClick={() => action('work.return')}>Return to available</button>}
        {done && <button type="button" disabled={pending} onClick={() => action('work.reopen')}>Reopen</button>}
      </div>
      {!!item.dependencies.length && <section><h3>Depends on</h3>{item.dependencies.map(id => { const linked = state.items.find(candidate => candidate.id === id); return linked ? <button className="ae-work-related" key={id} type="button" disabled={pending} onClick={() => open(id)}><span>{linked.title}</span><small>{label(state, linked)}</small></button> : <p key={id}>Unavailable item</p>; })}</section>}
      {state.items.some(candidate => candidate.dependencies.includes(item.id)) && <section><h3>Unblocks</h3>{state.items.filter(candidate => candidate.dependencies.includes(item.id)).map(candidate => <button className="ae-work-related" key={candidate.id} type="button" disabled={pending} onClick={() => open(candidate.id)}><span>{candidate.title}</span><small>{label(state, candidate)}</small></button>)}</section>}
      {!!item.history.length && <details><summary>Activity</summary><ol>{item.history.map((entry, index) => <li key={index}>{entry}</li>)}</ol></details>}
    </aside></div>
  </article>;
}
