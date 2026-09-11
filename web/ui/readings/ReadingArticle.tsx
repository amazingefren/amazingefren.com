import type { Snapshot } from '../../../contracts/writing/index.ts';
import type { ReactNode } from 'react';
import { ReadingMeta } from './ReadingList.tsx';

export function ReadingArticle({
  snapshot,
  children,
}: {
  snapshot: Snapshot;
  children: ReactNode;
}) {
  return (
    <div className="reader-layout">
      <aside className="reader-aside">
        <a href="/readings">← All readings</a>
        {snapshot.chapters.length > 1 && (
          <nav aria-label="Chapters">
            <span className="eyebrow">IN THIS READING</span>
            {snapshot.chapters.map((chapter, index) => (
              <a key={chapter.documentId} href={`#chapter-${index + 1}`}>
                {String(index + 1).padStart(2, '0')} {chapter.title}
              </a>
            ))}
          </nav>
        )}
      </aside>
      <article className="reader">
        <header>
          <p className="eyebrow">
            {snapshot.kind.toUpperCase()} / PUBLISHED READING
          </p>
          <h1>{snapshot.title}</h1>
          <p className="reader-deck">{snapshot.summary}</p>
          <div className="reader-byline">
            <time dateTime={snapshot.publishedAt}>
              {formatDate(snapshot.publishedAt)}
            </time>
            <ReadingMeta snapshot={snapshot} />
          </div>
        </header>
        {children}
        <footer className="reader-footer">
          <div>
            <span>Published revision {snapshot.projectVersion}</span>
            <span>·</span>
            <span>
              {snapshot.chapters.length}{' '}
              {snapshot.chapters.length === 1 ? 'section' : 'sections'}
            </span>
          </div>
          <nav aria-label="Reading downloads">
            <a href={`/readings/${snapshot.slug}/download.md`}>
              Download Markdown
            </a>
            <a href={`/api/publications/${snapshot.slug}`}>JSON</a>
          </nav>
        </footer>
      </article>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value.slice(0, 10)
    : new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        dateStyle: 'medium',
      }).format(date);
}
