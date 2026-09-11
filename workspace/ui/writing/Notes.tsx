import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type {
  StudioDocument,
  StudioProps,
  StudioState,
} from '../../../contracts/writing/index.ts';
const titleFor = (body: string) =>
  body
    .split('\n')
    .find((line) => line.trim())
    ?.trim()
    .slice(0, 80) || 'Untitled note';
const stamp = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
type Draft = Pick<
  StudioDocument,
  'title' | 'body' | 'tags' | 'collection' | 'pinned'
>;
export function NotesView(props: StudioProps) {
  const [state, setState] = useState(props.state),
    [capture, setCapture] = useState(''),
    [query, setQuery] = useState(''),
    [filter, setFilter] = useState<'all' | 'pinned' | 'archived'>('all'),
    [open, setOpen] = useState(''),
    [drafts, setDrafts] = useState<Record<string, Draft>>({}),
    [message, setMessage] = useState('');
  const dirty = Boolean(capture.trim()) || Object.keys(drafts).length > 0;
  useEffect(() => setState(props.state), [props.state]);
  useEffect(() => {
    props.onDirtyChange?.(dirty);
    const block = (event: Event) => {
      if (dirty) {
        event.preventDefault();
        setMessage('Save or discard edits before leaving Notes.');
      }
    };
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', unload);
    window.addEventListener('writing:before-navigate', block);
    return () => {
      window.removeEventListener('beforeunload', unload);
      {
        window.removeEventListener('writing:before-navigate', block);
        props.onDirtyChange?.(false);
      }
    };
  }, [dirty, props.onDirtyChange]);
  const run = async (
    command: Parameters<StudioProps['execute']>[0],
  ): Promise<StudioState | null> => {
    const result = await props.execute(command);
    if (result.ok) {
      setState(result.value);
      return result.value;
    }
    setMessage(result.error.message);
    return null;
  };
  const records = useMemo(
    () =>
      state.documents
        .filter(
          (item) =>
            item.kind !== 'manuscript' &&
            (filter === 'all'
              ? !item.archived
              : filter === 'pinned'
                ? !item.archived && item.pinned
                : item.archived) &&
            `${item.title} ${item.body} ${item.tags.join(' ')}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [state, filter, query],
  );
  const draftFor = (item: StudioDocument): Draft =>
    drafts[item.id] ?? {
      title: item.title,
      body: item.body,
      tags: item.tags,
      collection: item.collection,
      pinned: item.pinned,
    };
  const change = (item: StudioDocument, patch: Partial<Draft>) =>
    setDrafts((all) => ({
      ...all,
      [item.id]: { ...draftFor(item), ...patch },
    }));
  const captureNote = async (event: FormEvent) => {
    event.preventDefault();
    const body = capture.trim();
    if (
      body &&
      (await run({
        operation: 'studio.notes.create',
        input: {
          kind: 'note',
          title: titleFor(body),
          body,
          collection: 'Inbox',
        },
      }))
    )
      setCapture('');
  };
  return (
    <section className="notes-view">
      <form className="notes-capture" onSubmit={captureNote}>
        <label>
          Quick capture
          <textarea
            rows={3}
            placeholder="What did you notice?"
            value={capture}
            onChange={(e) => setCapture(e.target.value)}
          />
        </label>
        <button className="ws-primary" disabled={props.busy || !capture.trim()}>
          Add note
        </button>
      </form>
      {message && (
        <p className="notes-message" role="alert">
          {message}
        </p>
      )}
      {dirty && (
        <div className="notes-unsaved">
          <span>Unsaved edits</span>
          <button
            onClick={() => {
              setDrafts({});
              setCapture('');
            }}
          >
            Discard edits
          </button>
        </div>
      )}
      <div className="notes-controls">
        <input
          aria-label="Search notes"
          placeholder="Search notes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div>
          {(['all', 'pinned', 'archived'] as const).map((value) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="notes-list">
        {records.map((item) => {
          const draft = draftFor(item),
            expanded = open === item.id;
          return (
            <article className="notes-card" key={item.id}>
              <button
                className="notes-open"
                onClick={() => setOpen(expanded ? '' : item.id)}
              >
                <span>
                  {item.kind}
                  {item.pinned ? ' / pinned' : ''}
                </span>
                <strong>{item.title || 'Untitled'}</strong>
                <small>{stamp(item.updatedAt)}</small>
              </button>
              {expanded && (
                <div className="notes-edit">
                  <textarea
                    aria-label="Note body"
                    value={draft.body}
                    onChange={(e) =>
                      change(item, {
                        body: e.target.value,
                        title: titleFor(e.target.value),
                      })
                    }
                  />
                  <div className="notes-actions">
                    <button
                      className="ws-primary"
                      disabled={props.busy}
                      onClick={async () => {
                        if (
                          await run({
                            operation: 'studio.notes.save',
                            input: {
                              id: item.id,
                              expectedRevision: item.revision,
                              ...draft,
                            },
                          })
                        )
                          setDrafts((all) => {
                            const next = { ...all };
                            delete next[item.id];
                            return next;
                          });
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => change(item, { pinned: !draft.pinned })}
                    >
                      {draft.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      disabled={props.busy}
                      onClick={() =>
                        void run({
                          operation: 'studio.notes.archive',
                          input: { id: item.id, archived: !item.archived },
                        })
                      }
                    >
                      {item.archived ? 'Reopen' : 'Archive'}
                    </button>
                  </div>
                  <details>
                    <summary>Tags and history</summary>
                    <label>
                      Tags
                      <input
                        value={draft.tags.join(', ')}
                        onChange={(e) =>
                          change(item, {
                            tags: e.target.value
                              .split(',')
                              .map((tag) => tag.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </label>
                    {item.revisions
                      .slice()
                      .reverse()
                      .map((revision) => (
                        <div className="notes-revision" key={revision.number}>
                          <span>
                            r{revision.number} / {stamp(revision.savedAt)}
                          </span>
                          <button
                            disabled={props.busy || Boolean(drafts[item.id])}
                            onClick={() =>
                              void run({
                                operation: 'studio.notes.restore',
                                input: {
                                  id: item.id,
                                  expectedRevision: item.revision,
                                  revision: revision.number,
                                },
                              })
                            }
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                  </details>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
