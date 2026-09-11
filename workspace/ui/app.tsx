'use client';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { BrandMark, ThemeControl } from '../../design/ui/index.ts';
import type {
  CatalogEntry,
  WorkspaceAudience,
  WorkspaceError,
  WorkspaceCommand,
  WorkspacePage,
  WorkspacePageProps,
  WorkspacePort,
  WorkspaceResult,
  WorkspaceState,
} from '../contracts/index.ts';
import { workspacePages } from '../contracts/index.ts';
import { isWorkspaceState } from '../domain/index.ts';
import { createBrowserGuestPort } from '../adapters/guest-browser.ts';
import { DashboardPage } from './dashboard.tsx';
import { TasksPage, ExperimentsPage, RelationshipsPage } from './studio.tsx';
import { SystemsPage, ConnectionsPage, AccessPage } from './systems.tsx';

import { resetGuestWork } from '../../work/adapters/guest.ts';
import { resetGuestEvaluation } from '../../evaluation/adapters/guest-session.ts';
import { resetGuestEvidence } from '../../evidence/adapters/guest-session.ts';
import { EvidencePage } from './evidence-page.tsx';
import { WorkPage } from './work-page.tsx';
import { WritingPage } from './writing-page.tsx';
import { BenchmarkPage } from './benchmark-page.tsx';

