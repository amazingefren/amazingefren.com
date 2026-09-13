import type {
  Command,
  Publication,
  Result,
  Snapshot,
  StudioDocument,
  StudioState,
} from '../../../contracts/writing/index.ts';
import {
  beginPublicationDraft,
  checkpointPublication,
  publicationRevision,
} from '../revisions.ts';
import { buildSnapshot } from './snapshot.ts';
import {
  clone,
  conflict,
  documentById,
  invalid,
  requirePublication,
  slugify,
  success,
  type GuestMutationContext,
} from './state.ts';
import { publicationTime, publicationTimezone } from './time.ts';

type CreateInput = Extract<
  Command,
  { operation: 'publishing.projects.create' }
>['input'];
type UpdateInput = Extract<
  Command,
  { operation: 'publishing.projects.update' }
>['input'];
type ChapterInput = Extract<
  Command,
  { operation: 'publishing.projects.add-chapter' }
>['input'];
type ReorderInput = Extract<
  Command,
  { operation: 'publishing.projects.reorder' }
>['input'];
type PublishInput = Extract<
  Command,
  { operation: 'publishing.projects.publish' }
>['input'];
type ScheduleInput = Extract<
  Command,
  { operation: 'publishing.projects.schedule' }
>['input'];
type ExpectedVersionInput = Extract<
  Command,
  { operation: 'publishing.projects.cancel-schedule' }
>['input'];

export function createPublication(
  state: StudioState,
  input: CreateInput,
  context: GuestMutationContext,
): Result<void> {
  const title = input.title.trim();
  if (!title) return invalid('Publication title is required.');

  const baseSlug = slugify(title);
  const slug = state.publications.some((item) => item.slug === baseSlug)
    ? `${baseSlug}-${state.publications.length + 1}`
    : baseSlug;
  const source = input.sourceId ? documentById(state, input.sourceId) : null;
  if (input.sourceId && (!source || source.kind === 'manuscript'))
    return invalid('Choose an existing source note.');

  const chapterIds: string[] = [];
  if (input.kind !== 'book' || source) {
    const manuscript: StudioDocument = {
      id: context.createId('manuscript'),
      kind: 'manuscript',
      title,
      body: source?.body ?? '',
      tags: [],
      collection: '',
      pinned: false,
      archived: false,
      revision: 1,
      updatedAt: context.changedAt,
      revisions: [],
    };
    state.documents.push(manuscript);
    chapterIds.push(manuscript.id);
  }

  state.publications.push({
    id: context.createId('publication'),
    revision: 1,
    kind: input.kind,
    title,
    slug,
    summary: '',
    tags: [],
    seoTitle: '',
    seoDescription: '',
    coverAssetId: null,
    chapterIds,
    stage: 'draft',
    version: 1,
    updatedAt: context.changedAt,
    scheduledAt: null,
    live: null,
    releases: [],
    sourceId: input.sourceId ?? null,
  });
  return success<void>(undefined);
}

export function updatePublication(
  state: StudioState,
  input: UpdateInput,
  changedAt: string,
): Result<void> {
  const found = requirePublication(state, input.id, input.expectedVersion);
  if (!found.ok) return found;
  if (samePublicationFields(found.value, input.fields))
    return success<void>(undefined);
  if (!input.fields.title.trim() || !input.fields.slug.trim())
    return invalid('Publication title and slug are required.');
  if (found.value.releases.length > 0 && input.fields.slug !== found.value.slug)
    return invalid('A released publication slug cannot change.');

  beginPublicationDraft(found.value);
  Object.assign(found.value, clone(input.fields), {
    version: found.value.version + 1,
    updatedAt: changedAt,
    stage: 'draft',
    scheduledAt: null,
  });
  return success<void>(undefined);
}

export function addChapter(
  state: StudioState,
  input: ChapterInput,
  changedAt: string,
  createId: GuestMutationContext['createId'],
): Result<void> {
  const found = requirePublication(state, input.id, input.expectedVersion);
  if (!found.ok) return found;
  if (found.value.kind !== 'book')
    return invalid('Only books have multiple chapters.');
  if (!input.title.trim()) return invalid('Chapter title is required.');

  const chapter: StudioDocument = {
    id: createId('document'),
    kind: 'manuscript',
    title: input.title,
    body: '',
    tags: [],
    collection: '',
    pinned: false,
    archived: false,
    revision: 0,
    updatedAt: changedAt,
    revisions: [],
  };
  state.documents.push(chapter);
  beginPublicationDraft(found.value);
  found.value.chapterIds.push(chapter.id);
  found.value.version += 1;
  found.value.stage = 'draft';
  found.value.scheduledAt = null;
  found.value.updatedAt = changedAt;
  return success<void>(undefined);
}

export function reorderChapters(
  state: StudioState,
  input: ReorderInput,
  changedAt: string,
): Result<void> {
  const found = requirePublication(state, input.id, input.expectedVersion);
  if (!found.ok) return found;
  if (found.value.kind !== 'book')
    return invalid('Only books have ordered chapters.');

  beginPublicationDraft(found.value);
  found.value.scheduledAt = null;
  if (!sameChapterIds(found.value.chapterIds, input.chapterIds))
    return invalid(
      'Chapter order must contain each existing chapter exactly once.',
    );
  found.value.chapterIds = [...input.chapterIds];
  found.value.version += 1;
  found.value.updatedAt = changedAt;
  return success<void>(undefined);
}

