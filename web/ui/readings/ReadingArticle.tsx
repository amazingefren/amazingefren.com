import type { Snapshot } from '../../../contracts/writing/index.ts';
import type { ReactNode } from 'react';
import { ReadingMeta } from './ReadingList.tsx';
import { formatPublicationDate } from '../../../publishing/projects/dates.ts';

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
            <span>
              Published{' '}
              <time dateTime={snapshot.publishedAt}>
                {formatPublicationDate(snapshot.publishedAt, snapshot.timezone)}
              </time>
            </span>
            {snapshot.updatedAt && (
              <span>
                Updated{' '}
                <time dateTime={snapshot.updatedAt}>
                  {formatPublicationDate(snapshot.updatedAt, snapshot.timezone)}
                </time>
              </span>
            )}
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
