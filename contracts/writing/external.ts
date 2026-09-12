import type {
  Asset,
  DocumentSource,
  PublicationFields,
  PublicationKind,
  Stage,
} from './index.ts';

export type ExternalEnvelope<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      error: {
        code: 'invalid' | 'missing' | 'conflict' | 'unavailable' | 'denied';
        message: string;
      };
    };

export type ExternalChapter = {
  documentId: string;
  revision: number;
  title: string;
  sourceFormat: 'markdown' | 'org';
  sourceText: string;
  derivedMarkdown: string;
  exportProfileVersion?: string;
};

export type ExternalDraft = {
  id: string;
  metadata: PublicationFields;
  kind: PublicationKind;
  stage: Stage;
  projectVersion: number;
  chapters: ExternalChapter[];
  assets: Array<
    Pick<Asset, 'id' | 'name' | 'mime' | 'alt' | 'caption'> & {
      readPath: string;
    }
  >;
  publicReleaseSummary: {
    slug: string;
    publishedAt: string;
    updatedAt?: string | null;
    timezone?: string;
  } | null;
};

export type ExternalListItem = {
  id: string;
  title: string;
  kind: PublicationKind;
  stage: Stage;
  sourceFormat: 'markdown' | 'org';
  projectVersion: number;
};

export type ExternalList = {
  items: ExternalListItem[];
  nextCursor: string | null;
};
export type ExternalListInput = {
  cursor?: string;
  query?: string;
  limit?: number;
};
export type ExternalCreateInput = {
  idempotencyKey: string;
  title: string;
  kind: PublicationKind;
  sourceFormat: 'markdown' | 'org';
};
export type ExternalSaveChapter = {
  documentId: string;
  expectedRevision: number;
  title: string;
  sourceFormat: 'markdown' | 'org';
  sourceText: string;
  derivedMarkdown: string;
  exportProfileVersion?: string;
  sourceHash?: string;
};
export type ExternalSaveInput = {
  idempotencyKey: string;
  expectedProjectVersion: number;
  metadata: PublicationFields;
  chapters: ExternalSaveChapter[];
  assetReferences: string[];
};
export type ExternalUploadInput = {
  idempotencyKey: string;
  name: string;
  mime: Asset['mime'];
  dataUrl: string;
  alt: string;
  caption: string;
  rights: string;
};
export type ExternalClient = {
  id: string;
  name: string;
  expiresAt: string;
  createdAt: string;
};
export type ExternalClientCreateInput = { name: string; expiresAt: string };
export type ExternalDraftCredential = { ownerId: string; clientId: string };
export type ExternalSource =
  DocumentSource | { format: 'markdown'; text: string };
