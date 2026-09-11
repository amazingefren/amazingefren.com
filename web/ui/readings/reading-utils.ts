import type { Snapshot } from '../../../contracts/writing/index.ts';

export function filterReadings(snapshots: Snapshot[], query = '', tag = '') {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return [...snapshots]
    .filter((snapshot) => {
      const text = [snapshot.title, snapshot.summary, ...snapshot.tags]
        .join(' ')
        .toLocaleLowerCase();
      return (
        (!normalizedQuery || text.includes(normalizedQuery)) &&
        (!tag || snapshot.tags.includes(tag))
      );
    })
    .sort(
      (left, right) =>
        right.publishedAt.localeCompare(left.publishedAt) ||
        left.id.localeCompare(right.id),
    );
}

export function readingStats(snapshot: Snapshot) {
  const words = snapshot.chapters.reduce((total, chapter) => {
    const plain = chapter.body
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[`*_>#~-]/g, ' ');
    return total + (plain.match(/[\p{L}\p{N}]+/gu) ?? []).length;
  }, 0);
  return { words, minutes: Math.max(1, Math.ceil(words / 220)) };
}
