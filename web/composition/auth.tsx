import type { RequestInfo } from 'rwsdk/worker';
import type { DocumentProps } from 'rwsdk/router';
import { Access } from '../../auth/ui/Access.tsx';
import { readOwnerSession, type AuthSessionDatabase } from '../../auth/adapters/d1/session.ts';
import { themeBootstrap } from '../../design/behaviors/theme.ts';
import designStyles from '../../design/ui/index.css?url';
import authStyles from '../../auth/ui/styles.css?url';

export function AuthDocument({ children }: DocumentProps) {
  return <html lang="en"><head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="robots" content="noindex, nofollow" /><title>Owner access</title><script dangerouslySetInnerHTML={{ __html: themeBootstrap() }} /><link rel="stylesheet" href={designStyles} /><link rel="stylesheet" href={authStyles} /></head><body>{children}<script>{"import('/src/client.tsx')"}</script></body></html>;
}
export function createAuthRoute(database: AuthSessionDatabase | undefined) {
  return async function AuthRoute({ request, response }: RequestInfo) {
    response.headers.set('cache-control', 'private, no-store');
    return <Access initialSignedIn={!!await readOwnerSession(request, database)} />;
  };
}
