import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  CatalogEntry,
  WorkspaceCommand,
  WorkspacePageProps,
  WorkspaceResult,
  WorkspaceState,
} from '../contracts/index.ts';
import './systems.css';

type SystemsPageProps = WorkspacePageProps & { catalog: CatalogEntry[] };
type ConsoleOperation = Extract<
  WorkspaceCommand,
  { operation: 'workspace.read' | 'workspace.reset' }
>['operation'];

const consoleOperations: readonly ConsoleOperation[] = [
  'workspace.read',
  'workspace.reset',
];

function commandFor(operation: ConsoleOperation): WorkspaceCommand {
  return operation === 'workspace.reset'
    ? { operation: 'workspace.reset', input: {} }
    : { operation: 'workspace.read', input: {} };
}

function resultSummary(result: WorkspaceResult<WorkspaceState>) {
  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    state: {
      version: result.value.version,
      synthetic: result.value.synthetic,
      documents: result.value.documents.length,
      tasks: result.value.tasks.length,
      experiments: result.value.experiments.length,
      relationships: result.value.relationships.length,
      publications: result.value.publications.length,
    },
  };
}

function Status({
  children,
  tone = 'neutral',
}: {
  children: string;
  tone?: 'neutral' | 'ready' | 'attention' | 'progress';
}) {
  return <span className={`ws-status ws-status-${tone}`}>{children}</span>;
}

function ErrorNotice({ message }: { message: string | null }) {
  return message ? (
    <p className="ws-message ws-message-error" role="alert">
      {message}
    </p>
  ) : null;
}

function Empty({ children }: { children: string }) {
  return <p className="ws-empty">{children}</p>;
}

