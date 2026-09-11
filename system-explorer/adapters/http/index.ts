import type {
  CatalogError,
  CatalogResult,
  SystemExplorerPort,
} from '../../contracts.ts';
import { createOfflineBundle } from '../exports/offline-bundle/index.ts';
import { readFullSystemCatalog } from '../../operations/index.ts';

export function createSystemExplorerHttpHandler(
  port: SystemExplorerPort,
): (request: Request) => Response {
  return (request) => {
    try {
      if (request.method !== 'GET')
        return failure(
          { code: 'invalid_input', message: 'Only GET is supported' },
          405,
          { allow: 'GET' },
        );
      const url = new URL(request.url);
      const path = url.pathname;
      const input = queryInput(url);
      if (!input.ok) return result(input);
      if (path === '/api/systems') return result(port.list(input.value));
      if (path === '/exports/systems/index.json')
        return result(readFullSystemCatalog(port));
      if (path === '/exports/systems.zip') {
        const listed = readFullSystemCatalog(port);
        if (!listed.ok) return result(listed);
        return new Response(
          createOfflineBundle(listed.value).buffer as ArrayBuffer,
          {
            headers: {
              'content-type': 'application/zip',
              'content-disposition': 'attachment; filename="systems.zip"',
              'cache-control': 'no-store',
            },
          },
        );
      }
      const id = path.startsWith('/api/systems/')
        ? decode(path.slice('/api/systems/'.length))
        : path.startsWith('/exports/systems/') && path.endsWith('.json')
          ? decode(path.slice('/exports/systems/'.length, -'.json'.length))
          : null;
      return id === null
        ? failure(
            { code: 'not_found', message: 'Catalog route was not found' },
            404,
          )
        : result(port.read({ id }));
    } catch {
      return failure(
        { code: 'unavailable', message: 'Catalog is unavailable' },
        503,
      );
    }
  };
}

function queryInput(url: URL): CatalogResult<Record<string, unknown>> {
  const allowed = ['cursor', 'limit'];
  for (const key of url.searchParams.keys())
    if (!allowed.includes(key))
      return {
        ok: false,
        error: {
          code: 'invalid_input',
          message: 'Query contains an undeclared field',
        },
      };
  for (const key of allowed)
    if (url.searchParams.getAll(key).length > 1)
      return {
        ok: false,
        error: {
          code: 'invalid_input',
          message: `Query field ${key} must appear once`,
        },
      };
  const cursor = url.searchParams.get('cursor');
  const limit = url.searchParams.get('limit');
  return {
    ok: true,
    value: {
      ...(cursor === null ? {} : { cursor }),
      ...(limit === null ? {} : { limit: Number(limit) }),
    },
  };
}
function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}
function result(
  value: { ok: true; value: unknown } | { ok: false; error: CatalogError },
) {
  return value.ok
    ? new Response(JSON.stringify(value.value), {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
        },
      })
    : failure(value.error);
}
function failure(
  error: CatalogError,
  status = error.code === 'not_found'
    ? 404
    : error.code === 'unavailable'
      ? 503
      : 400,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(error), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}
