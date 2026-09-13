import type { RefObject } from 'react';
import { ThemeControl } from '../../../design/ui/index.ts';
import { Editor, MarkdownPreview } from './Editor.tsx';
import type {
  Asset,
  Publication,
  PublicationFields,
  StudioDocument,
  StudioState,
} from '../../../contracts/writing/index.ts';

type DialogRef = RefObject<HTMLDialogElement | null>;
export type ImageMetadata = { alt: string; caption: string; rights: string };
export type UploadImage = (
  file: File,
  metadata: ImageMetadata,
) => Promise<Asset | null>;
export type ReviewedRevision = {
  version: number;
  revision: number;
  chapters: { title: string; body: string }[];
  assets: Asset[];
};

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

type PublicationManuscriptProps = {
  project: Publication;
  fields: PublicationFields;
  chapter: StudioDocument | null;
  publicationRevision: number;
  preview: boolean;
  split: boolean;
  tools: boolean;
  saving: boolean;
  busy: boolean;
  dirty: boolean;
  message: string;
  assets: Asset[];
  onSave(): void;
  onViewChange(view: 'write' | 'split' | 'read' | 'tools'): void;
  onPublicPreview(): void;
  onAddFirstChapter(): void;
  onUpdateChapter(patch: Partial<StudioDocument>): void;
  onUpdateMeta(patch: Partial<PublicationFields>): void;
  onUploadImage: UploadImage;
};

export function PublicationManuscript({
  project,
  fields,
  chapter,
  publicationRevision,
  preview,
  split,
  tools,
  saving,
  busy,
  dirty,
  message,
  assets,
  onSave,
  onViewChange,
  onPublicPreview,
  onAddFirstChapter,
  onUpdateChapter,
  onUpdateMeta,
  onUploadImage,
}: PublicationManuscriptProps) {
  return (
    <main className="publication-manuscript-pane">
      <header className="publication-topbar">
        <div className="publication-location">
          <span className="publication-kicker">
            {project.kind === 'book' && chapter
              ? `Chapter ${project.chapterIds.indexOf(chapter.id) + 1}`
              : project.stage}
            {` · Revision ${publicationRevision}`}
          </span>
          <span className="publication-save-state" role="status">
            {saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'Saved'}
          </span>
        </div>
        <button
          className="ws-primary"
          disabled={busy || saving || !dirty}
          onClick={onSave}
        >
          Save
        </button>
      </header>
      <div className="publication-viewbar" aria-label="Editor view">
        <div>
          <button
            aria-pressed={!preview && !split}
            onClick={() => onViewChange('write')}
          >
            Write
          </button>
          <button aria-pressed={split} onClick={() => onViewChange('split')}>
            Split
          </button>
          <button aria-pressed={preview} onClick={() => onViewChange('read')}>
            Read
          </button>
          <button aria-expanded={tools} onClick={() => onViewChange('tools')}>
            Tools
          </button>
        </div>
        <button
          id="public-preview-toggle"
          onClick={onPublicPreview}
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
              <button disabled={saving || busy} onClick={onSave}>
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
                value={project.kind === 'book' ? chapter.title : fields.title}
                disabled={chapter.source?.format === 'org'}
                onChange={(event) =>
                  project.kind === 'book'
                    ? onUpdateChapter({ title: event.target.value })
                    : onUpdateMeta({ title: event.target.value })
                }
              />
            )}
            <Editor
              key={chapter.id}
              value={chapter.body}
              onChange={(body) => onUpdateChapter({ body })}
              onSave={onSave}
              assets={assets}
              busy={saving || busy}
              quiet
              viewMode={preview ? 'reading' : split ? 'split' : 'markdown'}
              toolsMode={tools}
              onUploadImage={onUploadImage}
              readOnly={chapter.source?.format === 'org'}
            />
            {chapter.source?.format === 'org' && (
              <p className="studio-notice">
                This org-sourced manuscript is read-only here. Edit it in the
                Emacs workspace.
              </p>
            )}
          </>
        ) : (
          <>
            <h1>{fields.title}</h1>
            <button
              className="ws-primary"
              disabled={busy}
              onClick={onAddFirstChapter}
            >
              Add first chapter
            </button>
          </>
        )}
      </div>
    </main>
  );
}

