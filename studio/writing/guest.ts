import type { Asset, Command, Publication, Result, Snapshot, StudioDocument, StudioPort, StudioState } from '../../contracts/writing/index.ts';
import { isStudioState } from './validation.ts';

const storageKey = 'ae-writing-guest-v1';
const unavailable = <T>(message: string): Result<T> => ({ ok: false, error: { code: 'unavailable', message } });
const invalid = <T>(message: string): Result<T> => ({ ok: false, error: { code: 'invalid', message } });
const missing = <T>(message: string): Result<T> => ({ ok: false, error: { code: 'missing', message } });
const conflict = <T>(message: string): Result<T> => ({ ok: false, error: { code: 'conflict', message } });
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
const emptyState = (): StudioState => ({ schemaVersion: 1, synthetic: true, version: 0, documents: [], publications: [], assets: [] });
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const ok = (state: StudioState): Result<StudioState> => ({ ok: true, value: state });
const slugify = (title: string) => title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'untitled';
const stateWith = (state: StudioState, change: (draft: StudioState) => Result<unknown>): Result<StudioState> => {
  const draft = clone(state);
  const result = change(draft);
  if (!result.ok) return result;
  draft.version += 1;
  return ok(draft);
};
const document = (state: StudioState, documentId: string) => state.documents.find((item) => item.id === documentId);
const project = (state: StudioState, projectId: string) => state.publications.find((item) => item.id === projectId);
const requireProject = (state: StudioState, projectId: string, expectedVersion: number): Result<Publication> => {
  const value = project(state, projectId);
  if (!value) return missing('Publication project does not exist.');
  if (value.version !== expectedVersion) return conflict('Publication project version does not match.');
  return { ok: true, value };
};
const snapshot = (state: StudioState, value: Publication): Result<Snapshot> => {
  const chapters: Snapshot['chapters'] = [];
  for (const documentId of value.chapterIds) {
    const chapter = document(state, documentId);
    if (!chapter) return missing('Publication chapter does not exist.');
    chapters.push({ documentId: chapter.id, revision: chapter.revision, title: chapter.title, body: chapter.body });
  }
  if (!chapters.length || (value.kind !== 'book' && chapters.length !== 1)) return invalid('A publication needs its manuscripts.');
  const assetIds = new Set<string>(value.coverAssetId ? [value.coverAssetId] : []);
  for (const chapter of chapters) {
    const images = [...chapter.body.matchAll(/!\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)/g)];
    if (images.length !== (chapter.body.match(/!\[/g)?.length ?? 0)) return invalid('Use explicit local image links.');
    for (const image of images) { if (!/^asset:[a-zA-Z0-9_-]+$/.test(image[1])) return invalid('Use local images.'); assetIds.add(image[1].slice(6)); }
  }
  const assets = state.assets.filter(asset => assetIds.has(asset.id));
  if (assets.length !== assetIds.size || assets.some(asset => !asset.alt.trim() || !asset.rights.trim())) return invalid('Images need valid references, alt text, and rights.');
  return { ok: true, value: { id: id('snapshot'), publishedAt: now(), title: value.title, slug: value.slug, summary: value.summary, kind: value.kind, seoTitle: value.seoTitle, seoDescription: value.seoDescription, tags: [...value.tags], coverAssetId: value.coverAssetId, chapters, assets, projectVersion: value.version } };
};