const labels = {
  dashboard: 'Dashboard',
  work: 'Work',
  documents: 'Notes',
  tasks: 'Tasks',
  experiments: 'Experiments',
  benchmarks: 'Benchmarks',
  evidence: 'Evidence',
  relationships: 'Relationships',
  publishing: 'Publications',
  systems: 'Systems',
  connections: 'Connections',
  access: 'Access',
};
const symbols = ['▦', '◇', '▤', '☷', '◉', '∷', '≡', '⇄', '↗', '⌘', '⊞', '⌑'];
export function WorkspaceApp({
  initialPage,
  catalog,
  audience = 'guest',
  initialState,
}: {
  initialPage: WorkspacePage;
  catalog: CatalogEntry[];
  audience?: WorkspaceAudience;
  initialState?: WorkspaceState;
}) {
  const base = audience === 'owner' ? '/workspace' : '/guest';
  const dirty = useRef(false);
  const currentPath = useRef('');
  const onDirtyChange = (value: boolean) => {
    dirty.current = value;
  };
  const [page, setPage] = useState(initialPage);
  const [recordId, setRecordId] = useState<string>();
  const [state, setState] = useState<WorkspaceState | undefined>(initialState);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [keys, setKeys] = useState({ enabled: true, next: 'j', previous: 'k' });
  const port = useRef<WorkspacePort | null>(null);
  const pending = useRef(false);
  const resetDialog = useRef<HTMLDialogElement>(null);
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    try {
      port.current =
        audience === 'guest'
          ? createBrowserGuestPort(window.sessionStorage)
          : {
              async execute(command) {
                const response = await fetch('/api/workspace/operation', {
                  method: 'POST',
                  credentials: 'same-origin',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(command),
                });
                const result: unknown = await response.json();
                if (result && typeof result === 'object' && 'ok' in result) {
                  if (
                    result.ok === true &&
                    'value' in result &&
                    isWorkspaceState(result.value) &&
                    !result.value.synthetic
                  )
                    return { ok: true, value: result.value };
                  if (
                    result.ok === false &&
                    'error' in result &&
                    result.error &&
                    typeof result.error === 'object' &&
                    'message' in result.error &&
                    typeof result.error.message === 'string'
                  )
                    return {
                      ok: false,
                      error: {
                        code:
                          'code' in result.error &&
                          [
                            'invalid',
                            'denied',
                            'missing',
                            'conflict',
                            'unavailable',
                          ].includes(String(result.error.code))
                            ? (result.error.code as WorkspaceError['code'])
                            : 'unavailable',
                        message: result.error.message,
                      },
                    };
                }
                return {
                  ok: false,
                  error: {
                    code: 'unavailable',
                    message: 'The owner service returned an invalid response.',
                  },
                };
              },
            };
    } catch {
      setError(
        'Browser storage is unavailable. Enable session storage to use the guest workspace.',
      );
      return;
    }
    void port.current
      .execute({ operation: 'workspace.read', input: {} })
      .then((result) => {
        if (result.ok) setState(result.value);
        else setError(result.error.message);
      })
      .catch(() =>
        setError('The workspace could not load. Try refreshing the page.'),
      );
    currentPath.current = location.pathname + location.search;
    const pop = () => {
      if (
        location.pathname + location.search !== currentPath.current &&
        !window.dispatchEvent(
          new Event('writing:before-navigate', { cancelable: true }),
        )
      ) {
        history.pushState({}, '', currentPath.current);
        return;
      }
      currentPath.current = location.pathname + location.search;
      const requested = location.pathname.split('/')[2] as WorkspacePage;
      setPage(workspacePages.includes(requested) ? requested : 'dashboard');
      setRecordId(
        new URLSearchParams(location.search).get('record') ?? undefined,
      );
    };
    pop();
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('popstate', pop);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('popstate', pop);
      window.removeEventListener('keydown', escape);
    };
  }, []);
  function navigate(next: WorkspacePage, id?: string) {
    if (next === page && id === recordId) return;
    if (
      !window.dispatchEvent(
        new Event('writing:before-navigate', { cancelable: true }),
      )
    )
      return;
    if (dirty.current) {
      setError('Save or discard your edits before leaving.');
      return;
    }
    if (next !== page) dirty.current = false;
    history.pushState(
      {},
      '',
      `${base}/${next}${id ? `?record=${encodeURIComponent(id)}` : ''}`,
    );
    currentPath.current = location.pathname + location.search;
    setPage(next);
    setRecordId(id);
    setSidebarOpen(false);
    setError('');
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
  }
  async function execute(
    command: WorkspaceCommand,
  ): Promise<WorkspaceResult<WorkspaceState>> {
    if (!port.current || pending.current)
      return {
        ok: false,
        error: {
          code: 'unavailable',
          message: 'Wait for the current operation to finish.',
        },
      };
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await port.current.execute(command);
      if (result.ok) setState(result.value);
      else setError(result.error.message);
      return result;
    } catch {
      const result = {
        ok: false as const,
        error: {
          code: 'unavailable' as const,
          message: 'The workspace could not save this change.',
        },
      };
      setError(result.error.message);
      return result;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function moveNavigation(event: KeyboardEvent<HTMLElement>) {
    if (
      !keys.enabled ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey ||
      !(event.target instanceof HTMLAnchorElement)
    )
      return;
    if (
      keys.next === keys.previous ||
      !/^[a-z]$/.test(keys.next) ||
      !/^[a-z]$/.test(keys.previous)
    )
      return;
    const direction =
      event.key === keys.next ? 1 : event.key === keys.previous ? -1 : 0;
    if (!direction) return;
    const links = [
      ...event.currentTarget.querySelectorAll<HTMLAnchorElement>('a'),
    ];
    event.preventDefault();
    links[
      (links.indexOf(event.target) + direction + links.length) % links.length
    ]?.focus();
  }
  const props: WorkspacePageProps | null = state
    ? { state, execute, audience, busy, navigate, recordId, onDirtyChange }
    : null;
  const pages = props
    ? {
        dashboard: <DashboardPage {...props} />,
        work: (
          <WorkPage
            key={audience}
            audience={audience}
            onDirtyChange={onDirtyChange}
          />
        ),
        documents: <WritingPage {...props} section="documents" />,
        tasks: <TasksPage {...props} />,
        experiments: <ExperimentsPage {...props} />,
        benchmarks: <BenchmarkPage audience={audience} />,
        evidence: <EvidencePage audience={audience} />,
        relationships: <RelationshipsPage {...props} />,
        publishing: <WritingPage {...props} section="publishing" />,
        systems: <SystemsPage {...props} catalog={catalog} />,
        connections: <ConnectionsPage {...props} />,
        access: <AccessPage {...props} />,
      }
    : null;
  return (
    <div
      className={`ae-workspace${sidebarOpen ? ' ws-sidebar-open' : ''}${page === 'publishing' && recordId ? ' is-writing' : ''}`}
    >
      <a className="ws-skip" href="#workspace-main">
        Skip to workspace
      </a>
      <aside className="ws-sidebar" aria-label="Workspace navigation">
        <a className="ws-brand" href="/">
          <BrandMark variant="theme" />
          <span>WORKSPACE</span>
        </a>
        <p className="ws-nav-label">PERSONAL WORKSPACE</p>
        <nav onKeyDown={moveNavigation}>
          {workspacePages.map((item, index) => (
            <a
              className="ae-nav-item"
              href={`${base}/${item}`}
              key={item}
              aria-current={item === page ? 'page' : undefined}
              onClick={(event) => {
                if (
                  !event.metaKey &&
                  !event.ctrlKey &&
                  !event.shiftKey &&
                  !event.altKey
                ) {
                  event.preventDefault();
                  navigate(item);
                }
              }}
            >
              <span aria-hidden="true">{symbols[index]}</span>
              {labels[item]}
            </a>
          ))}
        </nav>
        <p className="ws-nav-label ws-public-label">PUBLIC SIDE</p>
        <nav>
          <a href="/readings">
            <span aria-hidden="true">≡</span>Readings
          </a>
          <a href="/about">
            <span aria-hidden="true">↗</span>About + Resume
          </a>
        </nav>
        <div className="ws-sidebar-bottom">
          <details>
            <summary>Keyboard settings</summary>
            <label className="ws-checkbox">
              <input
                type="checkbox"
                checked={keys.enabled}
                onChange={(event) =>
                  setKeys({ ...keys, enabled: event.target.checked })
                }
              />
              Vim navigation
            </label>
            <label>
              Next
              <input
                maxLength={1}
                value={keys.next}
                onChange={(event) =>
                  setKeys({ ...keys, next: event.target.value })
                }
              />
            </label>
            <label>
              Previous
              <input
                maxLength={1}
                value={keys.previous}
                onChange={(event) =>
                  setKeys({ ...keys, previous: event.target.value })
                }
              />
            </label>
            <small>
              {keys.next === keys.previous
                ? 'Use different keys.'
                : 'Focus a sidebar link, then use these keys.'}
            </small>
          </details>
          <a href="/privacy">Privacy</a>
          <a href="/">
            Back to the public site <span aria-hidden="true">↗</span>
          </a>
          <div className="ws-profile">
            AE workspace
            <small>
              {audience === 'guest'
                ? 'Guest · Sample data'
                : 'Owner · Private workspace'}
            </small>
          </div>
        </div>
      </aside>
      <div className="ws-content">
        <header className="ws-header">
          <div>
            <button
              className="ws-menu"
              aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
            <span>Workspace</span>
            <span className="ws-slash">/</span>
            <strong>{labels[page]}</strong>
          </div>
          <div className="ws-header-tools">
            <ThemeControl />
            {audience === 'guest' ? (
              <>
                <button
                  disabled={busy}
                  onClick={() => resetDialog.current?.showModal()}
                >
                  Reset demo
                </button>
                <span className="ws-synthetic">Sample data</span>
              </>
            ) : (
              <span className="ws-synthetic">Private</span>
            )}
          </div>
        </header>
        <main
          id="workspace-main"
          ref={main}
          tabIndex={-1}
          className="ws-main ae-focus-target"
        >
          {error && (
            <div className="ws-error" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError('')}>
                ×
              </button>
            </div>
          )}
          {pages ? (
            pages[page]
          ) : (
            <div className="ws-loading" role="status">
              {error ? 'Workspace unavailable.' : 'Opening workspace…'}
            </div>
          )}
        </main>
      </div>
      <dialog ref={resetDialog} className="ws-dialog">
        <h2>Reset guest workspace?</h2>
        <p>This clears the sample changes in this tab.</p>
        <div>
          <button onClick={() => resetDialog.current?.close()}>Cancel</button>
          <button
            className="ws-primary"
            disabled={busy}
            onClick={async () => {
              const result = await execute({
                operation: 'workspace.reset',
                input: {},
              });
              if (result.ok) {
                try {
                  resetGuestWork(window.sessionStorage);
                  resetGuestEvaluation(window.sessionStorage);
                  resetGuestEvidence(window.sessionStorage);
                  window.dispatchEvent(new Event('work:guest-reset'));
                  resetDialog.current?.close();
                } catch {
                  setError('Work could not reset. Try again.');
                }
              }
            }}
          >
            Reset
          </button>
        </div>
      </dialog>
    </div>
  );
}
