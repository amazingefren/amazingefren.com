import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  WorkspaceExperiment,
  WorkspacePageProps,
  WorkspaceRelationship,
  WorkspaceState,
  WorkspaceTask,
} from '../contracts/index.ts';

type Message = { kind: 'error' | 'success'; text: string } | null;

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
  headingId,
}: {
  title: string;
  count?: number;
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
      </div>
    </header>
  );
}

function useWorkspaceView(state: WorkspaceState) {
  const [view, setView] = useState(state);
  useEffect(() => setView(state), [state]);
  return [view, setView] as const;
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
          className="ws-studio-panel ws-studio-create-form"
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
