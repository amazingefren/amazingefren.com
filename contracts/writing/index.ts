export type DocumentKind = 'note' | 'document' | 'manuscript';
export type PublicationKind = 'article' | 'page' | 'book';
export type Stage = 'draft' | 'review' | 'scheduled' | 'published';
export type Revision = {
  number: number;
  title: string;
  body: string;
  savedAt: string;
  source?: DocumentSource;
};
export type DocumentSource = {
  format: 'org';
  text: string;
  exportProfileVersion: string;
  sourceHash?: string;
};
export type StudioDocument = {
  id: string;
  kind: DocumentKind;
  title: string;
  body: string;
  tags: string[];
  collection: string;
  pinned: boolean;
  archived: boolean;
  revision: number;
  updatedAt: string;
  revisions: Revision[];
  source?: DocumentSource;
};
export type Asset = {
  id: string;
  name: string;
  mime: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
  dataUrl: string;
  alt: string;
  caption: string;
  rights: string;
};
export type Snapshot = {
  id: string;
  publishedAt: string;
  updatedAt?: string | null;
  timezone?: string;
  title: string;
  slug: string;
  summary: string;
  kind: PublicationKind;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  coverAssetId: string | null;
  chapters: {
    documentId: string;
    revision: number;
    title: string;
    body: string;
  }[];
  assets: Asset[];
  projectVersion: number;
};
export type Publication = {
  id: string;
  kind: PublicationKind;
  title: string;
  slug: string;
  summary: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  coverAssetId: string | null;
  chapterIds: string[];
  stage: Stage;
  version: number;
  updatedAt: string;
  scheduledAt: string | null;
  live: Snapshot | null;
  releases: Snapshot[];
  sourceId: string | null;
};
export type StudioState = {
  schemaVersion: 1;
  synthetic: boolean;
  version: number;
  documents: StudioDocument[];
  publications: Publication[];
  assets: Asset[];
};
export type ErrorCode =
  'invalid' | 'missing' | 'conflict' | 'unavailable' | 'denied';
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: ErrorCode; message: string } };
export type PublicationFields = Pick<
  Publication,
  | 'title'
  | 'slug'
  | 'summary'
  | 'tags'
  | 'seoTitle'
  | 'seoDescription'
  | 'coverAssetId'
>;
export type Command =
  | { operation: 'studio.writing.read'; input: Record<string, never> }
  | {
      operation: 'studio.notes.create';
      input: {
        kind: 'note' | 'document';
        title: string;
        body?: string;
        collection?: string;
      };
    }
  | {
      operation: 'studio.notes.save';
      input: {
        id: string;
        expectedRevision: number;
        title: string;
        body: string;
        tags: string[];
        collection: string;
        pinned: boolean;
      };
    }
  | {
      operation: 'studio.notes.restore';
      input: { id: string; expectedRevision: number; revision: number };
    }
  | {
      operation: 'studio.notes.archive';
      input: { id: string; archived: boolean };
    }
  | {
      operation: 'publishing.projects.create';
      input: { kind: PublicationKind; title: string; sourceId?: string };
    }
  | {
      operation: 'publishing.projects.update';
      input: { id: string; expectedVersion: number; fields: PublicationFields };
    }
  | {
      operation: 'publishing.projects.add-chapter';
      input: { id: string; expectedVersion: number; title: string };
    }
  | {
      operation: 'publishing.projects.reorder';
      input: { id: string; expectedVersion: number; chapterIds: string[] };
    }
  | {
      operation: 'publishing.projects.review';
      input: { id: string; expectedVersion: number };
    }
  | {
      operation: 'publishing.projects.publish';
      input: {
        id: string;
        expectedVersion: number;
        publicationAt?: string;
        timezone?: string;
      };
    }
  | {
      operation: 'publishing.projects.schedule';
      input: { id: string; expectedVersion: number; scheduledAt: string };
    }
  | {
      operation: 'publishing.projects.cancel-schedule';
      input: { id: string; expectedVersion: number };
    }
  | {
      operation: 'publishing.projects.withdraw';
      input: { id: string; expectedVersion: number };
    }
  | { operation: 'studio.assets.add'; input: Omit<Asset, 'id'> }
  | {
      operation: 'studio.assets.update';
      input: { id: string; alt: string; caption: string; rights: string };
    }
  | { operation: 'studio.writing.reset'; input: Record<string, never> };
export type StudioPort = {
  read(): Promise<Result<StudioState>>;
  execute(command: Command): Promise<Result<StudioState>>;
};
export type StudioProps = {
  state: StudioState;
  execute(command: Command): Promise<Result<StudioState>>;
  navigate(section: 'documents' | 'publishing' | 'media', id?: string): void;
  recordId?: string;
  busy: boolean;
  audience?: 'owner' | 'guest';
  onDirtyChange?(dirty: boolean): void;
};
export type EditorProps = {
  value: string;
  onChange(value: string): void;
  onSave(): void;
  assets: Asset[];
  label?: string;
  readOnly?: boolean;
};

export type StoredWriting = { ownerId: string; state: StudioState };
export type WritingStoragePort = {
  read(ownerId: string): Promise<StudioState | null>;
  write(
    ownerId: string,
    expectedVersion: number,
    state: StudioState,
  ): Promise<Result<StudioState>>;
};
