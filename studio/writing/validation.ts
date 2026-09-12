import type {
  Asset,
  Publication,
  Snapshot,
  StudioDocument,
  StudioState,
} from '../../contracts/writing/index.ts';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);
const hasOnly = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).every((key) => keys.includes(key)) &&
  keys.every((key) => key in value);
const hasRequiredAndOptional = (
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
) =>
  Object.keys(value).every((key) => [...required, ...optional].includes(key)) &&
  required.every((key) => key in value);
const isSource = (value: unknown): boolean =>
  isRecord(value) &&
  hasRequiredAndOptional(
    value,
    ['format', 'text', 'exportProfileVersion'],
    ['sourceHash'],
  ) &&
  value.format === 'org' &&
  isString(value.text) &&
  isString(value.exportProfileVersion) &&
  (value.sourceHash === undefined || isString(value.sourceHash));
const isIsoDate = (value: unknown): value is string =>
  isString(value) && !Number.isNaN(Date.parse(value));

const isAsset = (value: unknown): value is Asset =>
  isRecord(value) &&
  hasOnly(value, [
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
  ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(
    value.mime as string,
  ) &&
  isString(value.dataUrl) &&
  isString(value.alt) &&
  isString(value.caption) &&
  isString(value.rights);

const isDocument = (value: unknown): value is StudioDocument =>
  isRecord(value) &&
  hasRequiredAndOptional(
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
  ['note', 'document', 'manuscript'].includes(value.kind as string) &&
  isString(value.title) &&
  isString(value.body) &&
  isStringArray(value.tags) &&
  isString(value.collection) &&
  typeof value.pinned === 'boolean' &&
  typeof value.archived === 'boolean' &&
  isNumber(value.revision) &&
  isIsoDate(value.updatedAt) &&
  Array.isArray(value.revisions) &&
  value.revisions.every(
    (revision) =>
      isRecord(revision) &&
      hasRequiredAndOptional(
        revision,
        ['number', 'title', 'body', 'savedAt'],
        ['source'],
      ) &&
      isNumber(revision.number) &&
      isString(revision.title) &&
      isString(revision.body) &&
      isIsoDate(revision.savedAt) &&
      (revision.source === undefined || isSource(revision.source)),
  ) &&
  (value.source === undefined || isSource(value.source));

export const isSnapshot = (value: unknown): value is Snapshot =>
  isRecord(value) &&
  hasRequiredAndOptional(
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
    ['updatedAt', 'timezone'],
  ) &&
  isString(value.id) &&
  isIsoDate(value.publishedAt) &&
  (value.updatedAt === undefined ||
    value.updatedAt === null ||
    isIsoDate(value.updatedAt)) &&
  (value.timezone === undefined || isString(value.timezone)) &&
  isString(value.title) &&
  isString(value.slug) &&
  isString(value.summary) &&
  ['article', 'page', 'book'].includes(value.kind as string) &&
  isString(value.seoTitle) &&
  isString(value.seoDescription) &&
  isStringArray(value.tags) &&
  (value.coverAssetId === null || isString(value.coverAssetId)) &&
  isNumber(value.projectVersion) &&
  Array.isArray(value.assets) &&
  value.assets.every(isAsset) &&
  Array.isArray(value.chapters) &&
  value.chapters.every(
    (chapter) =>
      isRecord(chapter) &&
      hasOnly(chapter, ['documentId', 'revision', 'title', 'body']) &&
      isString(chapter.documentId) &&
      isNumber(chapter.revision) &&
      isString(chapter.title) &&
      isString(chapter.body),
  );

const isPublication = (value: unknown): value is Publication =>
  isRecord(value) &&
  hasOnly(value, [
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
  ]) &&
  isString(value.id) &&
  ['article', 'page', 'book'].includes(value.kind as string) &&
  isString(value.title) &&
  isString(value.slug) &&
  isString(value.summary) &&
  isStringArray(value.tags) &&
  isString(value.seoTitle) &&
  isString(value.seoDescription) &&
  (value.coverAssetId === null || isString(value.coverAssetId)) &&
  isStringArray(value.chapterIds) &&
  ['draft', 'review', 'scheduled', 'published'].includes(
    value.stage as string,
  ) &&
  isNumber(value.version) &&
  isIsoDate(value.updatedAt) &&
  (value.scheduledAt === null || isIsoDate(value.scheduledAt)) &&
  (value.live === null || isSnapshot(value.live)) &&
  Array.isArray(value.releases) &&
  value.releases.every(isSnapshot) &&
  (value.sourceId === null || isString(value.sourceId));

export const isStudioState = (value: unknown): value is StudioState =>
  isRecord(value) &&
  hasOnly(value, [
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
