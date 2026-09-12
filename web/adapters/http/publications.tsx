import type { RequestInfo } from 'rwsdk/worker';
import { renderToString } from 'rwsdk/worker';
import { Children, isValidElement, type ReactNode } from 'react';
import { PublicationMarkdown } from '../../../publishing/rendering/PublicationMarkdown.tsx';
import type { Snapshot } from '../../../contracts/writing/index.ts';
import type { WritingGateway } from '../../composition/writing.ts';
import { Shell, Readings, NotFound } from './public.tsx';
import { ReadingArticle } from '../../ui/readings/ReadingArticle.tsx';
import { ReadingList } from '../../ui/readings/ReadingList.tsx';
import '../../ui/readings/readings.css';

export function createPublicationRoutes(
  gateway: WritingGateway,
  configured: boolean,
) {
  return {
    async listing({ request, response }: RequestInfo) {
      response.headers.set('Cache-Control', 'no-store');
      if (!configured) return <Readings />;
      const result = await gateway.read();
      if (!result.ok) {
        response.status = 503;
        return (
          <Shell page="readings">
            <section className="page-heading">
              <h1>Readings.</h1>
              <p>Publications could not load. Please try again.</p>
            </section>
          </Shell>
        );
      }
      if (!result.value.length) return <Readings />;
      const url = new URL(request.url);
      return (
        <Shell page="readings">
          <ReadingList
            snapshots={result.value}
            query={url.searchParams.get('q') ?? ''}
            tag={url.searchParams.get('tag') ?? ''}
          />
        </Shell>
      );
    },
    async reading({ request, response }: RequestInfo) {
      response.headers.set('Cache-Control', 'no-store');
      const slug = new URL(request.url).pathname.split('/')[2];
      const result = await gateway.read(slug);
      if (!result.ok || !result.value[0]) {
        response.status =
          result.ok || result.error.code === 'missing' ? 404 : 503;
        return <NotFound />;
      }
      const snapshot = result.value[0];
      return (
        <Shell page="reading">
          <title>{snapshot.seoTitle || snapshot.title}</title>
          <meta
            name="description"
            content={snapshot.seoDescription || snapshot.summary}
          />
          <link
            rel="canonical"
            href={`https://amazingefren.com/readings/${snapshot.slug}`}
          />
          <ReadingArticle snapshot={snapshot}>
            <SnapshotBody snapshot={snapshot} />
          </ReadingArticle>
        </Shell>
      );
    },
    async json(request: Request) {
      const path = new URL(request.url).pathname.split('/').filter(Boolean);
      const result = await gateway.read(path.length > 2 ? path[2] : undefined);
      return new Response(JSON.stringify(result), {
        status: result.ok ? 200 : result.error.code === 'missing' ? 404 : 503,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        },
      });
    },
    async markdown(request: Request) {
      const result = await gateway.read(
        new URL(request.url).pathname.split('/')[2],
      );
      if (!result.ok || !result.value[0])
        return new Response('Publication unavailable.', {
          status: result.ok || result.error.code === 'missing' ? 404 : 503,
          headers: { 'cache-control': 'no-store' },
        });
      const snapshot = result.value[0];
      const source = `# ${snapshot.title}\n\n${snapshot.chapters.map((chapter) => `${snapshot.kind === 'book' ? `## ${chapter.title}\n\n` : ''}${chapter.body}`).join('\n\n')}`;
      const body = source.replace(
        /asset:([a-zA-Z0-9_-]+)/g,
        (_, id: string) => {
          const asset = snapshot.assets.find((item) => item.id === id);
          return asset ? `https://amazingefren.com${asset.dataUrl}` : '';
        },
      );
      return new Response(body, {
        headers: {
          'content-type': 'text/markdown; charset=utf-8',
          'content-disposition': `attachment; filename="${snapshot.slug}.md"`,
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        },
      });
    },
    async feed(request: Request) {
      const result = await gateway.read();
      if (!result.ok)
        return new Response('Publications unavailable.', {
          status: 503,
          headers: { 'cache-control': 'no-store' },
        });
      const atom = new URL(request.url).pathname.endsWith('atom.xml');
      const root = 'https://amazingefren.com';
      const entries = (
        await Promise.all(
          result.value.map(async (snapshot) => {
            const link = `${root}/readings/${snapshot.slug}`;
            const html = await renderToString(
              <SnapshotBody snapshot={snapshot} absolute />,
              { injectRSCPayload: false, Document: PublicationFeedDocument },
            );
            return atom
              ? `<entry><id>${xml(link)}</id><title>${xml(snapshot.title)}</title><link href="${xml(link)}"/><published>${xml(snapshot.publishedAt)}</published><updated>${xml(snapshot.updatedAt ?? snapshot.publishedAt)}</updated><content type="html">${xml(html)}</content></entry>`
              : `<item><guid isPermaLink="true">${xml(link)}</guid><title>${xml(snapshot.title)}</title><link>${xml(link)}</link><pubDate>${new Date(snapshot.publishedAt).toUTCString()}</pubDate><description>${xml(html)}</description></item>`;
          }),
        )
      ).join('');
      const updated =
        result.value
          .map((item) => item.updatedAt ?? item.publishedAt)
          .sort()
          .at(-1) ?? '1970-01-01T00:00:00.000Z';
      const body = atom
        ? `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><id>${root}/readings</id><title>Readings</title><link href="${root}/readings"/><link rel="self" href="${root}/readings/atom.xml"/><updated>${xml(updated)}</updated><author><name>Efren Castro</name></author>${entries}</feed>`
        : `<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel><title>Readings</title><link>${root}/readings</link><description>Published writing.</description>${entries}</channel></rss>`;
      return new Response(body, {
        headers: {
          'content-type': atom
            ? 'application/atom+xml; charset=utf-8'
            : 'application/rss+xml; charset=utf-8',
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        },
      });
    },
  };
}

function PublicationFeedDocument({ children }: { children: ReactNode }) {
  return (
    <>
      {Children.toArray(children).filter(
        (child) =>
          isValidElement<{ id?: string }>(child) &&
          child.type === 'div' &&
          child.props.id === 'hydrate-root',
      )}
    </>
  );
}

function SnapshotBody({
  snapshot,
  absolute = false,
}: {
  snapshot: Snapshot;
  absolute?: boolean;
}) {
  const assetUrl = (id: string) => {
    const asset = snapshot.assets.find((item) => item.id === id);
    return asset &&
      /^\/api\/publications\/assets\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(
        asset.dataUrl,
      )
      ? `${absolute ? 'https://amazingefren.com' : ''}${asset.dataUrl}`
      : '';
  };
  return (
    <div className="prose">
      {snapshot.coverAssetId && (
        <img
          src={assetUrl(snapshot.coverAssetId)}
          alt={
            snapshot.assets.find((item) => item.id === snapshot.coverAssetId)
              ?.alt ?? ''
          }
        />
      )}
      {snapshot.chapters.map((chapter, index) => (
        <section id={`chapter-${index + 1}`} key={chapter.documentId}>
          {snapshot.kind === 'book' && <h2>{chapter.title}</h2>}
          <PublicationMarkdown
            value={chapter.body}
            assets={snapshot.assets}
            resolveAsset={(asset) => assetUrl(asset.id)}
            includeActions={!absolute}
          />
        </section>
      ))}
    </div>
  );
}
function xml(value: string) {
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
