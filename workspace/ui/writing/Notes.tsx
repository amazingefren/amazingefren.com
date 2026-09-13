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

type NoteFilter = 'all' | 'pinned' | 'archived';
type Draft = Pick<
  StudioDocument,
  'title' | 'body' | 'tags' | 'collection' | 'pinned'
>;
type ExecuteCommand = Parameters<StudioProps['execute']>[0];

type NoteCardProps = {
  item: StudioDocument;
  draft: Draft;
  expanded: boolean;
  busy: boolean;
  hasDraft: boolean;
  onToggle(): void;
  onChange(patch: Partial<Draft>): void;
  onSave(): Promise<void>;
  onPin(): void;
  onArchive(): void;
  onCreatePublication(): void;
  onRestore(revision: number): void;
};

function NoteCard({
  item,
  draft,
  expanded,
  busy,
  hasDraft,
  onToggle,
  onChange,
  onSave,
  onPin,
  onArchive,
  onCreatePublication,
  onRestore,
}: NoteCardProps) {
  return (
    <article className="notes-card">
      <button className="notes-open" onClick={onToggle}>
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
            onChange={(event) =>
              onChange({
                body: event.target.value,
                title: titleFor(event.target.value),
              })
            }
          />
          <div className="notes-actions">
            <button
              className="ws-primary"
              disabled={busy}
              onClick={() => void onSave()}
            >
              Save
            </button>
            <button onClick={onPin}>{draft.pinned ? 'Unpin' : 'Pin'}</button>
            <button disabled={busy} onClick={onArchive}>
              {item.archived ? 'Reopen' : 'Archive'}
            </button>
            <button disabled={busy || hasDraft} onClick={onCreatePublication}>
              Create publication
            </button>
          </div>
          <details>
            <summary>Tags and history</summary>
            <label>
              Tags
              <input
                value={draft.tags.join(', ')}
                onChange={(event) =>
                  onChange({
                    tags: event.target.value
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
                    disabled={busy || hasDraft}
                    onClick={() => onRestore(revision.number)}
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
}

export function NotesView(props: StudioProps) {
  const [state, setState] = useState(props.state);
  const [capture, setCapture] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<NoteFilter>('all');
  const [open, setOpen] = useState('');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [message, setMessage] = useState('');
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
      window.removeEventListener('writing:before-navigate', block);
      props.onDirtyChange?.(false);
    };
  }, [dirty, props.onDirtyChange]);

  async function run(command: ExecuteCommand): Promise<StudioState | null> {
    const result = await props.execute(command);
    if (result.ok) {
      setState(result.value);
      return result.value;
    }
    setMessage(result.error.message);
    return null;
  }

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

  function draftFor(item: StudioDocument): Draft {
    return (
      drafts[item.id] ?? {
        title: item.title,
        body: item.body,
        tags: item.tags,
        collection: item.collection,
        pinned: item.pinned,
      }
    );
  }

  function change(item: StudioDocument, patch: Partial<Draft>) {
    setDrafts((all) => ({
      ...all,
      [item.id]: { ...draftFor(item), ...patch },
    }));
  }

  async function captureNote(event: FormEvent<HTMLFormElement>) {
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
  }

  async function saveNote(item: StudioDocument, draft: Draft) {
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
  }

  function archiveNote(item: StudioDocument) {
    void run({
      operation: 'studio.notes.archive',
      input: {
        id: item.id,
        archived: !item.archived,
      },
    });
  }

  async function createPublication(item: StudioDocument) {
    const next = await run({
      operation: 'publishing.projects.create',
      input: {
        kind: 'article',
        title: item.title,
        sourceId: item.id,
      },
    });
    const created = next?.publications.at(-1);
    if (created) props.navigate('publishing', created.id);
  }

  function restoreNote(item: StudioDocument, revision: number) {
    void run({
      operation: 'studio.notes.restore',
      input: {
        id: item.id,
        expectedRevision: item.revision,
        revision,
      },
    });
  }

  return (
    <section className="notes-view">
      <form className="notes-capture" onSubmit={captureNote}>
        <label>
          Quick capture
          <textarea
            rows={3}
            placeholder="What did you notice?"
            value={capture}
            onChange={(event) => setCapture(event.target.value)}
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
          onChange={(event) => setQuery(event.target.value)}
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
        {records.map((item) => (
          <NoteCard
            key={item.id}
            item={item}
            draft={draftFor(item)}
            expanded={open === item.id}
            busy={props.busy}
            hasDraft={Boolean(drafts[item.id])}
            onToggle={() => setOpen(open === item.id ? '' : item.id)}
            onChange={(patch) => change(item, patch)}
            onSave={() => saveNote(item, draftFor(item))}
            onPin={() => change(item, { pinned: !draftFor(item).pinned })}
            onArchive={() => archiveNote(item)}
            onCreatePublication={() => void createPublication(item)}
            onRestore={(revision) => restoreNote(item, revision)}
          />
        ))}
      </div>
    </section>
  );
}