export function SystemsPage({ catalog, execute, audience }: SystemsPageProps) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(catalog[0]?.id ?? '');
  const [view, setView] = useState<'overview' | 'bindings' | 'console'>(
    'overview',
  );
  const [consoleOperation, setConsoleOperation] =
    useState<ConsoleOperation>('workspace.read');
  const [consoleOutput, setConsoleOutput] = useState('');
  const [consoleError, setConsoleError] = useState<string | null>(null);
  const [consoleBusy, setConsoleBusy] = useState(false);
  const [resetApproved, setResetApproved] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return catalog;
    return catalog.filter((entry) =>
      [entry.id, entry.name, entry.purpose, ...entry.capabilities]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [catalog, query]);
  const selected =
    visible.find((entry) => entry.id === selectedId) ?? visible[0];
  const usedBy = selected
    ? catalog.filter((entry) => entry.dependencies.includes(selected.id))
    : [];

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  function selectModule(id: string) {
    setQuery('');
    setSelectedId(id);
    setView('overview');
    requestAnimationFrame(() =>
      heading.current?.focus({ preventScroll: true }),
    );
  }

  async function runConsole() {
    if (
      consoleBusy ||
      (consoleOperation === 'workspace.reset' && !resetApproved)
    )
      return;
    setConsoleBusy(true);
    setConsoleError(null);
    setConsoleOutput('');
    try {
      const result = await execute(commandFor(consoleOperation));
      setConsoleOutput(JSON.stringify(resultSummary(result), null, 2));
      if (!result.ok) setConsoleError(result.error.message);
    } catch {
      setConsoleError('The command is unavailable.');
    } finally {
      setConsoleBusy(false);
      setResetApproved(false);
    }
  }

  return (
    <section className="ws-systems" aria-labelledby="systems-title">
      <header className="ws-page-heading">
        <h1 id="systems-title">Systems</h1>
        <div>
          <a href="/exports/systems/index.json">JSON</a> ·{' '}
          <a href="/exports/systems.zip">Offline bundle</a> ·{' '}
          <a href="/api/openapi.json">OpenAPI</a>
        </div>
      </header>
      <div className="ws-explorer">
        <aside className="ws-catalog" aria-label="System catalog">
          <label className="ws-search">
            <span className="ws-sr-only">Search systems</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search systems"
            />
          </label>
          <p className="ws-count">
            {visible.length} {visible.length === 1 ? 'system' : 'systems'}
          </p>
          <div className="ws-catalog-list">
            {visible.map((entry) => (
              <button
                type="button"
                key={entry.id}
                aria-pressed={entry.id === selected?.id}
                onClick={() => selectModule(entry.id)}
              >
                <strong>{entry.name}</strong>
              </button>
            ))}
          </div>
          <label className="ws-catalog-select">
            <span>System</span>
            <select
              value={selected?.id ?? ''}
              onChange={(event) => selectModule(event.target.value)}
            >
              {visible.length ? (
                visible.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))
              ) : (
                <option value="">No matches</option>
              )}
            </select>
          </label>
        </aside>
        {selected ? (
          <article className="ws-module">
            <header className="ws-module-header">
              <div>
                <h2 ref={heading} tabIndex={-1}>
                  {selected.name}
                </h2>
              </div>
              <Status>{selected.status}</Status>
            </header>
            <p className="ws-purpose">{selected.purpose}</p>
            <div
              className="ws-tabs"
              role="group"
              aria-label={`${selected.name} views`}
            >
              <button
                type="button"
                aria-pressed={view === 'overview'}
                onClick={() => setView('overview')}
              >
                Overview
              </button>
              <button
                type="button"
                aria-pressed={view === 'bindings'}
                onClick={() => setView('bindings')}
              >
                Bindings
              </button>
              <button
                type="button"
                aria-pressed={view === 'console'}
                onClick={() => setView('console')}
              >
                Console
              </button>
            </div>
            {view === 'overview' && (
              <>
                <section className="ws-section">
                  <h3>Capabilities</h3>
                  <div className="ws-tags">
                    {selected.capabilities.map((capability) => (
                      <span key={capability}>{capability}</span>
                    ))}
                  </div>
                  {!selected.capabilities.length && (
                    <Empty>No capabilities declared.</Empty>
                  )}
                </section>
                <div className="ws-relations">
                  <section>
                    <h3>Depends on</h3>
                    <JumpList
                      entries={selected.dependencies
                        .map((id) => catalog.find((entry) => entry.id === id))
                        .filter((entry): entry is CatalogEntry =>
                          Boolean(entry),
                        )}
                      onSelect={selectModule}
                      empty="No dependencies declared."
                    />
                  </section>
                  <section>
                    <h3>Used by</h3>
                    <JumpList
                      entries={usedBy}
                      onSelect={selectModule}
                      empty="No dependents declared."
                    />
                  </section>
                </div>
                <section className="ws-section">
                  <div className="ws-section-title">
                    <h3>Operations</h3>
                    <Status>{String(selected.operations.length)}</Status>
                  </div>
                  {selected.operations.length ? (
                    selected.operations.map((operation) => (
                      <div className="ws-operation" key={operation.id}>
                        <code>{operation.id}</code>
                        <Status>{operation.access}</Status>
                      </div>
                    ))
                  ) : (
                    <Empty>No operations declared.</Empty>
                  )}
                </section>
                <details className="ws-details">
                  <summary>Contracts · {selected.contracts.length}</summary>
                  {selected.contracts.length ? (
                    <div className="ws-contracts">
                      {selected.contracts.map((contract) => (
                        <code key={contract}>{contract}</code>
                      ))}
                    </div>
                  ) : (
                    <Empty>No contracts declared.</Empty>
                  )}
                </details>
              </>
            )}
            {view === 'bindings' && <Bindings entry={selected} />}
            {view === 'console' && (
              <section className="ws-section ws-console-card">
                <div className="ws-section-title">
                  <div>
                    <h3>Workspace console</h3>
                  </div>
                  <Status>
                    {audience === 'guest' ? 'Sample data' : 'Private'}
                  </Status>
                </div>
                <label>
                  <span>Command</span>
                  <select
                    value={consoleOperation}
                    disabled={consoleBusy}
                    onChange={(event) => {
                      setConsoleOperation(
                        event.target.value as ConsoleOperation,
                      );
                      setConsoleOutput('');
                      setConsoleError(null);
                      setResetApproved(false);
                    }}
                  >
                    {consoleOperations
                      .filter(
                        (operation) =>
                          audience === 'guest' ||
                          operation !== 'workspace.reset',
                      )
                      .map((operation) => (
                        <option key={operation} value={operation}>
                          {operation}
                        </option>
                      ))}
                  </select>
                </label>
                {consoleOperation === 'workspace.reset' && (
                  <label className="ws-check">
                    <input
                      type="checkbox"
                      checked={resetApproved}
                      disabled={consoleBusy}
                      onChange={(event) =>
                        setResetApproved(event.target.checked)
                      }
                    />
                    Reset the local synthetic workspace
                  </label>
                )}
                <button
                  className="ws-action"
                  type="button"
                  disabled={
                    consoleBusy ||
                    (consoleOperation === 'workspace.reset' && !resetApproved)
                  }
                  onClick={runConsole}
                >
                  {consoleBusy ? 'Running…' : 'Run command'}
                </button>
                <ErrorNotice message={consoleError} />
                <div className="ws-output">
                  <p className="ws-eyebrow">Result</p>
                  {consoleOutput ? (
                    <pre aria-live="polite">{consoleOutput}</pre>
                  ) : (
                    <Empty>No command run.</Empty>
                  )}
                </div>
              </section>
            )}
          </article>
        ) : (
          <section className="ws-module ws-no-results">
            <h2>No systems match.</h2>
            <button type="button" onClick={() => setQuery('')}>
              Clear search
            </button>
          </section>
        )}
      </div>
    </section>
  );
}

