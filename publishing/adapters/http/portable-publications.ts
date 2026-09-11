import {
  createOfflineBundle,
  type ActivePublicationPort,
  type PublicationAssetPort,
} from '../../domain/offline-bundle/index.ts';
import { createSubscriptionOpml } from '../../domain/subscriptions/index.ts';

export type PortablePublicationHttpDependencies = {
  publications: ActivePublicationPort;
  assets: PublicationAssetPort;
  origin: string;
};

export function createPortablePublicationHttpHandler({
  publications,
  assets,
  origin,
}: PortablePublicationHttpDependencies) {
  const bundle = createOfflineBundle(publications, assets);
  const opml = createSubscriptionOpml(origin);
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'GET')
      return new Response(null, {
        status: 405,
        headers: { allow: 'GET', 'cache-control': 'no-store' },
      });
    const url = new URL(request.url);
    if (url.search || url.hash)
      return new Response(null, {
        status: 404,
        headers: { 'cache-control': 'no-store' },
      });
    const path = url.pathname;
    if (path === '/exports/publications.zip') {
      const result = await bundle.build();
      if (!result.ok) return unavailable(result.error.message);
      return new Response(new Uint8Array(result.value.body), {
        headers: {
          'content-type': result.value.contentType,
          'content-disposition': `attachment; filename="${result.value.filename}"`,
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        },
      });
    }
    if (path === '/readings/subscriptions.opml') {
      if (!opml.ok) return unavailable(opml.error.message);
      return new Response(opml.value.body, {
        headers: {
          'content-type': opml.value.contentType,
          'content-disposition': `attachment; filename="${opml.value.filename}"`,
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        },
      });
    }
    return new Response(null, {
      status: 404,
      headers: { 'cache-control': 'no-store' },
    });
  };
}

function unavailable(message: string) {
  return new Response(message, {
    status: 503,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
