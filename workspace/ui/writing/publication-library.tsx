import type { FormEvent, RefObject } from 'react';
import type {
  Publication,
  StudioState,
} from '../../../contracts/writing/index.ts';

type DialogRef = RefObject<HTMLDialogElement | null>;
export type PublicationFilter = 'all' | 'drafts' | 'published';

const stamp = (value: string) => new Date(value).toLocaleDateString();

type CreatePublicationDialogProps = {
  dialog: DialogRef;
  busy: boolean;
  onSubmit(event: FormEvent<HTMLFormElement>): void | Promise<void>;
};

export function CreatePublicationDialog({
  dialog,
  busy,
  onSubmit,
}: CreatePublicationDialogProps) {
  return (
    <dialog className="ws-dialog" ref={dialog}>
      <form onSubmit={onSubmit}>
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
          <button type="button" onClick={() => dialog.current?.close()}>
            Cancel
          </button>
          <button className="ws-primary" disabled={busy}>
            Create
          </button>
        </div>
      </form>
    </dialog>
  );
}

type PublicationLibraryProps = {
  state: StudioState;
  busy: boolean;
  filter: PublicationFilter;
  query: string;
  message: string;
  createDialog: DialogRef;
  onFilterChange(value: PublicationFilter): void;
  onQueryChange(value: string): void;
  onOpenCreate(): void;
  onSelect(id: string): void;
  onCreate(event: FormEvent<HTMLFormElement>): void | Promise<void>;
};

export function PublicationLibrary({
  state,
  busy,
  filter,
  query,
  message,
  createDialog,
  onFilterChange,
  onQueryChange,
  onOpenCreate,
  onSelect,
  onCreate,
}: PublicationLibraryProps) {
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
        <button className="ws-primary" disabled={busy} onClick={onOpenCreate}>
          New publication
        </button>
      </header>
      {message && <p role="alert">{message}</p>}
      <div className="publication-filters">
        <nav aria-label="Publication status">
          {(
            [
              ['all', 'All'],
              ['drafts', 'Drafts'],
              ['published', 'Published'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => onFilterChange(value)}
            >
              {label}
            </button>
          ))}
        </nav>
        <input
          aria-label="Search publications"
          placeholder="Find a publication..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
      <div className="publication-rows">
        {publications.map((item) => (
          <button key={item.id} onClick={() => onSelect(item.id)}>
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
      <CreatePublicationDialog
        dialog={createDialog}
        busy={busy}
        onSubmit={onCreate}
      />
    </section>
  );
}

type PublicationRailProps = {
  state: StudioState;
  project: Publication;
  busy: boolean;
  saving: boolean;
  onOpenCreate(): void;
  onSelect(id: string): void;
  onAllPublications(): void;
};

export function PublicationRail({
  state,
  project,
  busy,
  saving,
  onOpenCreate,
  onSelect,
  onAllPublications,
}: PublicationRailProps) {
  return (
    <aside className="publication-rail" aria-label="Publication library">
      <div className="publication-rail-heading">
        <span>Library</span>
        <button
          aria-label="New publication"
          disabled={busy || saving}
          onClick={onOpenCreate}
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
            onClick={() => onSelect(item.id)}
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
      <button className="publication-library-link" onClick={onAllPublications}>
        All publications
      </button>
    </aside>
  );
}
