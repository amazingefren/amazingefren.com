import type { Result } from '../../../contracts/writing/index.ts';

export type SubscriptionOpml = {
  body: string;
  contentType: 'text/x-opml; charset=utf-8';
  filename: 'ae-subscriptions.opml';
};

export function createSubscriptionOpml(
  origin: string,
): Result<SubscriptionOpml> {
  let base: URL;
  try {
    base = new URL(origin);
  } catch {
    return invalidOrigin();
  }
  if (
    base.protocol !== 'https:' ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== '/'
  )
    return invalidOrigin();
  const root = base.origin;
  return {
    ok: true,
    value: {
      body: `<?xml version="1.0" encoding="UTF-8"?><opml version="2.0"><head><title>AE subscriptions</title></head><body><outline text="AE Readings" title="AE Readings" type="rss" xmlUrl="${xml(`${root}/readings/feed.xml`)}" htmlUrl="${xml(`${root}/readings`)}"/></body></opml>`,
      contentType: 'text/x-opml; charset=utf-8',
      filename: 'ae-subscriptions.opml',
    },
  };
}

const invalidOrigin = (): Result<never> => ({
  ok: false,
  error: { code: 'invalid', message: 'Invalid public origin.' },
});
const xml = (value: string) =>
  value.replace(
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
