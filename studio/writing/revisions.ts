import type {
  Publication,
  StudioState,
} from '../../contracts/writing/index.ts';

export function publicationRevision(project: Publication): number {
  if (project.revision !== undefined) return project.revision;
  const released = project.releases.reduce(
    (latest, release, index) => Math.max(latest, release.revision ?? index + 1),
    0,
  );
  return Math.max(1, released + (project.stage === 'published' ? 0 : 1));
}

export function beginPublicationDraft(project: Publication): void {
  const current = publicationRevision(project);
  project.revision = current + (project.stage === 'published' ? 1 : 0);
  project.stage = 'draft';
  project.scheduledAt = null;
}

export function checkpointPublication(
  state: StudioState,
  project: Publication,
  savedAt: string,
): void {
  const number = publicationRevision(project);
  project.revision = number;
  for (const documentId of project.chapterIds) {
    const document = state.documents.find((entry) => entry.id === documentId);
    if (!document) continue;
    const checkpoint = {
      number,
      title: document.title,
      body: document.body,
      savedAt,
      ...(document.source ? { source: { ...document.source } } : {}),
    };
    const existing = document.revisions.findIndex(
      (entry) => entry.number === number,
    );
    if (existing < 0) document.revisions.push(checkpoint);
    else document.revisions[existing] = checkpoint;
  }
}
