import type {
  WorkspaceError,
  WorkspacePort,
  WorkspaceResult,
} from '../../contracts/index.ts';
import { createOwnerWorkspacePort } from '../owner-server.ts';
import type { OwnerWorkspaceDependencies } from '../../ports/index.ts';

export function createWorkspaceHttpHandler(
  port: WorkspacePort,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== 'POST')
      return response(
        {
          ok: false,
          error: { code: 'invalid', message: 'Only POST is supported' },
        },
        405,
        { allow: 'POST' },
      );
    let command: unknown;
    try {
      command = await request.json();
    } catch {
      return response({
        ok: false,
        error: { code: 'invalid', message: 'Request body must be JSON' },
      });
    }
    return response(await port.execute(command as never));
  };
}

export function createOwnerWorkspaceHttpHandler(
  dependencies: OwnerWorkspaceDependencies,
): (request: Request) => Promise<Response> {
  return createWorkspaceHttpHandler(createOwnerWorkspacePort(dependencies));
}

function response(
  result: WorkspaceResult<unknown>,
  status?: number,
  extra: Record<string, string> = {},
): Response {
  const code = result.ok ? 200 : (status ?? errorStatus(result.error));
  return new Response(JSON.stringify(result.ok ? result.value : result.error), {
    status: code,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extra,
    },
  });
}

function errorStatus(error: WorkspaceError): number {
  if (error.code === 'invalid') return 400;
  if (error.code === 'denied') return 403;
  if (error.code === 'missing') return 404;
  if (error.code === 'conflict') return 409;
  return 503;
}
