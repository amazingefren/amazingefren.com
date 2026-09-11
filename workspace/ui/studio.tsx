import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type {
  WorkspaceDocument,
  WorkspaceExperiment,
  WorkspacePageProps,
  WorkspaceRelationship,
  WorkspaceState,
  WorkspaceTask,
} from '../contracts/index.ts';

type Message = { kind: 'error' | 'success'; text: string } | null;
type StudioPageProps = WorkspacePageProps & {
  onDirtyChange?: (dirty: boolean) => void;
};

const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString();
};

function Feedback({ message }: { message: Message }) {
  if (!message) return null;
  return (
    <p
      className={`ws-studio-feedback ${message.kind === 'error' ? 'is-error' : 'is-success'}`}
      role={message.kind === 'error' ? 'alert' : 'status'}
    >
      {message.text}
    </p>
  );
}

function PageHeader({
  title,
  count,
  action,
  headingId,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  headingId: string;
}) {
  return (
    <header className="ws-studio-page-header">
      <div>
        <h1 id={headingId}>{title}</h1>
      </div>
      <div className="ws-studio-page-header-side">
        {typeof count === 'number' ? (
          <span className="ws-studio-count">{count}</span>
        ) : null}
        {action}
      </div>
    </header>
  );
}

function useWorkspaceView(state: WorkspaceState) {
  const [view, setView] = useState(state);
  useEffect(() => setView(state), [state]);
  return [view, setView] as const;
}

