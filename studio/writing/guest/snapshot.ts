import type {
  Publication,
  Result,
  Snapshot,
  StudioState,
} from '../../../contracts/writing/index.ts';
import { publicationRevision } from '../revisions.ts';
import { documentById, invalid, missing, success } from './state.ts';

export function buildSnapshot(
  state: StudioState,
  publication: Publication,
  publishedAt: string,
  timezone: string | undefined,
  createSnapshotId: () => string,
): Result<Snapshot> {
  const chapters: Snapshot['chapters'] = [];
  for (const documentId of publication.chapterIds) {
    const chapter = documentById(state, documentId);
    if (!chapter) return missing('Publication chapter does not exist.');
    chapters.push({
      documentId: chapter.id,
      revision: chapter.revision,
      title: chapter.title,
      body: chapter.body,
    });
  }
  if (
    !chapters.length ||
    (publication.kind !== 'book' && chapters.length !== 1)
  )
    return invalid('A publication needs its manuscripts.');

  const assetIds = new Set<string>(
    publication.coverAssetId ? [publication.coverAssetId] : [],
  );
  for (const chapter of chapters) {
    const images = [
      ...chapter.body.matchAll(/!\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)/g),
    ];
    if (images.length !== (chapter.body.match(/!\[/g)?.length ?? 0))
      return invalid('Use explicit local image links.');
    for (const image of images) {
      if (!/^asset:[a-zA-Z0-9_-]+$/.test(image[1]))
        return invalid('Use local images.');
      assetIds.add(image[1].slice(6));
    }
  }

  const assets = state.assets.filter((asset) => assetIds.has(asset.id));
  if (
    assets.length !== assetIds.size ||
    assets.some((asset) => !asset.alt.trim() || !asset.rights.trim())
  )
    return invalid('Images need valid references, alt text, and rights.');

  return success({
    id: createSnapshotId(),
    revision: publicationRevision(publication),
    publishedAt,
    ...(timezone ? { timezone } : {}),
    title: publication.title,
    slug: publication.slug,
    summary: publication.summary,
    kind: publication.kind,
    seoTitle: publication.seoTitle,
    seoDescription: publication.seoDescription,
    tags: [...publication.tags],
    coverAssetId: publication.coverAssetId,
    chapters,
    assets,
    projectVersion: publication.version,
  });
}
