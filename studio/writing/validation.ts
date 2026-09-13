import type {
  Asset,
  Snapshot,
  StudioDocument,
  StudioState,
} from '../../contracts/writing/index.ts';

const DOCUMENT_KINDS = ['note', 'document', 'manuscript'] as const;
const PUBLICATION_KINDS = ['article', 'page', 'book'] as const;
const STAGES = ['draft', 'review', 'scheduled', 'published'] as const;
const ASSET_MIMES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);

const hasKeys = (
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean => {
  const allowed = new Set([...required, ...optional]);
  return (
    Object.keys(value).every((key) => allowed.has(key)) &&
    required.every((key) => key in value)
  );
};

const hasExactly = (
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean =>
  Object.keys(value).every((key) => keys.includes(key)) &&
  keys.every((key) => key in value);

const isSource = (value: unknown): boolean =>
  isRecord(value) &&
  hasKeys(value, ['format', 'text', 'exportProfileVersion'], ['sourceHash']) &&
  value.format === 'org' &&
  isString(value.text) &&
  isString(value.exportProfileVersion) &&
  (value.sourceHash === undefined || isString(value.sourceHash));

const isIsoDate = (value: unknown): value is string =>
  isString(value) && !Number.isNaN(Date.parse(value));

const isAssetMime = (value: unknown): value is Asset['mime'] =>
  ASSET_MIMES.includes(value as Asset['mime']);

const isDocumentKind = (value: unknown): value is StudioDocument['kind'] =>
  DOCUMENT_KINDS.includes(value as StudioDocument['kind']);

const isPublicationKind = (value: unknown): value is Snapshot['kind'] =>
  PUBLICATION_KINDS.includes(value as Snapshot['kind']);

const isStage = (value: unknown): boolean =>
  STAGES.includes(value as (typeof STAGES)[number]);

const isRevision = (value: unknown): boolean =>
  isRecord(value) &&
  hasKeys(value, ['number', 'title', 'body', 'savedAt'], ['source']) &&
  isNumber(value.number) &&
  isString(value.title) &&
  isString(value.body) &&
  isIsoDate(value.savedAt) &&
  (value.source === undefined || isSource(value.source));

const isAsset = (value: unknown): value is Asset =>
  isRecord(value) &&
  hasExactly(value, [
    'id',
    'name',
    'mime',
    'dataUrl',
    'alt',
    'caption',
    'rights',
  ]) &&
  isString(value.id) &&
  isString(value.name) &&
  isAssetMime(value.mime) &&
  isString(value.dataUrl) &&
  isString(value.alt) &&
  isString(value.caption) &&
  isString(value.rights);

const isDocument = (value: unknown): value is StudioDocument =>
  isRecord(value) &&
  hasKeys(
    value,
    [
      'id',
      'kind',
      'title',
      'body',
      'tags',
      'collection',
      'pinned',
      'archived',
      'revision',
      'updatedAt',
      'revisions',
    ],
    ['source'],
  ) &&
  isString(value.id) &&
  isDocumentKind(value.kind) &&
  isString(value.title) &&
  isString(value.body) &&
  isStringArray(value.tags) &&
  isString(value.collection) &&
  typeof value.pinned === 'boolean' &&
  typeof value.archived === 'boolean' &&
  isNumber(value.revision) &&
  isIsoDate(value.updatedAt) &&
  Array.isArray(value.revisions) &&
  value.revisions.every(isRevision) &&
  (value.source === undefined || isSource(value.source));

const isSnapshotChapter = (value: unknown): boolean =>
  isRecord(value) &&
  hasExactly(value, ['documentId', 'revision', 'title', 'body']) &&
  isString(value.documentId) &&
  isNumber(value.revision) &&
  isString(value.title) &&
  isString(value.body);

export const isSnapshot = (value: unknown): value is Snapshot =>
  isRecord(value) &&
  hasKeys(
    value,
    [
      'id',
      'publishedAt',
      'title',
      'slug',
      'summary',
      'kind',
      'seoTitle',
      'seoDescription',
      'tags',
      'coverAssetId',
      'chapters',
      'assets',
      'projectVersion',
    ],
    ['updatedAt', 'timezone', 'revision'],
  ) &&
  isString(value.id) &&
  (value.revision === undefined ||
    (isNumber(value.revision) && value.revision > 0)) &&
  isIsoDate(value.publishedAt) &&
  (value.updatedAt === undefined ||
    value.updatedAt === null ||
    isIsoDate(value.updatedAt)) &&
  (value.timezone === undefined || isString(value.timezone)) &&
  isString(value.title) &&
  isString(value.slug) &&
  isString(value.summary) &&
  isPublicationKind(value.kind) &&
  isString(value.seoTitle) &&
  isString(value.seoDescription) &&
  isStringArray(value.tags) &&
  (value.coverAssetId === null || isString(value.coverAssetId)) &&
  isNumber(value.projectVersion) &&
  Array.isArray(value.assets) &&
  value.assets.every(isAsset) &&
  Array.isArray(value.chapters) &&
  value.chapters.every(isSnapshotChapter);

const isPublication = (value: unknown): boolean =>
  isRecord(value) &&
  hasKeys(
    value,
    [
      'id',
      'kind',
      'title',
      'slug',
      'summary',
      'tags',
      'seoTitle',
      'seoDescription',
      'coverAssetId',
      'chapterIds',
      'stage',
      'version',
      'updatedAt',
      'scheduledAt',
      'live',
      'releases',
      'sourceId',
    ],
    ['revision'],
  ) &&
  isString(value.id) &&
  (value.revision === undefined ||
    (isNumber(value.revision) && value.revision > 0)) &&
  isPublicationKind(value.kind) &&
  isString(value.title) &&
  isString(value.slug) &&
  isString(value.summary) &&
  isStringArray(value.tags) &&
  isString(value.seoTitle) &&
  isString(value.seoDescription) &&
  (value.coverAssetId === null || isString(value.coverAssetId)) &&
  isStringArray(value.chapterIds) &&
  isStage(value.stage) &&
  isNumber(value.version) &&
  isIsoDate(value.updatedAt) &&
  (value.scheduledAt === null || isIsoDate(value.scheduledAt)) &&
  (value.live === null || isSnapshot(value.live)) &&
  Array.isArray(value.releases) &&
  value.releases.every(isSnapshot) &&
  (value.sourceId === null || isString(value.sourceId));

export const isStudioState = (value: unknown): value is StudioState =>
  isRecord(value) &&
  hasExactly(value, [
    'schemaVersion',
    'synthetic',
    'version',
    'documents',
    'publications',
    'assets',
  ]) &&
  value.schemaVersion === 1 &&
  typeof value.synthetic === 'boolean' &&
  isNumber(value.version) &&
  Array.isArray(value.documents) &&
  value.documents.every(isDocument) &&
  Array.isArray(value.publications) &&
  value.publications.every(isPublication) &&
  Array.isArray(value.assets) &&
  value.assets.every(isAsset);