function DocumentList({
  documents,
  selectedId,
  search,
  onSearch,
  onSelect,
}: {
  documents: WorkspaceDocument[];
  selectedId: string;
  search: string;
  onSearch(value: string): void;
  onSelect(document: WorkspaceDocument): void;
}) {
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return documents;
    return documents.filter((document) =>
      `${document.title} ${document.body}`.toLowerCase().includes(query),
    );
  }, [documents, search]);

  return (
    <aside
      className="ws-studio-panel ws-studio-document-list"
      aria-label="Documents"
    >
      <label className="ws-studio-field ws-studio-search">
        <span className="ws-sr-only">Search documents</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search documents"
        />
      </label>
      {documents.length === 0 ? (
        <p className="ws-studio-empty">No documents yet.</p>
      ) : filtered.length === 0 ? (
        <p className="ws-studio-empty">No documents match “{search}”.</p>
      ) : (
        <ul className="ws-studio-record-list">
          {filtered.map((document) => (
            <li key={document.id}>
              <button
                type="button"
                className={`ws-studio-record ${document.id === selectedId ? 'is-selected' : ''}`}
                aria-current={document.id === selectedId ? 'true' : undefined}
                onClick={() => onSelect(document)}
              >
                <strong>{document.title || 'Untitled document'}</strong>
                <span>
                  {dateLabel(document.updatedAt)} · revision {document.revision}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

export function DocumentsPage({
  state,
  execute,
  busy,
  navigate,
  recordId,
  onDirtyChange,
}: StudioPageProps) {
  const [view, setView] = useWorkspaceView(state);
  const [selectedId, setSelectedId] = useState(
    recordId ?? state.documents[0]?.id ?? '',
  );
  const [draftDocumentId, setDraftDocumentId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [search, setSearch] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [createBody, setCreateBody] = useState('');
  const [message, setMessage] = useState<Message>(null);
  const [blockedRecordId, setBlockedRecordId] = useState('');
  const dirtyCallback = useRef(onDirtyChange);

  const selected =
    view.documents.find((document) => document.id === selectedId) ??
    view.documents[0];
  const hasUnsavedEdits = Boolean(
    selected &&
    draftDocumentId === selected.id &&
    (title !== selected.title || body !== selected.body),
  );
  const hasNewDocumentDraft = createTitle.length > 0 || createBody.length > 0;
  const isDirty = hasUnsavedEdits || hasNewDocumentDraft;
  const confirmDiscard = () =>
    !hasUnsavedEdits ||
    typeof window === 'undefined' ||
    window.confirm('Discard unsaved document edits?');

  useEffect(() => {
    dirtyCallback.current = onDirtyChange;
  }, [onDirtyChange]);

  useEffect(() => {
    dirtyCallback.current?.(isDirty);
    return () => dirtyCallback.current?.(false);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', preventUnload);
    return () => window.removeEventListener('beforeunload', preventUnload);
  }, [isDirty]);

  useEffect(() => {
    const requested = recordId
      ? view.documents.find((document) => document.id === recordId)
      : undefined;
    const next =
      requested?.id ??
      view.documents.find((document) => document.id === selectedId)?.id ??
      view.documents[0]?.id ??
      '';
    if (blockedRecordId && blockedRecordId !== recordId) setBlockedRecordId('');
    if (next === selectedId || blockedRecordId === next) return;
    if (!confirmDiscard()) {
      setBlockedRecordId(next);
      return;
    }
    setBlockedRecordId('');
    setSelectedId(next);
  }, [blockedRecordId, hasUnsavedEdits, recordId, selectedId, view.documents]);

  useEffect(() => {
    if (selected && selected.id !== draftDocumentId) {
      setDraftDocumentId(selected.id);
      setTitle(selected.title);
      setBody(selected.body);
    }
  }, [draftDocumentId, selected]);

  const selectDocument = (document: WorkspaceDocument) => {
    if (document.id !== selected?.id && !confirmDiscard()) return;
    setBlockedRecordId('');
    setSelectedId(document.id);
    setDraftDocumentId(document.id);
    setTitle(document.title);
    setBody(document.body);
    setMessage(null);
    navigate('documents', document.id);
  };

  const createDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createTitle.trim()) {
      setMessage({ kind: 'error', text: 'A document title is required.' });
      return;
    }
    const selectCreated = confirmDiscard();
    const result = await execute({
      operation: 'workspace.create-document',
      input: { title: createTitle.trim(), body: createBody },
    });
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error.message });
      return;
    }
    setView(result.value);
    const created =
      result.value.documents.find(
        (document) =>
          !view.documents.some((previous) => previous.id === document.id),
      ) ?? result.value.documents[result.value.documents.length - 1];
    if (created && selectCreated) {
      setBlockedRecordId('');
      setSelectedId(created.id);
      setDraftDocumentId(created.id);
      setTitle(created.title);
      setBody(created.body);
      navigate('documents', created.id);
    }
    setCreateTitle('');
    setCreateBody('');
    setMessage({
      kind: 'success',
      text: selectCreated
        ? 'Document created.'
        : 'Document created; current draft kept.',
    });
  };

  const saveDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    if (!title.trim()) {
      setMessage({ kind: 'error', text: 'A document title is required.' });
      return;
    }
    const result = await execute({
      operation: 'workspace.save-document',
      input: {
        id: selected.id,
        title: title.trim(),
        body,
        revision: selected.revision,
      },
    });
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error.message });
      return;
    }
    setView(result.value);
    setMessage({
      kind: 'success',
      text: `Saved revision ${result.value.documents.find((document) => document.id === selected.id)?.revision ?? selected.revision}.`,
    });
  };

  const restoreRevision = async (sourceRevision: number) => {
    if (!selected) return;
    if (!confirmDiscard()) return;
    const result = await execute({
      operation: 'workspace.restore-document',
      input: { id: selected.id, sourceRevision, revision: selected.revision },
    });
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error.message });
      return;
    }
    const restored = result.value.documents.find(
      (document) => document.id === selected.id,
    );
    setView(result.value);
    if (restored) {
      setTitle(restored.title);
      setBody(restored.body);
      setDraftDocumentId(restored.id);
    }
    setMessage({
      kind: 'success',
      text: `Restored revision ${sourceRevision} as the current working revision.`,
    });
  };

  return (
    <section
      className="ws-studio ws-studio-page"
      aria-labelledby="documents-heading"
    >
      <PageHeader
        title="Documents"
        headingId="documents-heading"
        count={view.documents.length}
      />
      <Feedback message={message} />
      <div className="ws-studio-documents-layout">
        <div>
          <DocumentList
            documents={view.documents}
            selectedId={selected?.id ?? ''}
            search={search}
            onSearch={setSearch}
            onSelect={selectDocument}
          />
          <details className="ws-studio-disclosure">
            <summary>New document</summary>
            <form
              className="ws-studio-panel ws-studio-create-form"
              onSubmit={createDocument}
            >
              <label className="ws-studio-field">
                <span>Title</span>
                <input
                  required
                  value={createTitle}
                  onChange={(event) => setCreateTitle(event.target.value)}
                />
              </label>
              <label className="ws-studio-field">
                <span>Markdown</span>
                <textarea
                  value={createBody}
                  onChange={(event) => setCreateBody(event.target.value)}
                  rows={4}
                />
              </label>
              <button
                type="submit"
                className="ws-studio-button is-primary"
                disabled={busy}
              >
                {busy ? 'Creating…' : 'Create document'}
              </button>
            </form>
          </details>
        </div>
        <div className="ws-studio-document-workspace">
          {selected ? (
            <>
              <form
                className="ws-studio-panel ws-studio-editor"
                onSubmit={saveDocument}
              >
                <div className="ws-studio-panel-heading">
                  <h2>{selected.title}</h2>
                  <span className="ws-studio-metadata">
                    Revision {selected.revision}
                  </span>
                </div>
                <label className="ws-studio-field">
                  <span>Title</span>
                  <input
                    required
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>
                <label className="ws-studio-field">
                  <span>Markdown</span>
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={16}
                  />
                </label>
                <div className="ws-studio-form-actions">
                  <button
                    type="submit"
                    className="ws-studio-button is-primary"
                    disabled={busy}
                  >
                    {busy ? 'Saving…' : 'Save revision'}
                  </button>
                </div>
              </form>
              <details className="ws-studio-panel ws-studio-history">
                <summary>
                  Revision history{' '}
                  <span className="ws-studio-metadata">
                    {selected.revisions.length}
                  </span>
                </summary>
                {selected.revisions.length === 0 ? (
                  <p className="ws-studio-empty">No saved revisions.</p>
                ) : (
                  <ol className="ws-studio-history-list">
                    {[...selected.revisions]
                      .sort((a, b) => b.revision - a.revision)
                      .map((revision) => (
                        <li key={revision.revision}>
                          <div>
                            <strong>Revision {revision.revision}</strong>
                            <span>
                              {dateLabel(revision.savedAt)} ·{' '}
                              {revision.title || 'Untitled document'}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="ws-studio-button is-secondary"
                            disabled={
                              busy || revision.revision === selected.revision
                            }
                            onClick={() => restoreRevision(revision.revision)}
                          >
                            {revision.revision === selected.revision
                              ? 'Current'
                              : 'Restore'}
                          </button>
                        </li>
                      ))}
                  </ol>
                )}
              </details>
            </>
          ) : (
            <div className="ws-studio-panel ws-studio-empty-state">
              <h2>No document selected</h2>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function TasksPage({
  state,
  execute,
  busy,
  navigate,
}: WorkspacePageProps) {
  const [view, setView] = useWorkspaceView(state);
  const [title, setTitle] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [message, setMessage] = useState<Message>(null);

  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      setMessage({ kind: 'error', text: 'A task title is required.' });
      return;
    }
    const result = await execute({
      operation: 'workspace.create-task',
      input: { title: title.trim(), documentId: documentId || undefined },
    });
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error.message });
      return;
    }
    setView(result.value);
    setTitle('');
    setDocumentId('');
    setMessage({ kind: 'success', text: 'Task created.' });
  };

  const toggleTask = async (task: WorkspaceTask) => {
    const result = await execute({
      operation: 'workspace.complete-task',
      input: { id: task.id, done: !task.done },
    });
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error.message });
      return;
    }
    setView(result.value);
    setMessage({
      kind: 'success',
      text: task.done ? 'Task reopened.' : 'Task completed.',
    });
  };

  const documentTitle = (id: string | null) =>
    view.documents.find((document) => document.id === id)?.title ??
    'Document unavailable';

  return (
    <section
      className="ws-studio ws-studio-page"
      aria-labelledby="tasks-heading"
    >
      <PageHeader
        title="Tasks"
        headingId="tasks-heading"
        count={view.tasks.length}
      />
      <Feedback message={message} />
      <div className="ws-studio-two-column">
        <form
          className="ws-studio-panel ws-studio-create-form"
          onSubmit={createTask}
        >
          <div className="ws-studio-panel-heading">
            <h2>New task</h2>
          </div>
          <label className="ws-studio-field">
            <span>Task</span>
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs doing?"
            />
          </label>
          <label className="ws-studio-field">
            <span>
              Document <span className="ws-studio-optional">optional</span>
            </span>
            <select
              value={documentId}
              onChange={(event) => setDocumentId(event.target.value)}
              disabled={view.documents.length === 0}
            >
              <option value="">No document</option>
              {view.documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title || 'Untitled document'}
                </option>
              ))}
            </select>
          </label>
          {view.documents.length === 0 ? (
            <p className="ws-studio-help">
              Add a document before linking it to a task.
            </p>
          ) : null}
          <button
            type="submit"
            className="ws-studio-button is-primary"
            disabled={busy}
          >
            {busy ? 'Creating…' : 'Create task'}
          </button>
        </form>
        <section
          className="ws-studio-panel"
          aria-labelledby="task-list-heading"
        >
          <div className="ws-studio-panel-heading">
            <h2 id="task-list-heading">Tasks</h2>
            <span className="ws-studio-metadata">
              {view.tasks.filter((task) => !task.done).length} open
            </span>
          </div>
          {view.tasks.length === 0 ? (
            <p className="ws-studio-empty">No tasks yet.</p>
          ) : (
            <ul className="ws-studio-task-list">
              {view.tasks.map((task) => (
                <li key={task.id} className={task.done ? 'is-done' : ''}>
                  <button
                    type="button"
                    className="ws-studio-check"
                    aria-label={
                      task.done
                        ? `Reopen ${task.title}`
                        : `Complete ${task.title}`
                    }
                    aria-pressed={task.done}
                    disabled={busy}
                    onClick={() => toggleTask(task)}
                  >
                    {task.done ? '✓' : '○'}
                  </button>
                  <div>
                    <strong>{task.title}</strong>
                    <span>
                      {task.documentId ? (
                        <button
                          type="button"
                          className="ws-studio-inline-link"
                          onClick={() =>
                            navigate('documents', task.documentId ?? undefined)
                          }
                        >
                          {documentTitle(task.documentId)}
                        </button>
                      ) : null}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}

const experimentStatusLabel: Record<WorkspaceExperiment['status'], string> = {
  planned: 'Planned',
  running: 'Running',
  complete: 'Complete',
};

export function ExperimentsPage({ state, execute, busy }: WorkspacePageProps) {
  const [view, setView] = useWorkspaceView(state);
  const [title, setTitle] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [edits, setEdits] = useState<
    Record<
      string,
      { status: WorkspaceExperiment['status']; observations: string }
    >
  >({});
  const [message, setMessage] = useState<Message>(null);

  const createExperiment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !hypothesis.trim()) {
      setMessage({
        kind: 'error',
        text: 'A title and hypothesis are required.',
      });
      return;
    }
    const result = await execute({
      operation: 'workspace.create-experiment',
      input: { title: title.trim(), hypothesis: hypothesis.trim() },
    });
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error.message });
      return;
    }
    setView(result.value);
    setTitle('');
    setHypothesis('');
    setMessage({ kind: 'success', text: 'Experiment created.' });
  };

  const editFor = (experiment: WorkspaceExperiment) =>
    edits[experiment.id] ?? {
      status: experiment.status,
      observations: experiment.observations,
    };
  const setEdit = (
    experiment: WorkspaceExperiment,
    patch: Partial<{
      status: WorkspaceExperiment['status'];
      observations: string;
    }>,
  ) =>
    setEdits((current) => ({
      ...current,
      [experiment.id]: { ...editFor(experiment), ...patch },
    }));

  const updateExperiment = async (experiment: WorkspaceExperiment) => {
    const edit = editFor(experiment);
    const result = await execute({
      operation: 'workspace.update-experiment',
      input: {
        id: experiment.id,
        status: edit.status,
        observations: edit.observations,
      },
    });
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error.message });
      return;
    }
    setView(result.value);
    setEdits((current) => ({ ...current, [experiment.id]: edit }));
    setMessage({ kind: 'success', text: 'Experiment updated.' });
  };

  return (
    <section
      className="ws-studio ws-studio-page"
      aria-labelledby="experiments-heading"
    >
      <PageHeader
        title="Experiments"
        headingId="experiments-heading"
        count={view.experiments.length}
      />
      <Feedback message={message} />
      <details className="ws-studio-disclosure">
        <summary>New experiment</summary>
        <form
          className="ws-studio-panel ws-studio-create-form ws-studio-experiment-create"
          onSubmit={createExperiment}
        >
          <div className="ws-studio-form-grid">
            <label className="ws-studio-field">
              <span>Title</span>
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label className="ws-studio-field">
              <span>Hypothesis</span>
              <textarea
                required
                value={hypothesis}
                onChange={(event) => setHypothesis(event.target.value)}
                rows={3}
              />
            </label>
          </div>
          <button
            type="submit"
            className="ws-studio-button is-primary"
            disabled={busy}
          >
            {busy ? 'Creating…' : 'Create experiment'}
          </button>
        </form>
      </details>
      {view.experiments.length === 0 ? (
        <div className="ws-studio-panel ws-studio-empty-state">
          <h2>No experiments yet</h2>
        </div>
      ) : (
        <div className="ws-studio-experiment-list">
          {view.experiments.map((experiment) => {
            const edit = editFor(experiment);
            return (
              <article
                key={experiment.id}
                className="ws-studio-panel ws-studio-experiment-card"
              >
                <div className="ws-studio-panel-heading">
                  <div>
                    <h2>{experiment.title}</h2>
                  </div>
                  <span className={`ws-studio-status is-${edit.status}`}>
                    {experimentStatusLabel[edit.status]}
                  </span>
                </div>
                <div className="ws-studio-hypothesis">
                  <span className="ws-studio-label">Hypothesis</span>
                  <p>{experiment.hypothesis}</p>
                </div>
                <label className="ws-studio-field">
                  <span>Status</span>
                  <select
                    value={edit.status}
                    onChange={(event) =>
                      setEdit(experiment, {
                        status: event.target
                          .value as WorkspaceExperiment['status'],
                      })
                    }
                  >
                    <option value="planned">Planned</option>
                    <option value="running">Running</option>
                    <option value="complete">Complete</option>
                  </select>
                </label>
                <label className="ws-studio-field">
                  <span>Observations</span>
                  <textarea
                    value={edit.observations}
                    onChange={(event) =>
                      setEdit(experiment, { observations: event.target.value })
                    }
                    rows={3}
                  />
                </label>
                <button
                  type="button"
                  className="ws-studio-button is-secondary"
                  disabled={busy}
                  onClick={() => updateExperiment(experiment)}
                >
                  {busy ? 'Updating…' : 'Save observations'}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function RelationshipsPage({
  state,
  execute,
  busy,
}: WorkspacePageProps) {
  const [view, setView] = useWorkspaceView(state);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [label, setLabel] = useState('');
  const [message, setMessage] = useState<Message>(null);
  const documentById = (id: string) =>
    view.documents.find((document) => document.id === id);

  const linkDocuments = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!from || !to || !label.trim()) {
      setMessage({
        kind: 'error',
        text: 'Choose two documents and add a relationship label.',
      });
      return;
    }
    if (from === to) {
      setMessage({
        kind: 'error',
        text: 'A relationship needs two different documents.',
      });
      return;
    }
    if (!documentById(from) || !documentById(to)) {
      setMessage({
        kind: 'error',
        text: 'Both documents must still exist before linking them.',
      });
      return;
    }
    const result = await execute({
      operation: 'workspace.link-documents',
      input: { from, to, label: label.trim() },
    });
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error.message });
      return;
    }
    setView(result.value);
    setFrom('');
    setTo('');
    setLabel('');
    setMessage({ kind: 'success', text: 'Documents linked.' });
  };

  const unlinkDocuments = async (relationship: WorkspaceRelationship) => {
    const result = await execute({
      operation: 'workspace.unlink-documents',
      input: { id: relationship.id },
    });
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error.message });
      return;
    }
    setView(result.value);
    setMessage({ kind: 'success', text: 'Relationship removed.' });
  };

  return (
    <section
      className="ws-studio ws-studio-page"
      aria-labelledby="relationships-heading"
    >
      <PageHeader
        title="Relationships"
        headingId="relationships-heading"
        count={view.relationships.length}
      />
      <Feedback message={message} />
      <div className="ws-studio-two-column">
        <form
          className="ws-studio-panel ws-studio-create-form"
          onSubmit={linkDocuments}
        >
          <div className="ws-studio-panel-heading">
            <h2>Link documents</h2>
          </div>
          {view.documents.length < 2 ? (
            <p className="ws-studio-help">Two documents are required.</p>
          ) : null}
          <label className="ws-studio-field">
            <span>From</span>
            <select
              required
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              disabled={view.documents.length < 2}
            >
              <option value="">Choose document</option>
              {view.documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title || 'Untitled document'}
                </option>
              ))}
            </select>
          </label>
          <label className="ws-studio-field">
            <span>To</span>
            <select
              required
              value={to}
              onChange={(event) => setTo(event.target.value)}
              disabled={view.documents.length < 2}
            >
              <option value="">Choose document</option>
              {view.documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title || 'Untitled document'}
                </option>
              ))}
            </select>
          </label>
          <label className="ws-studio-field">
            <span>Label</span>
            <input
              required
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="supports, follows, contrasts…"
              disabled={view.documents.length < 2}
            />
          </label>
          <button
            type="submit"
            className="ws-studio-button is-primary"
            disabled={busy || view.documents.length < 2}
          >
            {busy ? 'Linking…' : 'Link documents'}
          </button>
        </form>
        <section
          className="ws-studio-panel"
          aria-labelledby="relationship-list-heading"
        >
          <div className="ws-studio-panel-heading">
            <h2 id="relationship-list-heading">Linked documents</h2>
          </div>
          {view.relationships.length === 0 ? (
            <p className="ws-studio-empty">No relationships yet.</p>
          ) : (
            <ul className="ws-studio-relationship-list">
              {view.relationships.map((relationship) => {
                const source = documentById(relationship.from);
                const target = documentById(relationship.to);
                return (
                  <li key={relationship.id}>
                    <div className="ws-studio-relationship-copy">
                      <strong>
                        {source?.title ?? 'Document unavailable'}{' '}
                        <span aria-hidden="true">→</span>{' '}
                        {target?.title ?? 'Document unavailable'}
                      </strong>
                      <span>{relationship.label}</span>
                      {!source || !target ? (
                        <em>
                          One document is unavailable; the relationship is
                          retained.
                        </em>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="ws-studio-button is-secondary"
                      disabled={busy}
                      onClick={() => unlinkDocuments(relationship)}
                    >
                      Unlink
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
