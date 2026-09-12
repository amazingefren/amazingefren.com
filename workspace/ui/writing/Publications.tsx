import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ThemeControl } from '../../../design/ui/index.ts';
import { Editor, MarkdownPreview } from './Editor.tsx';
import { PublicPreview } from './PublicPreview.tsx';
import { readMarkdownImport } from './markdown-import.ts';
import { prepareImage } from './image-compression.ts';
import './publications.css';
import { publicationInstant } from './editor-helpers.ts';
import type {
  Asset,
  Command,
  Publication,
  PublicationFields,
  Snapshot,
  StudioDocument,
  StudioProps,
  StudioState,
} from '../../../contracts/writing/index.ts';

const fieldsOf = (item: Publication): PublicationFields => ({
  title: item.title,
  slug: item.slug,
  summary: item.summary,
  tags: item.tags,
  seoTitle: item.seoTitle,
  seoDescription: item.seoDescription,
  coverAssetId: item.coverAssetId,
});
const stamp = (value: string) => new Date(value).toLocaleDateString();
const publicationStamp = (value: string, timezone?: string) =>
  new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone || 'America/Denver',
  }).format(new Date(value));
function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PublicationsView(props: StudioProps) {
  const [state, setState] = useState(props.state);
  const [drafts, setDrafts] = useState<Record<string, StudioDocument>>({});
  const [metas, setMetas] = useState<Record<string, PublicationFields>>({});
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState('');
  const [preview, setPreview] = useState(false);
  const [publicPreview, setPublicPreview] = useState<Snapshot | null>(null);
  const [split, setSplit] = useState(false);
  const [tools, setTools] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const importTarget = useRef('');
  const [tagText, setTagText] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [publicationAt, setPublicationAt] = useState('');
  const [timezone, setTimezone] = useState('America/Denver');
  const [reviewed, setReviewed] = useState<{
    version: number;
    chapters: { revision: number; title: string; body: string }[];
    assets: Asset[];
  } | null>(null);
  const createDialog = useRef<HTMLDialogElement>(null);
  const chapters = useRef<HTMLDialogElement>(null);
  const release = useRef<HTMLDialogElement>(null);
  const locked = useRef(false);
  const attempted = useRef('');
  const reviewFromRoute = useRef(false);
  useEffect(() => setState(props.state), [props.state]);
  useEffect(() => {
    setActive('');
    setPreview(false);
    setPublicPreview(null);
    setSplit(false);
    setTools(false);
    setTagText(null);
    setMessage('');
    setReviewed(null);
  }, [props.recordId]);
  const project = state.publications.find((item) => item.id === props.recordId);
  const source = project
    ? project.chapterIds
        .map((id) => state.documents.find((item) => item.id === id))
        .filter((item): item is StudioDocument => Boolean(item))
    : [];
  const stored = source.find((item) => item.id === active) ?? source[0];
  const chapter = stored ? (drafts[stored.id] ?? stored) : null;
  const fields = project ? (metas[project.id] ?? fieldsOf(project)) : null;
  const changed = source
    .filter((item) => drafts[item.id])
    .map((item) => drafts[item.id]);
  const dirty = Boolean(project && metas[project.id]) || changed.length > 0;
  const signature = JSON.stringify([
    props.recordId,
    changed,
    project && metas[project.id],
    retry,
  ]);
  importTarget.current = JSON.stringify([
    props.recordId,
    stored?.id,
    chapter?.body,
    signature,
  ]);
  useEffect(() => {
    props.onDirtyChange?.(dirty || saving);
    const block = (event: Event) => {
      if (dirty || saving) {
        event.preventDefault();
        setMessage('Save your changes before leaving.');
      }
    };
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty || saving) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('writing:before-navigate', block);
    window.addEventListener('beforeunload', unload);
    return () => {
      window.removeEventListener('writing:before-navigate', block);
      window.removeEventListener('beforeunload', unload);
      props.onDirtyChange?.(false);
    };
  }, [dirty, saving, props.onDirtyChange]);
  async function run(command: Command): Promise<StudioState | null> {
    const result = await props.execute(command);
    if (result.ok) {
      setState(result.value);
      return result.value;
    }
    setMessage(result.error.message);
    return null;
  }
  async function uploadInlineImage(
    file: File,
    metadata: { alt: string; caption: string; rights: string },
  ) {
    try {
      const image = await prepareImage(file);
      const next = await run({
        operation: 'studio.assets.add',
        input: {
          name: image.name,
          mime: image.mime,
          dataUrl: image.dataUrl,
          alt: metadata.alt,
          caption: metadata.caption,
          rights: metadata.rights,
        },
      });
      if (!next) return null;
      return next.assets.at(-1) ?? null;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'This image could not be uploaded.',
      );
      return null;
    }
  }
  function updateChapter(patch: Partial<StudioDocument>) {
    if (stored)
      setDrafts((all) => ({
        ...all,
        [stored.id]: { ...(all[stored.id] ?? stored), ...patch },
      }));
  }
  function updateMeta(patch: Partial<PublicationFields>) {
    if (!project) return;
    setMetas((all) => ({
      ...all,
      [project.id]: { ...(all[project.id] ?? fieldsOf(project)), ...patch },
    }));
    if (
      patch.title !== undefined &&
      project.kind !== 'book' &&
      stored?.source?.format !== 'org'
    )
      updateChapter({ title: patch.title });
  }
  async function save() {
    if (!project || locked.current || props.busy) return;
    locked.current = true;
    setSaving(true);
    setMessage('');
    let latest = state;
    try {
      for (const draft of changed) {
        const next = await run({
          operation: 'studio.notes.save',
          input: {
            id: draft.id,
            expectedRevision: draft.revision,
            title: draft.title,
            body: draft.body,
            tags: draft.tags,
            collection: draft.collection,
            pinned: draft.pinned,
          },
        });
        if (!next) return;
        latest = next;
        const saved = next.documents.find((item) => item.id === draft.id)!;
        setDrafts((all) => {
          const rest = { ...all };
          if (rest[draft.id] === draft) delete rest[draft.id];
          else if (rest[draft.id])
            rest[draft.id] = {
              ...rest[draft.id],
              revision: saved.revision,
              revisions: saved.revisions,
            };
          return rest;
        });
      }
      const meta = metas[project.id];
      if (meta) {
        const current = latest.publications.find(
          (item) => item.id === project.id,
        )!;
        if (
          await run({
            operation: 'publishing.projects.update',
            input: {
              id: project.id,
              expectedVersion: current.version,
              fields: meta,
            },
          })
        )
          setMetas((all) => {
            const rest = { ...all };
            if (rest[project.id] === meta) delete rest[project.id];
            return rest;
          });
      }
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }
  useEffect(() => {
    if (!dirty || saving || props.busy || attempted.current === signature)
      return;
    const timer = setTimeout(() => {
      attempted.current = signature;
      void save();
    }, 1000);
    return () => clearTimeout(timer);
  }, [signature, dirty, saving, props.busy]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = await run({
      operation: 'publishing.projects.create',
      input: {
        kind: form.get('kind') as Publication['kind'],
        title: String(form.get('title')),
      },
    });
    if (next) {
      createDialog.current?.close();
      props.navigate('publishing', next.publications.at(-1)?.id);
    }
  }
  async function publish() {
    if (
      !project ||
      !reviewed ||
      reviewed.version !== project.version ||
      dirty ||
      locked.current ||
      props.busy
    )
      return;
    locked.current = true;
    setSaving(true);
    setMessage('');
    try {
      const selectedInstant = publicationAt
        ? publicationInstant(publicationAt, timezone)
        : undefined;
      if (publicationAt && !selectedInstant) {
        setMessage('Use a valid publication date, time, and timezone.');
        return;
      }
      if (
        await run({
          operation: 'publishing.projects.publish',
          input: {
            id: project.id,
            expectedVersion: project.version,
            publicationAt: selectedInstant ?? undefined,
            timezone,
          },
        })
      ) {
        release.current?.close();
        setMessage(
          props.audience === 'guest' ? 'Guest release saved.' : 'Published.',
        );
      }
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }
  async function reviewSavedRevision() {
    if (!project || !chapter || dirty || locked.current || props.busy) return;
    locked.current = true;
    setSaving(true);
    setMessage('');
    try {
      const next = await run({
        operation: 'publishing.projects.review',
        input: { id: project.id, expectedVersion: project.version },
      });
      if (!next) return;
      const reviewedProject = next.publications.find(
        (item) => item.id === project.id,
      );
      if (!reviewedProject) return;
      const reviewedChapters = reviewedProject.chapterIds
        .map((id) => next.documents.find((item) => item.id === id))
        .filter((item): item is StudioDocument => Boolean(item))
        .map((item) => ({
          revision: item.revision,
          title: item.title,
          body: item.body,
        }));
      if (reviewedChapters.length !== reviewedProject.chapterIds.length) return;
      const assetIds = new Set(
        reviewedChapters.flatMap((item) =>
          [...item.body.matchAll(/!\[[^\]]*]\(asset:([^\s)]+)\)/g)].map(
            (match) => match[1],
          ),
        ),
      );
      if (fields?.coverAssetId) assetIds.add(fields.coverAssetId);
      setReviewed({
        version: reviewedProject.version,
        chapters: reviewedChapters,
        assets: next.assets.filter((asset) => assetIds.has(asset.id)),
      });
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }
  useEffect(() => {
    if (
      !project ||
      reviewFromRoute.current ||
      !window.location.search.includes('review=1')
    )
      return;
    reviewFromRoute.current = true;
    release.current?.showModal();
    const url = new URL(window.location.href);
    url.searchParams.delete('review');
    window.history.replaceState(
      {},
      '',
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [project]);
  async function importMarkdown(file: File | undefined) {
    if (!file || !chapter || dirty || importing || saving || props.busy) return;
    const target = importTarget.current;
    setImporting(true);
    try {
      const result = await readMarkdownImport(file);
      if (importTarget.current !== target) {
        setMessage(
          'The manuscript changed while reading the file. Import it again.',
        );
        return;
      }
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      updateChapter({ body: result.body });
      setMessage('Imported Markdown.');
    } finally {
      setImporting(false);
    }
  }
  function openPublicPreview() {
    if (!project || !fields) return;
    const previewChapters = source.map((item) => {
      const current = drafts[item.id] ?? item;
      return {
        documentId: current.id,
        revision: current.revision,
        title: current.title,
        body: current.body,
      };
    });
    const assetIds = new Set(
      previewChapters.flatMap((item) =>
        [...item.body.matchAll(/!\[[^\]]*]\(asset:([^\s)]+)/g)].map(
          (match) => match[1],
        ),
      ),
    );
    if (fields.coverAssetId) assetIds.add(fields.coverAssetId);
    const selected = publicationAt
      ? publicationInstant(publicationAt, timezone)
      : undefined;
    setPublicPreview({
      id: `draft-preview-${project.id}`,
      publishedAt:
        project.live?.publishedAt ?? selected ?? new Date().toISOString(),
      updatedAt: project.live?.updatedAt ?? null,
      timezone: project.live?.timezone ?? timezone,
      title: fields.title,
      slug: fields.slug,
      summary: fields.summary,
      kind: project.kind,
      seoTitle: fields.seoTitle,
      seoDescription: fields.seoDescription,
      tags: [...fields.tags],
      coverAssetId: fields.coverAssetId,
      chapters: previewChapters,
      assets: state.assets.filter((asset) => assetIds.has(asset.id)),
      projectVersion: project.version,
    });
  }
  if (!props.recordId) {
    const publications = state.publications.filter(
      (item) =>
        (filter === 'all' ||
          (filter === 'drafts'
            ? item.stage === 'draft' || item.stage === 'review'
            : item.stage === filter)) &&
        `${item.title} ${item.tags.join(' ')}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
    return (
      <section className="publication-library">
        <header>
          <h1>Publications</h1>
          <button
            className="ws-primary"
            disabled={props.busy}
            onClick={() => createDialog.current?.showModal()}
          >
            New publication
          </button>
        </header>
        {message && <p role="alert">{message}</p>}
        <div className="publication-filters">
          <nav aria-label="Publication status">
            {[
              ['all', 'All'],
              ['drafts', 'Drafts'],
              ['published', 'Published'],
            ].map(([value, label]) => (
              <button
                key={value}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </nav>
          <input
            aria-label="Search publications"
            placeholder="Find a publication..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="publication-rows">
          {publications.map((item) => (
            <button
              key={item.id}
              onClick={() => props.navigate('publishing', item.id)}
            >
              <span>
                <strong>{item.title}</strong>
                <small>
                  {item.kind}
                  {item.kind === 'book'
                    ? ` / ${item.chapterIds.length} chapters`
                    : ''}
                </small>
              </span>
              <span>
                <small>{item.stage}</small>
                <time>{stamp(item.updatedAt)}</time>
              </span>
            </button>
          ))}
        </div>
        {!publications.length && (
          <p className="publication-empty">No publications here yet.</p>
        )}
        <dialog className="ws-dialog" ref={createDialog}>
          <form onSubmit={create}>
            <h2>New publication</h2>
            <label>
              Title
              <input name="title" required autoFocus />
            </label>
            <label>
              Format
              <select name="kind">
                <option value="article">Article</option>
                <option value="page">Page</option>
                <option value="book">Book</option>
              </select>
            </label>
            <div className="studio-actions">
              <button
                type="button"
                onClick={() => createDialog.current?.close()}
              >
                Cancel
              </button>
              <button className="ws-primary" disabled={props.busy}>
                Create
              </button>
            </div>
          </form>
        </dialog>
      </section>
    );
  }
  if (!project || !fields)
    return (
      <section className="publication-library">
        <p>Publication not found.</p>
        <button onClick={() => props.navigate('publishing')}>
          Publications
        </button>
      </section>
    );
  return (
    <section className="publication-studio">
      {publicPreview && (
        <PublicPreview
          onClose={() => {
            setPublicPreview(null);
            requestAnimationFrame(() =>
              document.getElementById('public-preview-toggle')?.focus(),
            );
          }}
          snapshot={publicPreview}
        />
      )}
      <div className="publication-workspace" hidden={Boolean(publicPreview)}>
        <aside className="publication-rail" aria-label="Publication library">
          <div className="publication-rail-heading">
            <span>Library</span>
            <button
              aria-label="New publication"
              disabled={props.busy || saving}
              onClick={() => createDialog.current?.showModal()}
            >
              +
            </button>
          </div>
          <nav>
            {state.publications.map((item) => (
              <button
                aria-current={item.id === project.id ? 'page' : undefined}
                className="publication-rail-item ae-nav-item"
                key={item.id}
                onClick={() => props.navigate('publishing', item.id)}
              >
                <span>{item.title}</span>
                <small>
                  {item.stage}
                  {item.kind === 'book'
                    ? ` · ${item.chapterIds.length} chapters`
                    : ''}
                </small>
              </button>
            ))}
          </nav>
          <button
            className="publication-library-link"
            onClick={() => props.navigate('publishing')}
          >
            All publications
          </button>
        </aside>
        <main className="publication-manuscript-pane">
          <header className="publication-topbar">
            <div className="publication-location">
              <span className="publication-kicker">
                {project.kind === 'book' && chapter
                  ? `Chapter ${project.chapterIds.indexOf(chapter.id) + 1}`
                  : project.stage}
              </span>
              <span className="publication-save-state" role="status">
                {saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'Saved'}
              </span>
            </div>
            <button
              className="ws-primary"
              disabled={props.busy || saving || !dirty}
              onClick={() => void save()}
            >
              Save
            </button>
          </header>
          <div className="publication-viewbar" aria-label="Editor view">
            <div>
              <button
                aria-pressed={!preview && !split}
                onClick={() => {
                  setPreview(false);
                  setSplit(false);
                }}
              >
                Write
              </button>
              <button
                aria-pressed={split}
                onClick={() => {
                  setSplit(true);
                  setPreview(false);
                }}
              >
                Split
              </button>
              <button
                aria-pressed={preview}
                onClick={() => {
                  setPreview(true);
                  setSplit(false);
                }}
              >
                Read
              </button>
              <button
                aria-expanded={tools}
                onClick={() => {
                  setTools(!tools);
                  setPreview(false);
                  setSplit(false);
                }}
              >
                Tools
              </button>
            </div>
            <button
              id="public-preview-toggle"
              onClick={openPublicPreview}
              type="button"
            >
              Public preview
            </button>
          </div>
          <div className="publication-manuscript">
            {message && (
              <p className="studio-notice" role="alert">
                {message}
                {dirty && (
                  <button onClick={() => setRetry((value) => value + 1)}>
                    Retry save
                  </button>
                )}
              </p>
            )}
            {chapter ? (
              <>
                {project.kind === 'book' && (
                  <p className="publication-book-context">
                    {fields.title} / Chapter{' '}
                    {project.chapterIds.indexOf(chapter.id) + 1}
                  </p>
                )}
                {preview ? (
                  <h1 className="publication-title">
                    {project.kind === 'book' ? chapter.title : fields.title}
                  </h1>
                ) : (
                  <input
                    className="publication-title"
                    aria-label="Publication title"
                    value={
                      project.kind === 'book' ? chapter.title : fields.title
                    }
                    disabled={chapter.source?.format === 'org'}
                    onChange={(event) =>
                      project.kind === 'book'
                        ? updateChapter({ title: event.target.value })
                        : updateMeta({ title: event.target.value })
                    }
                  />
                )}
                <Editor
                  key={chapter.id}
                  value={chapter.body}
                  onChange={(body) => updateChapter({ body })}
                  onSave={() => void save()}
                  assets={state.assets}
                  busy={saving || props.busy}
                  quiet
                  viewMode={preview ? 'reading' : split ? 'split' : 'markdown'}
                  toolsMode={tools}
                  onUploadImage={uploadInlineImage}
                  readOnly={chapter.source?.format === 'org'}
                />
                {chapter.source?.format === 'org' && (
                  <p className="studio-notice">
                    This org-sourced manuscript is read-only here. Edit it in
                    the Emacs workspace.
                  </p>
                )}
              </>
            ) : (
              <>
                <h1>{fields.title}</h1>
                <button
                  className="ws-primary"
                  disabled={props.busy}
                  onClick={() =>
                    void run({
                      operation: 'publishing.projects.add-chapter',
                      input: {
                        id: project.id,
                        expectedVersion: project.version,
                        title: 'Chapter 1',
                      },
                    })
                  }
                >
                  Add first chapter
                </button>
              </>
            )}
          </div>
        </main>
        <details className="publication-settings" open>
          <summary>Publication settings</summary>
          <div className="publication-settings-content">
            <div className="publication-settings-heading">
              <h2>Publication settings</h2>
              <ThemeControl />
            </div>
            <button
              onClick={() => {
                setTools(true);
              }}
            >
              Writing tools
            </button>
            {chapter && (
              <label>
                Import Markdown
                <input
                  type="file"
                  accept=".md,text/markdown,text/plain"
                  disabled={
                    props.busy ||
                    saving ||
                    dirty ||
                    importing ||
                    chapter.source?.format === 'org'
                  }
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = '';
                    void importMarkdown(file);
                  }}
                />
              </label>
            )}
            <button
              onClick={() => {
                props.navigate('media');
              }}
            >
              Image library and details
            </button>
            {project.kind === 'book' && (
              <button onClick={() => chapters.current?.showModal()}>
                Manage chapters
              </button>
            )}
            <button
              className="ws-primary"
              disabled={props.busy || saving || dirty || !chapter}
              onClick={() => release.current?.showModal()}
            >
              {project.live ? 'Review update' : 'Review release'}
            </button>
            {project.kind === 'book' && (
              <label>
                Book title
                <input
                  value={fields.title}
                  onChange={(event) =>
                    updateMeta({ title: event.target.value })
                  }
                />
              </label>
            )}
            <label>
              URL slug
              <input
                value={fields.slug}
                onChange={(event) => updateMeta({ slug: event.target.value })}
              />
            </label>
            <label>
              Summary
              <textarea
                value={fields.summary}
                onChange={(event) =>
                  updateMeta({ summary: event.target.value })
                }
              />
            </label>
            <label>
              Tags
              <input
                value={tagText ?? fields.tags.join(', ')}
                onChange={(event) => {
                  setTagText(event.target.value);
                  updateMeta({
                    tags: event.target.value
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean),
                  });
                }}
              />
            </label>
            <label>
              Cover image
              <select
                value={fields.coverAssetId ?? ''}
                onChange={(event) =>
                  updateMeta({ coverAssetId: event.target.value || null })
                }
              >
                <option value="">No cover</option>
                {state.assets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <details>
              <summary>Search metadata</summary>
              <label>
                Search title
                <input
                  value={fields.seoTitle}
                  onChange={(event) =>
                    updateMeta({ seoTitle: event.target.value })
                  }
                />
              </label>
              <label>
                Search description
                <textarea
                  value={fields.seoDescription}
                  onChange={(event) =>
                    updateMeta({ seoDescription: event.target.value })
                  }
                />
              </label>
            </details>
            {chapter && (
              <details>
                <summary>Version history</summary>
                {chapter.revisions
                  .slice()
                  .reverse()
                  .map((item) => (
                    <button
                      key={item.number}
                      disabled={dirty || props.busy}
                      onClick={() =>
                        void run({
                          operation: 'studio.notes.restore',
                          input: {
                            id: chapter.id,
                            expectedRevision: chapter.revision,
                            revision: item.number,
                          },
                        })
                      }
                    >
                      Restore revision {item.number}
                    </button>
                  ))}
              </details>
            )}
            <details>
              <summary>Exports and releases</summary>
              {chapter && (
                <button
                  onClick={() =>
                    download(
                      `${fields.slug || 'manuscript'}.md`,
                      chapter.body,
                      'text/markdown',
                    )
                  }
                >
                  Download manuscript
                </button>
              )}
              {project.releases.map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    download(
                      `${item.slug}-${item.id}.json`,
                      JSON.stringify(item, null, 2),
                      'application/json',
                    )
                  }
                >
                  Release {stamp(item.publishedAt)}
                </button>
              ))}
              {project.live && (
                <button
                  disabled={dirty || saving || props.busy}
                  onClick={() =>
                    void run({
                      operation: 'publishing.projects.withdraw',
                      input: {
                        id: project.id,
                        expectedVersion: project.version,
                      },
                    })
                  }
                >
                  Withdraw publication
                </button>
              )}
            </details>
            <p>Scheduled publishing is not configured.</p>
          </div>
        </details>
      </div>
      <dialog className="zen-panel ws-dialog" ref={chapters}>
        <div className="zen-panel-heading">
          <h2>Chapters</h2>
          <button onClick={() => chapters.current?.close()}>Close</button>
        </div>
        <div className="zen-panel-content">
          {source.map((item, index) => (
            <div className="zen-chapter-row" key={item.id}>
              <button
                aria-pressed={item.id === chapter?.id}
                onClick={() => {
                  setActive(item.id);
                  chapters.current?.close();
                }}
              >
                {index + 1}. {item.title}
              </button>
              <button
                disabled={dirty || saving || props.busy || index === 0}
                onClick={() => {
                  const ids = [...project.chapterIds];
                  [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                  void run({
                    operation: 'publishing.projects.reorder',
                    input: {
                      id: project.id,
                      expectedVersion: project.version,
                      chapterIds: ids,
                    },
                  });
                }}
              >
                Up
              </button>
            </div>
          ))}
          <button
            disabled={dirty || saving || props.busy}
            onClick={() =>
              void run({
                operation: 'publishing.projects.add-chapter',
                input: {
                  id: project.id,
                  expectedVersion: project.version,
                  title: `Chapter ${source.length + 1}`,
                },
              })
            }
          >
            Add chapter
          </button>
        </div>
      </dialog>
      <dialog className="ws-dialog" ref={release}>
        <h2>{project.live ? 'Update publication?' : 'Publish this work?'}</h2>
        <p>{fields.title}</p>
        <p>
          {props.audience === 'guest'
            ? 'This creates a guest release only.'
            : 'This makes the saved manuscripts and referenced images public.'}
        </p>
        {message && <p role="alert">{message}</p>}
        {project.live && (
          <p>
            Published{' '}
            {publicationStamp(project.live.publishedAt, project.live.timezone)}
            {project.live.updatedAt &&
              ` / Updated ${publicationStamp(project.live.updatedAt, project.live.timezone)}`}
          </p>
        )}
        <label>
          Publish date and time
          <input
            type="datetime-local"
            value={publicationAt}
            onChange={(event) => setPublicationAt(event.target.value)}
          />
        </label>
        <label>
          Publication timezone
          <input
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
          />
        </label>
        {reviewed && (
          <section
            className="studio-review-preview"
            aria-label="Saved revision preview"
          >
            <h3>Saved revision preview</h3>
            {reviewed.chapters.map((item) => (
              <section key={`${item.title}-${item.revision}`}>
                <h4>
                  {item.title} / Revision {item.revision}
                </h4>
                <MarkdownPreview assets={reviewed.assets} value={item.body} />
              </section>
            ))}
          </section>
        )}
        <div className="studio-actions">
          <button disabled={saving} onClick={() => release.current?.close()}>
            Cancel
          </button>
          <button
            className="ws-primary"
            disabled={dirty || saving || props.busy || Boolean(reviewed)}
            onClick={() => void reviewSavedRevision()}
          >
            {saving ? 'Reviewing...' : 'Review saved revision'}
          </button>
          <button
            className="ws-primary"
            disabled={
              dirty ||
              saving ||
              props.busy ||
              !reviewed ||
              reviewed.version !== project.version
            }
            onClick={() => void publish()}
          >
            {saving ? 'Publishing...' : 'Publish reviewed revision'}
          </button>
        </div>
      </dialog>
      <dialog className="ws-dialog" ref={createDialog}>
        <form onSubmit={create}>
          <h2>New publication</h2>
          <label>
            Title
            <input name="title" required autoFocus />
          </label>
          <label>
            Format
            <select name="kind">
              <option value="article">Article</option>
              <option value="page">Page</option>
              <option value="book">Book</option>
            </select>
          </label>
          <div className="studio-actions">
            <button type="button" onClick={() => createDialog.current?.close()}>
              Cancel
            </button>
            <button className="ws-primary" disabled={props.busy}>
              Create
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
