import type { Snapshot } from '../../../contracts/writing/index.ts';

const origin = 'https://amazingefren.com';

export function publicationMarkdown(snapshot: Snapshot): string {
  const source = `# ${snapshot.title}\n\n${snapshot.chapters
    .map(
      (chapter) =>
        `${snapshot.kind === 'book' ? `## ${chapter.title}\n\n` : ''}${chapter.body}`,
    )
    .join('\n\n')}`;
  return source.replace(/asset:([a-zA-Z0-9_-]+)/g, (_, id: string) => {
    const asset = snapshot.assets.find((item) => item.id === id);
    const path = `/api/publications/assets/${snapshot.id}/${id}`;
    return asset &&
      /^[a-zA-Z0-9_-]+$/.test(snapshot.id) &&
      asset.dataUrl === path
      ? `${origin}${path}`
      : '';
  });
}

export function publicationFeed(
  snapshots: readonly Snapshot[],
  format: 'rss' | 'atom',
): string {
  const entries = snapshots
    .map((snapshot) => {
      const link = `${origin}/readings/${snapshot.slug}`;
      const source = publicationMarkdown(snapshot);
      const updated = snapshot.updatedAt ?? snapshot.publishedAt;
      if (format === 'atom')
        return `<entry><id>${xml(link)}</id><title>${xml(snapshot.title)}</title><link href="${xml(link)}"/><published>${xml(snapshot.publishedAt)}</published><updated>${xml(updated)}</updated><content type="text">${xml(source)}</content></entry>`;
      return `<item><guid isPermaLink="true">${xml(link)}</guid><title>${xml(snapshot.title)}</title><link>${xml(link)}</link><pubDate>${new Date(snapshot.publishedAt).toUTCString()}</pubDate><description>${xml(source)}</description></item>`;
    })
    .join('');
  const updated =
    snapshots
      .map((snapshot) => snapshot.updatedAt ?? snapshot.publishedAt)
      .sort()
      .at(-1) ?? '1970-01-01T00:00:00.000Z';
  return format === 'atom'
    ? `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><id>${origin}/readings</id><title>Readings</title><link href="${origin}/readings"/><link rel="self" href="${origin}/readings/atom.xml"/><updated>${xml(updated)}</updated><author><name>Efren Castro</name></author>${entries}</feed>`
    : `<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel><title>Readings</title><link>${origin}/readings</link><description>Published writing.</description>${entries}</channel></rss>`;
}

function xml(value: string): string {
  return value.replace(
    /[<>&"']/g,
    (character) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[character]!,
  );
}
