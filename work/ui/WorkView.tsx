import { useEffect, useRef, useState, type FormEvent } from 'react';
import type {
  Command,
  Item,
  Result,
  WorkProps,
} from '../../contracts/work/index.ts';
import { agentReady, label, reason } from '../domain/index.ts';
import { WorkDetail } from './WorkDetail.tsx';
import './styles.css';

const views = [
  'My work',
  'All',
  'Available',
  'Agent-ready',
  'Waiting',
  'Review',
  'Systems',
  'Done',
] as const;
type View = (typeof views)[number];
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
  const dirty =
    detailDirty || (!!capture && (!!title || agents || kind !== 'feature'));
  const locked = busy || pending;
  const active = state.items.find((item) => item.id === selected);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  async function run(command: Command): Promise<Result> {
    if (submitting.current || busy)
      return {
        ok: false,
        error: 'unavailable',
        message: 'A change is still saving.',
      };
    submitting.current = true;
    setPending(true);
    setError('');
    try {
      const result = await execute(command);
      if (!result.ok) setError(result.message);
      setConflict(!result.ok && result.error === 'conflict');
      return result;
    } catch {
      const result = {
        ok: false,
        error: 'unavailable',
        message: 'Could not save. Try again.',
      } as const;
      setError(result.message);
      return result;
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  function canLeave() {
    if (locked) return false;
    if (dirty) {
      setError('Save or discard your changes first.');
      return false;
    }
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
      else
        (
          document.getElementById(`work-item-${selected}`) ?? newButton.current
        )?.focus();
    });
  }
  function begin(mode: 'item' | 'space') {
    if (!canLeave()) return;
    setSelected(null);
    setTitle('');
    setKind('feature');
    setAgents(false);
    setCaptureSpace(space === 'all' ? (state.spaces[0]?.id ?? '') : space);
    setCapture(mode);
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = crypto.randomUUID();
    const result = await run(
      capture === 'space'
        ? { operation: 'work.create-space', id, title: title.trim(), agents }
        : {
            operation: 'work.create-item',
            id,
            title: title.trim(),
            kind,
            spaceId: captureSpace,
          },
    );
    if (!result.ok) return;
    setTitle('');
    setAgents(false);
    setKind('feature');
    setCapture(null);
    if (capture === 'space') {
      setSpace(id);
      newButton.current?.focus();
    } else {
      returnFocus.current = newButton.current;
      setSelected(id);
    }
  }
  const scope = state.items.filter(
    (item) =>
      (space === 'all' || item.spaceId === space) &&
      `${item.title} ${item.system} ${item.next}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
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
  const visible = scope.filter(
    (item) => inView(item, view) && !(view === 'My work' && item.focus),
  );
  const focused = scope.filter((item) => item.focus && item.phase !== 'done');
  const systems = [
    ...new Set(scope.map((item) => item.system).filter(Boolean)),
  ].sort();
  const spaceTitle = (id: string) =>
    state.spaces.find((s) => s.id === id)?.title ?? '';
  function row(item: Item) {
    const blocker = reason(state, item);
    return (
      <button
        type="button"
        id={`work-item-${item.id}`}
        className="ae-work-row"
        key={item.id}
        onClick={() => open(item.id)}
        disabled={locked}
      >
        <span className="ae-work-kind" aria-label={item.kind}>
          {item.kind === 'publication' ? '¶' : item.kind === 'bug' ? '!' : '◇'}
        </span>
        <span className="ae-work-row-title">
          <strong>{item.title}</strong>
          {(blocker || item.next) && (
            <span className={blocker ? 'ae-work-blocker' : ''}>
              {blocker || item.next}
            </span>
          )}
        </span>
        <span className="ae-work-row-space">{spaceTitle(item.spaceId)}</span>
        <span
          className="ae-work-state"
          data-phase={blocker ? 'waiting' : item.phase}
        >
          {label(state, item)}
        </span>
        <span className="ae-work-arrow" aria-hidden="true">
          →
        </span>
      </button>
    );
  }
  return (
    <section className="ae-work" aria-label="Work" aria-busy={locked}>
      <header className="ae-work-heading">
        <h1>Work</h1>
        <button
          ref={newButton}
          type="button"
          className="ae-work-primary"
          onClick={() => begin(state.spaces.length ? 'item' : 'space')}
          disabled={locked}
        >
          {state.spaces.length ? '+ New item' : '+ New space'}
        </button>
      </header>
      {error && (
        <div className="ae-work-error" role="alert">
          {error}
        </div>
      )}
      {capture ? (
        <form className="ae-work-capture" onSubmit={create}>
          <fieldset disabled={locked}>
            <label>
              {capture === 'space' ? 'Space name' : 'Title'}
              <input
                autoFocus
                required
                maxLength={capture === 'space' ? 100 : 160}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            {capture === 'item' ? (
              <div className="ae-work-pair">
                <label>
                  Space
                  <select
                    value={captureSpace}
                    onChange={(event) => setCaptureSpace(event.target.value)}
                  >
                    {state.spaces.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Type
                  <select
                    value={kind}
                    onChange={(event) =>
                      setKind(event.target.value as Item['kind'])
                    }
                  >
                    <option value="feature">Feature</option>
                    <option value="bug">Bug</option>
                    <option value="publication">Publication</option>
                  </select>
                </label>
              </div>
            ) : (
              <label className="ae-work-check">
                <input
                  type="checkbox"
                  checked={agents}
                  onChange={(event) => setAgents(event.target.checked)}
                />
                Allow agent work
              </label>
            )}
            <div className="ae-work-actions">
              <button
                className="ae-work-primary"
                disabled={
                  !title.trim() || (capture === 'item' && !captureSpace)
                }
              >
                {locked ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCapture(null);
                  setTitle('');
                  setKind('feature');
                  setAgents(false);
                  setError('');
                  newButton.current?.focus();
                }}
              >
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
      ) : active ? (
        <WorkDetail
          key={active.id}
          item={active}
          state={state}
          pending={locked}
          conflict={conflict}
          run={run}
          close={close}
          open={open}
          onDirty={setDetailDirty}
        />
      ) : (
        <>
          <div className="ae-work-toolbar">
            <div className="ae-work-space">
              <select
                aria-label="Space"
                value={space}
                disabled={locked}
                onChange={(event) => {
                  if (canLeave()) setSpace(event.target.value);
                }}
              >
                <option value="all">All spaces</option>
                {state.spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="New space"
                title="New space"
                disabled={locked}
                onClick={() => begin('space')}
              >
                +
              </button>
            </div>
            <input
              aria-label="Search work"
              type="search"
              placeholder="Search work"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select
            className="ae-work-view-select"
            aria-label="Work view"
            value={view}
            disabled={locked}
            onChange={(event) => {
              if (canLeave()) setView(event.target.value as View);
            }}
          >
            {views.map((target) => (
              <option key={target} value={target}>
                {target} ·{' '}
                {target === 'Systems'
                  ? systems.length
                  : scope.filter((item) => inView(item, target)).length}
              </option>
            ))}
          </select>
          <nav className="ae-work-tabs" aria-label="Work views">
            {views.map((target) => (
              <button
                type="button"
                key={target}
                aria-pressed={view === target}
                disabled={locked}
                onClick={() => {
                  if (canLeave()) setView(target);
                }}
              >
                {target}
                <span>
                  {target === 'Systems'
                    ? systems.length
                    : scope.filter((item) => inView(item, target)).length}
                </span>
              </button>
            ))}
          </nav>
          {view === 'My work' && (
            <section className="ae-work-focus">
              <header>
                <h2>Focus</h2>
                <span>
                  {
                    state.items.filter(
                      (item) => item.focus && item.phase !== 'done',
                    ).length
                  }
                  /3
                </span>
              </header>
              <div>
                {focused.map((item) => (
                  <button
                    type="button"
                    id={`work-item-${item.id}`}
                    key={item.id}
                    disabled={locked}
                    onClick={() => open(item.id)}
                  >
                    <small>{spaceTitle(item.spaceId)}</small>
                    <strong>{item.title}</strong>
                    <span>
                      {reason(state, item) || item.next || label(state, item)}
                    </span>
                  </button>
                ))}
                {!focused.length && (
                  <button
                    type="button"
                    className="ae-work-focus-empty"
                    onClick={() => setView('Available')}
                  >
                    + Choose work
                  </button>
                )}
              </div>
            </section>
          )}
          {view === 'Systems' ? (
            <div className="ae-work-systems">
              {systems.map((system) => {
                const items = scope.filter((item) => item.system === system);
                const done = items.filter(
                  (item) => item.phase === 'done',
                ).length;
                const bugs = items.filter(
                  (item) => item.kind === 'bug' && item.phase !== 'done',
                ).length;
                return (
                  <details key={system}>
                    <summary>
                      <strong>{system}</strong>
                      <span>
                        {done}/{items.length} done
                        {bugs
                          ? ` · ${bugs} ${bugs === 1 ? 'bug' : 'bugs'}`
                          : ''}
                      </span>
                    </summary>
                    <div>{items.map(row)}</div>
                  </details>
                );
              })}
              {!systems.length && (
                <div className="ae-work-empty">No systems linked</div>
              )}
            </div>
          ) : (
            <div className="ae-work-list">
              {visible.map(row)}
              {!visible.length && !(view === 'My work' && focused.length) && (
                <div className="ae-work-empty">
                  <span>
                    {query
                      ? 'No matches'
                      : view === 'My work'
                        ? 'No work started'
                        : `Nothing ${view === 'Done' ? 'done yet' : view === 'Waiting' ? 'waiting' : view === 'Review' ? 'to review' : 'available'}`}
                  </span>
                  {view === 'My work' && !query && (
                    <button type="button" onClick={() => setView('Available')}>
                      Browse available
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