export function reviewPublication(
  state: StudioState,
  input: Extract<Command, { operation: 'publishing.projects.review' }>['input'],
  context: GuestMutationContext,
): Result<void> {
  const found = requirePublication(state, input.id, input.expectedVersion);
  if (!found.ok) return found;
  if (found.value.stage === 'published')
    return invalid(
      'Create a draft revision before reviewing a live publication.',
    );

  const reviewed = buildSnapshot(
    state,
    found.value,
    context.changedAt,
    undefined,
    () => context.createId('snapshot'),
  );
  if (!reviewed.ok) return reviewed;
  checkpointPublication(state, found.value, context.changedAt);
  found.value.stage = 'review';
  found.value.scheduledAt = null;
  found.value.version += 1;
  found.value.updatedAt = context.changedAt;
  return success<void>(undefined);
}

export function createPublicationRevision(
  state: StudioState,
  input: Extract<
    Command,
    { operation: 'publishing.projects.create-revision' }
  >['input'],
  changedAt: string,
): Result<void> {
  const found = requirePublication(state, input.id, input.expectedVersion);
  if (!found.ok) return found;
  if (found.value.stage !== 'published')
    checkpointPublication(state, found.value, changedAt);
  found.value.revision = publicationRevision(found.value) + 1;
  found.value.stage = 'draft';
  found.value.scheduledAt = null;
  found.value.version++;
  found.value.updatedAt = changedAt;
  return success<void>(undefined);
}

export function publishPublication(
  state: StudioState,
  input: PublishInput,
  context: GuestMutationContext,
): Result<void> {
  const found = requirePublication(state, input.id, input.expectedVersion);
  if (!found.ok) return found;
  if (found.value.stage !== 'review')
    return invalid('Review this publication before publishing.');

  const publicationAt = publicationTime(input.publicationAt, context.changedAt);
  if (!publicationAt)
    return invalid('Publication time is invalid or in the future.');
  const timezone = publicationTimezone(input.timezone);
  if (!timezone) return invalid('Publication timezone is invalid.');

  const firstRelease = found.value.releases.reduce<Snapshot | null>(
    (earliest, release) =>
      !earliest ||
      Date.parse(release.publishedAt) < Date.parse(earliest.publishedAt)
        ? release
        : earliest,
    null,
  );
  if (
    firstRelease &&
    Date.parse(publicationAt) < Date.parse(firstRelease.publishedAt)
  )
    return invalid('Publication updates cannot predate the original release.');

  const released = buildSnapshot(
    state,
    found.value,
    firstRelease?.publishedAt ?? publicationAt,
    firstRelease?.timezone ?? timezone,
    () => context.createId('snapshot'),
  );
  if (!released.ok) return released;
  if (firstRelease) released.value.updatedAt = publicationAt;
  found.value.live = released.value;
  found.value.releases.push(released.value);
  found.value.stage = 'published';
  found.value.scheduledAt = null;
  found.value.version += 1;
  found.value.updatedAt = context.changedAt;
  return success<void>(undefined);
}

export function schedulePublication(
  state: StudioState,
  input: ScheduleInput,
  changedAt: string,
): Result<void> {
  const found = requirePublication(state, input.id, input.expectedVersion);
  if (!found.ok) return found;
  if (Number.isNaN(Date.parse(input.scheduledAt)))
    return invalid('Scheduled time must be a date.');
  found.value.stage = 'scheduled';
  found.value.scheduledAt = input.scheduledAt;
  found.value.version += 1;
  found.value.updatedAt = changedAt;
  return success<void>(undefined);
}

export function cancelPublicationSchedule(
  state: StudioState,
  input: ExpectedVersionInput,
  changedAt: string,
): Result<void> {
  const found = requirePublication(state, input.id, input.expectedVersion);
  if (!found.ok) return found;
  if (found.value.stage !== 'scheduled')
    return conflict('Publication project is not scheduled.');
  found.value.stage = 'draft';
  found.value.scheduledAt = null;
  found.value.version += 1;
  found.value.updatedAt = changedAt;
  return success<void>(undefined);
}

export function withdrawPublication(
  state: StudioState,
  input: Extract<
    Command,
    { operation: 'publishing.projects.withdraw' }
  >['input'],
  changedAt: string,
): Result<void> {
  const found = requirePublication(state, input.id, input.expectedVersion);
  if (!found.ok) return found;
  found.value.stage = 'draft';
  found.value.live = null;
  found.value.scheduledAt = null;
  found.value.version += 1;
  found.value.updatedAt = changedAt;
  return success<void>(undefined);
}

function samePublicationFields(
  publication: Publication,
  fields: UpdateInput['fields'],
): boolean {
  return Object.entries(fields).every(
    ([key, value]) =>
      JSON.stringify(publication[key as keyof Publication]) ===
      JSON.stringify(value),
  );
}

function sameChapterIds(existing: string[], proposed: string[]): boolean {
  return (
    proposed.length === existing.length &&
    new Set(proposed).size === proposed.length &&
    proposed.every((chapterId) => existing.includes(chapterId))
  );
}