function JumpList({
  entries,
  onSelect,
  empty,
}: {
  entries: CatalogEntry[];
  onSelect(id: string): void;
  empty: string;
}) {
  return entries.length ? (
    <div className="ws-jumps">
      {entries.map((entry) => (
        <button type="button" key={entry.id} onClick={() => onSelect(entry.id)}>
          {entry.name}
          <span aria-hidden="true">↗</span>
        </button>
      ))}
    </div>
  ) : (
    <Empty>{empty}</Empty>
  );
}

function Bindings({ entry }: { entry: CatalogEntry }) {
  const [query, setQuery] = useState('');
  const bindings = entry.operations
    .flatMap((operation) =>
      operation.bindings.map((binding) => ({ ...binding, operation })),
    )
    .filter(({ kind, label, operation }) =>
      `${kind} ${label} ${operation.id}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  return (
    <section className="ws-section">
      <label className="ws-search">
        <span className="ws-sr-only">Search bindings</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search bindings"
        />
      </label>
      <div className="ws-section-title">
        <div>
          <h3>Declared bindings</h3>
        </div>
        <Status>{String(bindings.length)}</Status>
      </div>
      <div className="ws-binding-list">
        {bindings.map(({ kind, label, operation }, index) => (
          <div className="ws-binding" key={`${operation.id}-${label}-${index}`}>
            <span>{kind}</span>
            <div>
              <code>{label}</code>
              <small>
                {operation.id}
                {operation.permissions.length
                  ? ` · ${operation.permissions.join(', ')}`
                  : ''}
              </small>
            </div>
            <Status>{operation.access}</Status>
          </div>
        ))}
      </div>
      {!bindings.length && <Empty>No matching bindings declared.</Empty>}
    </section>
  );
}

export function PublishingPage({
  state,
  execute,
  busy,
  recordId,
}: WorkspacePageProps) {
  const firstDocument =
    state.documents.find((document) => document.id === recordId) ??
    state.documents[0];
  const [documentId, setDocumentId] = useState(firstDocument?.id ?? '');
  const [revision, setRevision] = useState<number>(
    firstDocument?.revision ?? 0,
  );
  const [approved, setApproved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const document =
    state.documents.find((item) => item.id === documentId) ??
    state.documents[0];
  const revisions = document ? uniqueRevisions(document) : [];
  const publication = document
    ? state.publications.find((item) => item.documentId === document.id)
    : undefined;

  useEffect(() => {
    if (document && document.id !== documentId) setDocumentId(document.id);
  }, [document, documentId]);
  useEffect(() => {
    if (document && !revisions.some((item) => item.revision === revision))
      setRevision(document.revision);
  }, [document, revision, revisions]);

  async function publish() {
    if (!document || busy || !approved) return;
    setError(null);
    setMessage(null);
    try {
      const result = await execute({
        operation: 'workspace.publish',
        input: { id: document.id, revision },
      });
      if (!result.ok) setError(result.error.message);
      else setMessage(`Revision ${revision} approved.`);
    } catch {
      setError('The local publish action is unavailable.');
    }
  }

  async function withdraw() {
    if (!document || busy || !publication) return;
    setError(null);
    setMessage(null);
    try {
      const result = await execute({
        operation: 'workspace.withdraw',
        input: { id: document.id },
      });
      if (!result.ok) setError(result.error.message);
      else setMessage('Snapshot withdrawn.');
    } catch {
      setError('The local withdrawal action is unavailable.');
    }
  }

  return (
    <section className="ws-systems" aria-labelledby="publishing-title">
      <header className="ws-page-heading">
        <h1 id="publishing-title">Publishing</h1>
        <span className="ws-panel-copy">
          Website publishing is not connected.
        </span>
      </header>
      <div className="ws-publishing-grid">
        <section className="ws-panel">
          {document ? (
            <>
              <label>
                <span>Draft</span>
                <select
                  value={document.id}
                  disabled={busy}
                  onChange={(event) => {
                    const next = state.documents.find(
                      (item) => item.id === event.target.value,
                    );
                    setDocumentId(event.target.value);
                    setRevision(next?.revision ?? 0);
                    setApproved(false);
                    setError(null);
                    setMessage(null);
                  }}
                >
                  {state.documents.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Exact revision</span>
                <select
                  value={revision}
                  disabled={busy}
                  onChange={(event) => {
                    setRevision(Number(event.target.value));
                    setApproved(false);
                    setError(null);
                    setMessage(null);
                  }}
                >
                  {revisions.map((item) => (
                    <option key={item.revision} value={item.revision}>
                      Revision {item.revision} · {item.savedAt}
                    </option>
                  ))}
                </select>
              </label>
              <article className="ws-draft-preview">
                <h2>
                  {revisions.find((item) => item.revision === revision)
                    ?.title ?? document.title}
                </h2>
                <p>
                  {revisions.find((item) => item.revision === revision)?.body ??
                    document.body}
                </p>
              </article>
              <label className="ws-check">
                <input
                  type="checkbox"
                  checked={approved}
                  disabled={busy}
                  onChange={(event) => setApproved(event.target.checked)}
                />
                Approve revision {revision}
              </label>
              <button
                className="ws-action"
                type="button"
                disabled={busy || !approved}
                onClick={publish}
              >
                {busy ? 'Working…' : 'Approve snapshot'}
              </button>
              <ErrorNotice message={error} />
              {message ? (
                <p className="ws-message" role="status">
                  {message}
                </p>
              ) : null}
            </>
          ) : (
            <Empty>No draft documents are available.</Empty>
          )}
        </section>
        <section className="ws-panel">
          <div className="ws-section-title">
            <div>
              <h2>Approved snapshot</h2>
            </div>
            {publication ? <Status tone="ready">Approved</Status> : null}
          </div>
          {publication ? (
            <>
              <dl className="ws-facts">
                <dt>Revision</dt>
                <dd>{publication.revision}</dd>
                <dt>Published</dt>
                <dd>{publication.publishedAt}</dd>
              </dl>
              <article className="ws-publication-preview">
                <h3>{publication.title}</h3>
                <p>{publication.body}</p>
              </article>
              <div className="ws-button-row">
                <button
                  type="button"
                  onClick={() => downloadSnapshot(publication, 'md')}
                >
                  Download Markdown
                </button>
                <button
                  type="button"
                  onClick={() => downloadSnapshot(publication, 'json')}
                >
                  Download JSON
                </button>
              </div>
              <button
                className="ws-danger"
                type="button"
                disabled={busy}
                onClick={withdraw}
              >
                {busy ? 'Working…' : 'Withdraw snapshot'}
              </button>
            </>
          ) : (
            <Empty>No approved snapshot.</Empty>
          )}
        </section>
      </div>
    </section>
  );
}

function uniqueRevisions(document: WorkspaceState['documents'][number]) {
  const revisions = new Map(
    document.revisions.map((item) => [item.revision, item]),
  );
  revisions.set(document.revision, {
    revision: document.revision,
    title: document.title,
    body: document.body,
    savedAt: document.updatedAt,
  });
  return [...revisions.values()].sort(
    (left, right) => right.revision - left.revision,
  );
}

function downloadSnapshot(
  publication: WorkspaceState['publications'][number],
  format: 'md' | 'json',
) {
  const content =
    format === 'md'
      ? `# ${publication.title}\n\n${publication.body}\n`
      : JSON.stringify(publication, null, 2);
  const blob = new Blob([content], {
    type:
      format === 'md'
        ? 'text/markdown;charset=utf-8'
        : 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${
    publication.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'publication'
  }-r${publication.revision}.${format}`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ConnectionsPage(_: WorkspacePageProps) {
  const capabilities = [
    'Adapters',
    'Webhooks',
    'Onion mirror',
    'IPFS snapshots',
    'Webmentions',
  ];
  return (
    <section className="ws-systems" aria-labelledby="connections-title">
      <header className="ws-page-heading">
        <h1 id="connections-title">Connections</h1>
        <span className="ws-panel-copy">0 connected</span>
      </header>
      <section className="ws-panel">
        <div className="ws-connection-list">
          {capabilities.map((capability) => (
            <div className="ws-connection" key={capability}>
              <h2>{capability}</h2>
              <span className="ws-panel-copy">Not connected</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

export function AccessPage({ audience, state }: WorkspacePageProps) {
  const owner = audience === 'owner';
  return (
    <section className="ws-systems" aria-labelledby="access-title">
      <header className="ws-page-heading">
        <h1 id="access-title">Access</h1>
      </header>
      <div className="ws-access-grid">
        <section className="ws-panel">
          <h2>Session</h2>
          <dl className="ws-facts">
            <dt>Signed in as</dt>
            <dd>{owner ? 'Owner' : 'Guest'}</dd>
            <dt>Data</dt>
            <dd>{state.synthetic ? 'Sample records' : 'Private records'}</dd>
            <dt>Storage</dt>
            <dd>{owner ? 'Private database' : 'This browser tab'}</dd>
          </dl>
        </section>
        <section className="ws-panel">
          <h2>Permissions</h2>
          <div className="ws-permissions">
            {['View records', 'Edit records', 'Approve snapshots'].map(
              (permission) => (
                <div key={permission}>
                  <span>{permission}</span>
                  <span className="ws-panel-copy">
                    {owner ? 'Allowed' : 'Sample data only'}
                  </span>
                </div>
              ),
            )}
            {!owner && (
              <div>
                <span>Owner data</span>
                <span className="ws-panel-copy">No access</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
