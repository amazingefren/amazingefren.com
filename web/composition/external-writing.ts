import type { AuthSessionDatabase } from '../../auth/adapters/d1/session.ts';
import { readOwnerSession } from '../../auth/adapters/d1/session.ts';
import { boundedBytes } from '../adapters/http/body.ts';
import { canonicalPath, sessionCookieHeader } from '../domain/access/index.ts';
import type { OwnerWorkspaceService } from './owner-workspace.ts';

export function createExternalWritingGateway(dependencies: {
  service?: OwnerWorkspaceService;
  database?: AuthSessionDatabase;
  origin?: string;
}) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const path = canonicalPath(url);
    if (!path || !declaredRoute(path, request.method))
      return failure('missing', 'Publication endpoint not found.', 404);
    if (
      !dependencies.origin ||
      url.origin !== dependencies.origin ||
      url.protocol !== 'https:'
    )
      return failure('unavailable', 'Publication access is unavailable.', 503);
    const clients = path === '/api/v1/studio/clients';
    const headers = new Headers();
    if (clients) {
      if (request.headers.has('authorization'))
        return failure('denied', 'A passkey session is required.', 401);
      if (
        request.method !== 'GET' &&
        request.headers.get('origin') !== dependencies.origin
      )
        return failure(
          'denied',
          'Use the owner workspace to manage access.',
          403,
        );
      const cookie = sessionCookieHeader(request);
      if (!cookie || !(await readOwnerSession(request, dependencies.database)))
        return failure('denied', 'A passkey session is required.', 401);
      headers.set('cookie', cookie);
    } else {
      const authorization = request.headers.get('authorization');
      if (
        !authorization ||
        !/^Bearer ae_draft_[A-Za-z0-9_-]{43}$/.test(authorization)
      )
        return failure('denied', 'An AE draft credential is required.', 401);
      headers.set('authorization', authorization);
    }
    if (!dependencies.service)
      return failure('unavailable', 'Publication storage is unavailable.', 503);
    let body: ArrayBuffer | undefined;
    if (request.method === 'POST' || request.method === 'PUT') {
      if (
        request.headers.get('content-type')?.split(';')[0] !==
        'application/json'
      )
        return failure('invalid', 'Send application/json.', 415);
      const bytes = await boundedBytes(request, 3 * 1024 * 1024);
      if (!bytes.ok) return failure('invalid', bytes.error.message, 400);
      body = bytes.value.buffer;
      headers.set('content-type', 'application/json');
    }
    try {
      const response = await dependencies.service.fetch(
        new Request(`https://workspace-owner.internal${path}${url.search}`, {
          method: request.method,
          headers,
          body,
        }),
      );
      const safeHeaders = new Headers({
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff',
        'x-robots-tag': 'noindex, nofollow',
      });
      const mime = response.headers.get('content-type')?.split(';')[0];
      if (
        mime &&
        [
          'application/json',
          'image/png',
          'image/jpeg',
          'image/webp',
          'image/gif',
        ].includes(mime)
      )
        safeHeaders.set('content-type', mime);
      else if (response.ok)
        return failure(
          'unavailable',
          'Publication response is unavailable.',
          503,
        );
      return new Response(response.body, {
        status: response.status,
        headers: safeHeaders,
      });
    } catch {
      return failure('unavailable', 'Publication storage is unavailable.', 503);
    }
  };
}

function declaredRoute(path: string, method: string) {
  if (path === '/api/v1/studio/clients')
    return ['GET', 'POST', 'DELETE'].includes(method);
  if (path === '/api/v1/studio/publications')
    return ['GET', 'POST'].includes(method);
  const prefix = '/api/v1/studio/publications/[A-Za-z0-9_-]{1,120}';
  return (
    (method === 'GET' && new RegExp(`^${prefix}$`).test(path)) ||
    (method === 'PUT' && new RegExp(`^${prefix}/draft$`).test(path)) ||
    (method === 'POST' && new RegExp(`^${prefix}/assets$`).test(path)) ||
    (method === 'GET' &&
      new RegExp(`^${prefix}/assets/[A-Za-z0-9_-]{1,120}$`).test(path))
  );
}

function failure(code: string, message: string, status: number) {
  return Response.json(
    { ok: false, error: { code, message } },
    {
      status,
      headers: {
        'cache-control': 'private, no-store',
        'x-robots-tag': 'noindex, nofollow',
      },
    },
  );
}
