import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PublicPreview } from './PublicPreview.tsx';
import { readMarkdownImport } from './markdown-import.ts';
import { prepareImage } from './image-compression.ts';
import './publications.css';
import { publicationInstant } from './editor-helpers.ts';
import {
  CreatePublicationDialog,
  PublicationLibrary,
  PublicationRail,
  type PublicationFilter,
} from './publication-library.tsx';
import {
  ChapterDialog,
  PublicationManuscript,
  PublicationSettings,
  ReleaseDialog,
  type ImageMetadata,
  type ReviewedRevision,
} from './publication-workspace.tsx';
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

export function PublicationsView(props: StudioProps) {
  const [state, setState] = useState(props.state);
  const [drafts, setDrafts] = useState<Record<string, StudioDocument>>({});
  const [metas, setMetas] = useState<Record<string, PublicationFields>>({});
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PublicationFilter>('all');
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
  const [publicationAt, setPublicationAt] = useState('');
  const [timezone, setTimezone] = useState('America/Denver');
  const [reviewed, setReviewed] = useState<ReviewedRevision | null>(null);
  const createDialog = useRef<HTMLDialogElement>(null);
  const chapters = useRef<HTMLDialogElement>(null);
  const release = useRef<HTMLDialogElement>(null);
  const locked = useRef(false);
  const reviewFromRoute = useRef(false);

  useEffect(() => setState(props.state), [props.state]);
  useEffect(() => {
    reviewFromRoute.current = false;
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
  const publicationRevision = project
    ? (project.revision ?? Math.max(1, project.releases.length))
    : 1;
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
    metadata: ImageMetadata,
  ): Promise<Asset | null> {
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
        revision: reviewedProject.revision ?? publicationRevision,
        chapters: reviewedChapters,
        assets: next.assets.filter((asset) => assetIds.has(asset.id)),
      });
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }

  async function createRevision() {
    if (!project || !chapter || dirty || locked.current || props.busy) return;
    locked.current = true;
    setSaving(true);
    setMessage('');
    try {
      const next = await run({
        operation: 'publishing.projects.create-revision',
        input: { id: project.id, expectedVersion: project.version },
      });
      if (next) setReviewed(null);
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }

  useEffect(() => {
    if (
      !project ||
      reviewFromRoute.current ||
      new URLSearchParams(window.location.search).get('review') !== '1'
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
      revision: publicationRevision,
    });
  }

  function changeView(view: 'write' | 'split' | 'read' | 'tools') {
    if (view === 'tools') {
      setTools((current) => !current);
      setPreview(false);
      setSplit(false);
      return;
    }
    setPreview(view === 'read');
    setSplit(view === 'split');
  }

  function openCreateDialog() {
    createDialog.current?.showModal();
  }

  function moveChapterUp(index: number) {
    if (!project) return;
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
  }

  function addChapter(title: string) {
    if (!project) return;
    void run({
      operation: 'publishing.projects.add-chapter',
      input: {
        id: project.id,
        expectedVersion: project.version,
        title,
      },
    });
  }

  function restoreChapter(revision: number) {
    if (!chapter) return;
    void run({
      operation: 'studio.notes.restore',
      input: {
        id: chapter.id,
        expectedRevision: chapter.revision,
        revision,
      },
    });
  }

  function withdraw() {
    if (!project) return;
    void run({
      operation: 'publishing.projects.withdraw',
      input: {
        id: project.id,
        expectedVersion: project.version,
      },
    });
  }

  if (!props.recordId)
    return (
      <PublicationLibrary
        state={state}
        busy={props.busy}
        filter={filter}
        query={query}
        message={message}
        createDialog={createDialog}
        onFilterChange={setFilter}
        onQueryChange={setQuery}
        onOpenCreate={openCreateDialog}
        onSelect={(id) => props.navigate('publishing', id)}
        onCreate={create}
      />
    );

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
        <PublicationRail
          state={state}
          project={project}
          busy={props.busy}
          saving={saving}
          onOpenCreate={openCreateDialog}
          onSelect={(id) => props.navigate('publishing', id)}
          onAllPublications={() => props.navigate('publishing')}
        />
        <PublicationManuscript
          project={project}
          fields={fields}
          chapter={chapter}
          publicationRevision={publicationRevision}
          preview={preview}
          split={split}
          tools={tools}
          saving={saving}
          busy={props.busy}
          dirty={dirty}
          message={message}
          assets={state.assets}
          onSave={() => void save()}
          onViewChange={changeView}
          onPublicPreview={openPublicPreview}
          onAddFirstChapter={() => addChapter('Chapter 1')}
          onUpdateChapter={updateChapter}
          onUpdateMeta={updateMeta}
          onUploadImage={uploadInlineImage}
        />
        <PublicationSettings
          project={project}
          fields={fields}
          chapter={chapter}
          state={state}
          busy={props.busy}
          saving={saving}
          dirty={dirty}
          importing={importing}
          tagText={tagText}
          onTools={() => setTools(true)}
          onImport={importMarkdown}
          onMedia={() => props.navigate('media')}
          onOpenChapters={() => chapters.current?.showModal()}
          onReviewRelease={() => release.current?.showModal()}
          onCreateRevision={() => void createRevision()}
          onUpdateMeta={updateMeta}
          onTagsChange={(value) => {
            setTagText(value);
            updateMeta({
              tags: value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            });
          }}
          onRestore={restoreChapter}
          onWithdraw={withdraw}
        />
      </div>
      <ChapterDialog
        dialog={chapters}
        source={source}
        chapter={chapter}
        dirty={dirty}
        saving={saving}
        busy={props.busy}
        onSelect={setActive}
        onMoveUp={moveChapterUp}
        onAdd={() => addChapter(`Chapter ${source.length + 1}`)}
      />
      <ReleaseDialog
        dialog={release}
        project={project}
        fields={fields}
        audience={props.audience}
        publicationAt={publicationAt}
        timezone={timezone}
        reviewed={reviewed}
        message={message}
        saving={saving}
        dirty={dirty}
        busy={props.busy}
        onClose={() => release.current?.close()}
        onPublicationAtChange={setPublicationAt}
        onTimezoneChange={setTimezone}
        onReview={() => void reviewSavedRevision()}
        onPublish={() => void publish()}
      />
      <CreatePublicationDialog
        dialog={createDialog}
        busy={props.busy}
        onSubmit={create}
      />
    </section>
  );
}