type PublicationSettingsProps = {
  project: Publication;
  fields: PublicationFields;
  chapter: StudioDocument | null;
  state: StudioState;
  busy: boolean;
  saving: boolean;
  dirty: boolean;
  importing: boolean;
  tagText: string | null;
  onTools(): void;
  onImport(file: File | undefined): void | Promise<void>;
  onMedia(): void;
  onOpenChapters(): void;
  onReviewRelease(): void;
  onCreateRevision(): void;
  onUpdateMeta(patch: Partial<PublicationFields>): void;
  onTagsChange(value: string): void;
  onRestore(revision: number): void;
  onWithdraw(): void;
};

export function PublicationSettings({
  project,
  fields,
  chapter,
  state,
  busy,
  saving,
  dirty,
  importing,
  tagText,
  onTools,
  onImport,
  onMedia,
  onOpenChapters,
  onReviewRelease,
  onCreateRevision,
  onUpdateMeta,
  onTagsChange,
  onRestore,
  onWithdraw,
}: PublicationSettingsProps) {
  return (
    <details className="publication-settings" open>
      <summary>Publication settings</summary>
      <div className="publication-settings-content">
        <div className="publication-settings-heading">
          <h2>Publication settings</h2>
          <ThemeControl />
        </div>
        <button onClick={onTools}>Writing tools</button>
        {chapter && (
          <label>
            Import Markdown
            <input
              type="file"
              accept=".md,text/markdown,text/plain"
              disabled={
                busy ||
                saving ||
                dirty ||
                importing ||
                chapter.source?.format === 'org'
              }
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                void onImport(file);
              }}
            />
          </label>
        )}
        <button onClick={onMedia}>Image library and details</button>
        {project.kind === 'book' && (
          <button onClick={onOpenChapters}>Manage chapters</button>
        )}
        <button
          className="ws-primary"
          disabled={busy || saving || dirty || !chapter}
          onClick={onReviewRelease}
        >
          {project.live ? 'Review update' : 'Review release'}
        </button>
        <button
          disabled={busy || saving || dirty || !chapter}
          title={
            dirty ? 'Save your draft before creating a revision.' : undefined
          }
          onClick={onCreateRevision}
        >
          Create revision
        </button>
        {project.kind === 'book' && (
          <label>
            Book title
            <input
              value={fields.title}
              onChange={(event) => onUpdateMeta({ title: event.target.value })}
            />
          </label>
        )}
        <label>
          URL slug
          <input
            value={fields.slug}
            onChange={(event) => onUpdateMeta({ slug: event.target.value })}
          />
        </label>
        <label>
          Summary
          <textarea
            value={fields.summary}
            onChange={(event) => onUpdateMeta({ summary: event.target.value })}
          />
        </label>
        <label>
          Tags
          <input
            value={tagText ?? fields.tags.join(', ')}
            onChange={(event) => onTagsChange(event.target.value)}
          />
        </label>
        <label>
          Cover image
          <select
            value={fields.coverAssetId ?? ''}
            onChange={(event) =>
              onUpdateMeta({ coverAssetId: event.target.value || null })
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
                onUpdateMeta({ seoTitle: event.target.value })
              }
            />
          </label>
          <label>
            Search description
            <textarea
              value={fields.seoDescription}
              onChange={(event) =>
                onUpdateMeta({ seoDescription: event.target.value })
              }
            />
          </label>
        </details>
        {chapter && (
          <details>
            <summary>Revision checkpoints</summary>
            {chapter.revisions
              .slice()
              .reverse()
              .map((item) => (
                <button
                  key={item.number}
                  disabled={dirty || saving || busy}
                  onClick={() => onRestore(item.number)}
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
            <button disabled={dirty || saving || busy} onClick={onWithdraw}>
              Withdraw publication
            </button>
          )}
        </details>
        <p>Scheduled publishing is not configured.</p>
      </div>
    </details>
  );
}

type ChapterDialogProps = {
  dialog: DialogRef;
  source: StudioDocument[];
  chapter: StudioDocument | null;
  dirty: boolean;
  saving: boolean;
  busy: boolean;
  onSelect(id: string): void;
  onMoveUp(index: number): void;
  onAdd(): void;
};

export function ChapterDialog({
  dialog,
  source,
  chapter,
  dirty,
  saving,
  busy,
  onSelect,
  onMoveUp,
  onAdd,
}: ChapterDialogProps) {
  return (
    <dialog className="zen-panel ws-dialog" ref={dialog}>
      <div className="zen-panel-heading">
        <h2>Chapters</h2>
        <button onClick={() => dialog.current?.close()}>Close</button>
      </div>
      <div className="zen-panel-content">
        {source.map((item, index) => (
          <div className="zen-chapter-row" key={item.id}>
            <button
              aria-pressed={item.id === chapter?.id}
              onClick={() => {
                onSelect(item.id);
                dialog.current?.close();
              }}
            >
              {index + 1}. {item.title}
            </button>
            <button
              disabled={dirty || saving || busy || index === 0}
              onClick={() => onMoveUp(index)}
            >
              Up
            </button>
          </div>
        ))}
        <button disabled={dirty || saving || busy} onClick={onAdd}>
          Add chapter
        </button>
      </div>
    </dialog>
  );
}

type ReleaseDialogProps = {
  dialog: DialogRef;
  project: Publication;
  fields: PublicationFields;
  audience?: 'owner' | 'guest';
  publicationAt: string;
  timezone: string;
  reviewed: ReviewedRevision | null;
  message: string;
  saving: boolean;
  dirty: boolean;
  busy: boolean;
  onClose(): void;
  onPublicationAtChange(value: string): void;
  onTimezoneChange(value: string): void;
  onReview(): void;
  onPublish(): void;
};

export function ReleaseDialog({
  dialog,
  project,
  fields,
  audience,
  publicationAt,
  timezone,
  reviewed,
  message,
  saving,
  dirty,
  busy,
  onClose,
  onPublicationAtChange,
  onTimezoneChange,
  onReview,
  onPublish,
}: ReleaseDialogProps) {
  return (
    <dialog className="ws-dialog" ref={dialog}>
      <h2>{project.live ? 'Update publication?' : 'Publish this work?'}</h2>
      <p>{fields.title}</p>
      <p>
        {audience === 'guest'
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
          onChange={(event) => onPublicationAtChange(event.target.value)}
        />
      </label>
      <label>
        Publication timezone
        <input
          value={timezone}
          onChange={(event) => onTimezoneChange(event.target.value)}
        />
      </label>
      {reviewed && reviewed.version === project.version && (
        <section
          className="studio-review-preview"
          aria-label="Saved revision preview"
        >
          <h3>Saved revision preview</h3>
          {reviewed.chapters.map((item, index) => (
            <section key={index}>
              <h4>
                {item.title} / Revision {reviewed.revision}
              </h4>
              <MarkdownPreview assets={reviewed.assets} value={item.body} />
            </section>
          ))}
        </section>
      )}
      <div className="studio-actions">
        <button disabled={saving} onClick={onClose}>
          Cancel
        </button>
        <button
          className="ws-primary"
          disabled={
            dirty || saving || busy || reviewed?.version === project.version
          }
          onClick={onReview}
        >
          {saving ? 'Reviewing...' : 'Review saved revision'}
        </button>
        <button
          className="ws-primary"
          disabled={
            dirty ||
            saving ||
            busy ||
            !reviewed ||
            reviewed.version !== project.version
          }
          onClick={onPublish}
        >
          {saving ? 'Publishing...' : 'Publish reviewed revision'}
        </button>
      </div>
    </dialog>
  );
}
