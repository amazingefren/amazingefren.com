import { useEffect, useRef, useState, type FormEvent } from 'react';
import type {
  Command,
  Fields,
  Item,
  Result,
  State,
} from '../../contracts/work/index.ts';
import { label, reason } from '../domain/index.ts';

const fieldNames = [
  'title',
  'system',
  'outcome',
  'next',
  'acceptance',
  'blocker',
  'dependencies',
  'agentAllowed',
  'evidence',
] as const;
const fieldsOf = (item: Item): Fields =>
  Object.fromEntries(fieldNames.map((name) => [name, item[name]])) as Fields;
type Action = Extract<Command, { revision: number }>['operation'];

export function WorkDetail({
  item,
  state,
  pending,
  conflict,
  run,
  close,
  open,
  onDirty,
}: {
  item: Item;
  state: State;
  pending: boolean;
  conflict: boolean;
  run(command: Command): Promise<Result>;
  close(): void;
  open(id: string): void;
  onDirty(dirty: boolean): void;
}) {
  const [base, setBase] = useState(item);
  const [draft, setDraft] = useState(() => fieldsOf(item));
  const [saved, setSaved] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(fieldsOf(base));
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  useEffect(() => {
    if (!dirty && item.revision !== base.revision) {
      setBase(item);
      setDraft(fieldsOf(item));
    }
  }, [item, dirty, base.revision]);
  const done = item.phase === 'done';
  const human =
    item.kind === 'publication' ||
    !state.spaces.find((space) => space.id === item.spaceId)?.agents;
  const blocker = reason(state, item);
  const actionReason = dirty ? 'Save changes first' : blocker;
  const focusFull =
    !item.focus &&
    state.items.filter(
      (candidate) => candidate.focus && candidate.phase !== 'done',
    ).length >= 3;
  async function action(operation: Action) {
    if (operation === 'work.edit') return;
    await run({ operation, id: item.id, revision: item.revision });
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await run({
      operation: 'work.edit',
      id: item.id,
      revision: base.revision,
      fields: draft,
    });
    if (!result.ok) return;
    const updated = result.state.items.find(
      (candidate) => candidate.id === item.id,
    );
    if (updated) {
      setBase(updated);
      setDraft(fieldsOf(updated));
      setSaved(true);
    }
  }
  async function reload() {
    const result = await run({ operation: 'work.read' });
    if (!result.ok) return;
    const updated = result.state.items.find(
      (candidate) => candidate.id === item.id,
    );
    if (updated) {
      setBase(updated);
      setDraft(fieldsOf(updated));
      setSaved(false);
    }
  }
  function update<K extends keyof Fields>(name: K, value: Fields[K]) {
    setDraft((previous) => ({ ...previous, [name]: value }));
    setSaved(false);
  }
  return (
    <article className="ae-work-detail">
      <div className="ae-work-detail-bar">
        <button type="button" onClick={close} disabled={pending}>
          ← Back
        </button>
        <span
          className="ae-work-state"
          data-phase={blocker ? 'waiting' : item.phase}
        >
          {label(state, item)}
        </span>
        <span>
          {state.spaces.find((space) => space.id === item.spaceId)?.title}
        </span>
        <span>
          {item.kind === 'publication'
            ? 'Human-only'
            : item.assignee === 'agent'
              ? 'Agent'
              : item.assignee === 'me'
                ? 'Me'
                : ''}
        </span>
      </div>
      <h2 ref={heading} tabIndex={-1} className="ae-focus-target">
        {item.title}
      </h2>
      <div className="ae-work-detail-grid">
        <form onSubmit={save}>
          <fieldset disabled={pending || done}>
            <label>
              Title
              <input
                required
                maxLength={160}
                value={draft.title}
                onChange={(event) => update('title', event.target.value)}
              />
            </label>
            <label>
              Outcome
              <textarea
                rows={2}
                maxLength={4000}
                value={draft.outcome}
                onChange={(event) => update('outcome', event.target.value)}
              />
            </label>
            <label>
              Next action
              <input
                maxLength={4000}
                value={draft.next}
                onChange={(event) => update('next', event.target.value)}
              />
            </label>
            <label>
              Done when
              <textarea
                rows={2}
                maxLength={4000}
                value={draft.acceptance}
                onChange={(event) => update('acceptance', event.target.value)}
              />
            </label>
            <label>
              Result
              <textarea
                rows={3}
                maxLength={4000}
                value={draft.evidence}
                onChange={(event) => update('evidence', event.target.value)}
              />
            </label>
            <details className="ae-work-options">
              <summary>Details</summary>
              <label>
                System
                <input
                  maxLength={160}
                  value={draft.system}
                  onChange={(event) => update('system', event.target.value)}
                />
              </label>
              <label>
                Blocked by
                <input
                  maxLength={4000}
                  value={draft.blocker}
                  onChange={(event) => update('blocker', event.target.value)}
                />
              </label>
              <details>
                <summary>
                  Dependencies <span>{draft.dependencies.length}</span>
                </summary>
                <div className="ae-work-dependencies">
                  {state.items
                    .filter((candidate) => candidate.id !== item.id)
                    .map((candidate) => (
                      <label className="ae-work-check" key={candidate.id}>
                        <input
                          type="checkbox"
                          checked={draft.dependencies.includes(candidate.id)}
                          onChange={(event) =>
                            update(
                              'dependencies',
                              event.target.checked
                                ? [...draft.dependencies, candidate.id]
                                : draft.dependencies.filter(
                                    (id) => id !== candidate.id,
                                  ),
                            )
                          }
                        />
                        {candidate.title}
                      </label>
                    ))}
                </div>
              </details>
              {!human && (
                <label className="ae-work-check">
                  <input
                    type="checkbox"
                    checked={draft.agentAllowed}
                    onChange={(event) =>
                      update('agentAllowed', event.target.checked)
                    }
                  />
                  Allow agent work
                </label>
              )}
            </details>
          </fieldset>
          {!done && (
            <div className="ae-work-actions ae-work-save">
              <button className="ae-work-primary" disabled={!dirty || pending}>
                {pending ? 'Saving…' : 'Save'}
              </button>
              {conflict ? (
                <button type="button" disabled={pending} onClick={reload}>
                  {dirty ? 'Discard and reload' : 'Reload'}
                </button>
              ) : (
                dirty && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setBase(item);
                      setDraft(fieldsOf(item));
                      setSaved(false);
                    }}
                  >
                    Discard
                  </button>
                )
              )}
              <span role="status">
                {dirty ? 'Unsaved' : saved ? 'Saved' : ''}
              </span>
            </div>
          )}
        </form>
        <aside className="ae-work-context">
          <div className="ae-work-action-stack">
            {blocker && <p className="ae-work-blocker">{blocker}</p>}
            {!done && (
              <button
                type="button"
                disabled={pending || dirty || focusFull}
                title={
                  dirty
                    ? 'Save changes first'
                    : focusFull
                      ? 'Three items already in focus'
                      : undefined
                }
                onClick={() => action('work.focus')}
              >
                {item.focus ? '− Remove focus' : '+ Focus'}
                {focusFull ? ' · 3/3' : ''}
              </button>
            )}
            {item.phase === 'open' && (
              <button
                type="button"
                className="ae-work-primary"
                disabled={pending || !!actionReason}
                title={actionReason || undefined}
                onClick={() => action('work.start')}
              >
                Start work
              </button>
            )}
            {item.phase === 'active' && (
              <button
                type="button"
                className="ae-work-primary"
                disabled={pending || !!actionReason || !item.evidence.trim()}
                title={
                  actionReason ||
                  (!item.evidence.trim() ? 'Add a result first' : undefined)
                }
                onClick={() => action('work.submit')}
              >
                Send to review
              </button>
            )}
            {item.phase === 'review' && (
              <button
                type="button"
                className="ae-work-primary"
                disabled={pending || !!actionReason || !item.evidence.trim()}
                title={
                  actionReason ||
                  (!item.evidence.trim() ? 'Add a result first' : undefined)
                }
                onClick={() => action('work.accept')}
              >
                Accept result
              </button>
            )}
            {(item.phase === 'active' || item.phase === 'review') && (
              <button
                type="button"
                disabled={pending || dirty}
                title={dirty ? 'Save changes first' : undefined}
                onClick={() => action('work.return')}
              >
                Return to available
              </button>
            )}
            {done && (
              <button
                type="button"
                disabled={pending}
                onClick={() => action('work.reopen')}
              >
                Reopen
              </button>
            )}
          </div>
          {!!item.dependencies.length && (
            <section>
              <h3>Depends on</h3>
              {item.dependencies.map((id) => {
                const linked = state.items.find(
                  (candidate) => candidate.id === id,
                );
                return linked ? (
                  <button
                    className="ae-work-related"
                    key={id}
                    type="button"
                    disabled={pending}
                    onClick={() => open(id)}
                  >
                    <span>{linked.title}</span>
                    <small>{label(state, linked)}</small>
                  </button>
                ) : (
                  <p key={id}>Unavailable item</p>
                );
              })}
            </section>
          )}
          {state.items.some((candidate) =>
            candidate.dependencies.includes(item.id),
          ) && (
            <section>
              <h3>Unblocks</h3>
              {state.items
                .filter((candidate) => candidate.dependencies.includes(item.id))
                .map((candidate) => (
                  <button
                    className="ae-work-related"
                    key={candidate.id}
                    type="button"
                    disabled={pending}
                    onClick={() => open(candidate.id)}
                  >
                    <span>{candidate.title}</span>
                    <small>{label(state, candidate)}</small>
                  </button>
                ))}
            </section>
          )}
          {!!item.history.length && (
            <details>
              <summary>Activity</summary>
              <ol>
                {item.history.map((entry, index) => (
                  <li key={index}>{entry}</li>
                ))}
              </ol>
            </details>
          )}
        </aside>
      </div>
    </article>
  );
}