export const createGuestWritingPort = (storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): StudioPort => {
  const read = async (): Promise<Result<StudioState>> => {
    let raw: string | null;
    try { raw = storage.getItem(storageKey); } catch { return unavailable('Guest writing storage is unavailable.'); }
    if (raw === null) return ok(emptyState());
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isStudioState(parsed) || !parsed.synthetic) return unavailable('Guest writing storage is corrupt.');
      const manuscripts = new Set(parsed.publications.flatMap(item => item.chapterIds));
      parsed.documents.forEach(item => { if (manuscripts.has(item.id)) item.kind = 'manuscript'; });
      return ok(parsed);
    } catch { return unavailable('Guest writing storage is corrupt.'); }
  };
  const persist = (state: StudioState): Result<StudioState> => {
    if (!isStudioState(state) || !state.synthetic) return unavailable('Guest writing state is invalid.');
    try { storage.setItem(storageKey, JSON.stringify(state)); return ok(state); } catch { return unavailable('Guest writing storage cannot save changes.'); }
  };
  const execute = async (command: Command): Promise<Result<StudioState>> => {
    if (command.operation === 'studio.writing.reset') {
      try { storage.removeItem(storageKey); return ok(emptyState()); } catch { return unavailable('Guest writing storage cannot reset.'); }
    }
    const current = await read();
    if (!current.ok) return current;
    if (command.operation === 'studio.writing.read') return current;
    const next = stateWith(current.value, (state) => {
      const changedAt = now();
      switch (command.operation) {
        case 'studio.notes.create': {
          const title = command.input.title.trim();
          if (!title) return invalid('Document title is required.');
          const item: StudioDocument = { id: id('document'), kind: command.input.kind, title, body: command.input.body ?? '', tags: [], collection: command.input.collection ?? '', pinned: false, archived: false, revision: 0, updatedAt: changedAt, revisions: [] };
          state.documents.push(item); return { ok: true, value: undefined };
        }
        case 'studio.notes.save': {
          const item = document(state, command.input.id);
          if (!item) return missing('Document does not exist.');
          if (item.revision !== command.input.expectedRevision) return conflict('Document revision does not match.');
          if (!command.input.title.trim()) return invalid('Document title is required.');
          const revision = item.revision + 1;
          Object.assign(item, { title: command.input.title, body: command.input.body, tags: [...command.input.tags], collection: command.input.collection, pinned: command.input.pinned, revision, updatedAt: changedAt });
          invalidate(state, item.id, changedAt);
          item.revisions.push({ number: revision, title: item.title, body: item.body, savedAt: changedAt }); return { ok: true, value: undefined };
        }
        case 'studio.notes.restore': {
          const item = document(state, command.input.id);
          if (!item) return missing('Document does not exist.');
          if (item.revision !== command.input.expectedRevision) return conflict('Document revision does not match.');
          const revision = item.revisions.find((entry) => entry.number === command.input.revision);
          if (!revision) return missing('Document revision does not exist.');
          const number = item.revision + 1;
          Object.assign(item, { title: revision.title, body: revision.body, revision: number, updatedAt: changedAt });
          invalidate(state, item.id, changedAt);
          item.revisions.push({ number, title: item.title, body: item.body, savedAt: changedAt }); return { ok: true, value: undefined };
        }
        case 'studio.notes.archive': {
          const item = document(state, command.input.id);
          if (!item) return missing('Document does not exist.');
          if (item.kind === 'manuscript') return invalid('Manuscripts cannot be archived as notes.');
          item.archived = command.input.archived; item.updatedAt = changedAt; return { ok: true, value: undefined };
        }
        case 'studio.assets.add': {
          if (!command.input.name.trim() || !command.input.dataUrl.startsWith('data:')) return invalid('Asset name and data URL are required.');
          const asset: Asset = { id: id('asset'), ...command.input }; state.assets.push(asset); return { ok: true, value: undefined };
        }
        case 'studio.assets.update': {
          const asset = state.assets.find((item) => item.id === command.input.id);
          if (!asset) return missing('Asset does not exist.');
          state.publications.forEach(item => { if (item.coverAssetId === asset.id || item.chapterIds.some(chapterId => document(state, chapterId)?.body.includes('asset:' + asset.id))) { item.stage = 'draft'; item.version++; item.updatedAt = changedAt; item.scheduledAt = null; } });
          Object.assign(asset, command.input); return { ok: true, value: undefined };
        }
        case 'publishing.projects.create': {
          const title = command.input.title.trim();
          if (!title) return invalid('Publication title is required.');
          const baseSlug = slugify(title); const slug = state.publications.some((item) => item.slug === baseSlug) ? `${baseSlug}-${state.publications.length + 1}` : baseSlug;
          const source = command.input.sourceId ? document(state, command.input.sourceId) : null;
          if (command.input.sourceId && (!source || source.kind === 'manuscript')) return invalid('Choose an existing source note.');
          const chapterIds: string[] = [];
          if (command.input.kind !== 'book' || source) {
            const manuscript: StudioDocument = { id: id('manuscript'), kind: 'manuscript', title, body: source?.body ?? '', tags: [], collection: '', pinned: false, archived: false, revision: 1, updatedAt: changedAt, revisions: [] };
            state.documents.push(manuscript); chapterIds.push(manuscript.id);
          }
          state.publications.push({ id: id('publication'), kind: command.input.kind, title, slug, summary: '', tags: [], seoTitle: '', seoDescription: '', coverAssetId: null, chapterIds, stage: 'draft', version: 1, updatedAt: changedAt, scheduledAt: null, live: null, releases: [], sourceId: command.input.sourceId ?? null }); return { ok: true, value: undefined };
        }
        case 'publishing.projects.update': {
          const found = requireProject(state, command.input.id, command.input.expectedVersion); if (!found.ok) return found;
          if (!command.input.fields.title.trim() || !command.input.fields.slug.trim()) return invalid('Publication title and slug are required.');
          Object.assign(found.value, clone(command.input.fields), { version: found.value.version + 1, updatedAt: changedAt, stage: 'draft', scheduledAt: null }); return { ok: true, value: undefined };
        }
        case 'publishing.projects.add-chapter': {
          const found = requireProject(state, command.input.id, command.input.expectedVersion); if (!found.ok) return found;
          if (found.value.kind !== 'book') return invalid('Only books have multiple chapters.');
          if (!command.input.title.trim()) return invalid('Chapter title is required.');
          const chapter: StudioDocument = { id: id('document'), kind: 'manuscript', title: command.input.title, body: '', tags: [], collection: '', pinned: false, archived: false, revision: 0, updatedAt: changedAt, revisions: [] };
          state.documents.push(chapter); found.value.chapterIds.push(chapter.id); found.value.version += 1; found.value.stage = 'draft'; found.value.scheduledAt = null; found.value.updatedAt = changedAt; return { ok: true, value: undefined };
        }
        case 'publishing.projects.reorder': {
          const found = requireProject(state, command.input.id, command.input.expectedVersion); if (!found.ok) return found;
          if (found.value.kind !== 'book') return invalid('Only books have ordered chapters.');
          found.value.stage = 'draft'; found.value.scheduledAt = null;
          const existing = found.value.chapterIds; const proposed = command.input.chapterIds;
          if (proposed.length !== existing.length || new Set(proposed).size !== proposed.length || proposed.some((chapterId) => !existing.includes(chapterId))) return invalid('Chapter order must contain each existing chapter exactly once.');
          found.value.chapterIds = [...proposed]; found.value.version += 1; found.value.updatedAt = changedAt; return { ok: true, value: undefined };
        }
        case 'publishing.projects.review': {
          const found = requireProject(state, command.input.id, command.input.expectedVersion); if (!found.ok) return found;
          const reviewed = snapshot(state, found.value); if (!reviewed.ok) return reviewed;
          found.value.stage = 'review'; found.value.scheduledAt = null; found.value.version += 1; found.value.updatedAt = changedAt; return { ok: true, value: undefined };
        }
        case 'publishing.projects.publish': {
          const found = requireProject(state, command.input.id, command.input.expectedVersion); if (!found.ok) return found;
          if (found.value.stage !== 'review') return invalid('Review this publication before publishing.');
          const released = snapshot(state, found.value); if (!released.ok) return released;
          found.value.live = released.value; found.value.releases.push(released.value); found.value.stage = 'published'; found.value.scheduledAt = null; found.value.version += 1; found.value.updatedAt = changedAt; return { ok: true, value: undefined };
        }
        case 'publishing.projects.schedule': {
          const found = requireProject(state, command.input.id, command.input.expectedVersion); if (!found.ok) return found;
          if (Number.isNaN(Date.parse(command.input.scheduledAt))) return invalid('Scheduled time must be a date.');
          found.value.stage = 'scheduled'; found.value.scheduledAt = command.input.scheduledAt; found.value.version += 1; found.value.updatedAt = changedAt; return { ok: true, value: undefined };
        }
        case 'publishing.projects.cancel-schedule': {
          const found = requireProject(state, command.input.id, command.input.expectedVersion); if (!found.ok) return found;
          if (found.value.stage !== 'scheduled') return conflict('Publication project is not scheduled.');
          found.value.stage = 'draft'; found.value.scheduledAt = null; found.value.version += 1; found.value.updatedAt = changedAt; return { ok: true, value: undefined };
        }
        case 'publishing.projects.withdraw': {
          const found = requireProject(state, command.input.id, command.input.expectedVersion); if (!found.ok) return found;
          found.value.stage = 'draft'; found.value.live = null; found.value.scheduledAt = null; found.value.version += 1; found.value.updatedAt = changedAt; return { ok: true, value: undefined };
        }
      }
    });
    return next.ok ? persist(next.value) : next;
  };
  return { read, async execute(command) { try { return await execute(command); } catch { return invalid('The guest command is invalid.'); } } };
};

function invalidate(state: StudioState, documentId: string, at: string) { state.publications.filter(item => item.chapterIds.includes(documentId)).forEach(item => { item.version++; item.stage = 'draft'; item.updatedAt = at; item.scheduledAt = null; }); }
