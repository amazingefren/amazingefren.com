import type { Snapshot } from '../../../contracts/writing/index.ts';
import { filterReadings, readingStats } from './reading-utils.ts';
import { formatPublicationDate } from '../../../publishing/projects/dates.ts';

const kindLabel: Record<Snapshot['kind'], string> = {
  article: 'Article',
  page: 'Page',
  book: 'Book',
};

export function ReadingList({
  snapshots,
  query = '',
  tag = '',
}: {
  snapshots: Snapshot[];
  query?: string;
  tag?: string;
}) {
  const filtered = filterReadings(snapshots, query, tag);
  const latest = filtered[0];
  const archive = filtered.slice(1);
  const tags = [
    ...new Set(snapshots.flatMap((snapshot) => snapshot.tags)),
  ].sort();

  return (
    <>
      <section className="readings-intro">
        <div>
          <p className="eyebrow">READINGS / {snapshots.length} PUBLISHED</p>
          <h1>Readings.</h1>
        </div>
        <form className="reading-search" method="get" role="search">
          <label htmlFor="reading-search">Find a reading</label>
          <div>
            <input
              id="reading-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Title, topic, or phrase"
            />
            <button type="submit">Search</button>
          </div>
          {tags.length > 0 && (
            <label className="reading-filter">
              <span>Topic</span>
              <select name="tag" defaultValue={tag}>
                <option value="">All topics</option>
                {tags.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          )}
        </form>
      </section>

      {latest ? (
        <section className="reading-feature" aria-labelledby="latest-reading">
          <p className="eyebrow">LATEST READING</p>
          <div className="reading-feature-grid">
            <div>
              <p className="reading-kicker">
                {kindLabel[latest.kind]} <span aria-hidden="true">·</span>{' '}
                <time dateTime={latest.publishedAt}>
                  {formatPublicationDate(latest.publishedAt, latest.timezone)}
                </time>
              </p>
              <h2 id="latest-reading">
                <a href={`/readings/${latest.slug}`}>{latest.title}</a>
              </h2>
              <p className="reading-summary">{latest.summary}</p>
              <ReadingMeta snapshot={latest} />
            </div>
            <div className="reading-feature-mark" aria-hidden="true">
              01
            </div>
          </div>
        </section>
      ) : (
        <p className="reading-no-results">No readings match those filters.</p>
      )}

      {archive.length > 0 && (
        <section className="reading-archive" aria-labelledby="archive-title">
          <div className="reading-section-label">
            <h2 id="archive-title">Archive</h2>
            <span>
              {archive.length} {archive.length === 1 ? 'reading' : 'readings'}
            </span>
          </div>
          <div className="reading-rows">
            {archive.map((snapshot, index) => (
              <article className="reading-row" key={snapshot.id}>
                <span className="reading-row-number">
                  {String(index + 2).padStart(2, '0')}
                </span>
                <div>
                  <p className="reading-kicker">
                    {kindLabel[snapshot.kind]} <span aria-hidden="true">·</span>{' '}
                    <time dateTime={snapshot.publishedAt}>
                      {formatPublicationDate(
                        snapshot.publishedAt,
                        snapshot.timezone,
                      )}
                    </time>
                  </p>
                  <h3>
                    <a href={`/readings/${snapshot.slug}`}>{snapshot.title}</a>
                  </h3>
                  <p>{snapshot.summary}</p>
                </div>
                <ReadingMeta snapshot={snapshot} />
              </article>
            ))}
          </div>
        </section>
      )}

      <nav
        className="reading-exports"
        aria-label="Reading subscriptions and downloads"
      >
        <span>Keep a copy</span>
        <a href="/readings/feed.xml">RSS</a>
        <a href="/readings/atom.xml">Atom</a>
        <a href="/readings/subscriptions.opml">OPML</a>
        <a href="/exports/publications.zip">Offline bundle</a>
      </nav>
    </>
  );
}

export function ReadingMeta({ snapshot }: { snapshot: Snapshot }) {
  const stats = readingStats(snapshot);
  return (
    <div className="reading-meta">
      <span>{stats.words.toLocaleString()} words</span>
      <span>{stats.minutes} min read</span>
      {snapshot.tags.length > 0 && (
        <span>{snapshot.tags.slice(0, 2).join(' · ')}</span>
      )}
    </div>
  );
}
