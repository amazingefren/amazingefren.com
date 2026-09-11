import { boundedJson } from '../adapters/http/body.ts';
import { sessionCookieHeader } from '../domain/access/index.ts';
import type {
  WorkspaceResult,
  WorkspaceState,
} from '../../workspace/contracts/index.ts';
import {
  isWorkspaceState,
  parseWorkspaceCommand,
} from '../../workspace/domain/index.ts';

export interface OwnerWorkspaceService {
  fetch(request: Request): Promise<Response>;
}

export interface OwnerWorkspaceGateway {
  read(request: Request): Promise<WorkspaceResult<WorkspaceState>>;
  operation(request: Request): Promise<Response>;
}

export const OWNER_WORKSPACE_OPERATION_PATH = '/api/workspace/operation';
const MAX_COMMAND_BYTES = 262_144;

export function createOwnerWorkspaceGateway(
  service: OwnerWorkspaceService | undefined,
): OwnerWorkspaceGateway {
  return {
    async read(request) {
      return invoke(
        service,
        request,
        JSON.stringify({ operation: 'workspace.read', input: {} }),
      );
    },
    async operation(request) {
      if (request.method !== 'POST')
        return errorResponse('invalid', 'Only POST is supported', 405, {
          allow: 'POST',
        });
      if (!sameOrigin(request))
        return errorResponse(
          'denied',
          'Cross-origin workspace requests are denied',
          403,
        );
      if (!service)
        return errorResponse(
          'unavailable',
          'Owner workspace service is unavailable',
          503,
        );
      if (!sessionCookieHeader(request))
        return errorResponse('denied', 'Owner authentication is required', 401);
      const body = await commandBody(request);
      if (!body.ok)
        return errorResponse(
          body.error.code,
          body.error.message,
          status(body.error.code),
        );
      const result = await invoke(service, request, body.value);
      return result.ok
        ? json(result, 200)
        : errorResponse(
            result.error.code,
            result.error.message,
            status(result.error.code),
          );
    },
  };
}

async function invoke(
  service: OwnerWorkspaceService | undefined,
  request: Request,
  body: string,
): Promise<WorkspaceResult<WorkspaceState>> {
  if (!service) return unavailable('Owner workspace service is unavailable');
  const assertion = sessionCookieHeader(request);
  if (!assertion) return denied('Owner authentication is required');
  try {
    const response = await service.fetch(
      new Request('https://workspace-owner.internal/api/workspace/operation', {
        method: 'POST',
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          cookie: assertion,
        },
        body,
      }),
    );
    if (
      !response.ok &&
      response.status !== 400 &&
      response.status !== 401 &&
      response.status !== 403 &&
      response.status !== 404 &&
      response.status !== 409 &&
      response.status !== 503
    )
      return unavailable('Owner workspace service is unavailable');
    const payload = await boundedJson(response, 8 * 1024 * 1024);
    return payload.ok && validResult(payload.value)
      ? payload.value
      : unavailable('Owner workspace service returned an invalid response');
  } catch {
    return unavailable('Owner workspace service is unavailable');
  }
}

async function commandBody(
  request: Request,
): Promise<
  | { ok: true; value: string }
  | { ok: false; error: { code: 'invalid'; message: string } }
> {
  const declaredLength = request.headers.get('content-length');
  if (
    declaredLength !== null &&
    (!/^\d+$/.test(declaredLength) ||
      Number(declaredLength) > MAX_COMMAND_BYTES)
  )
    return {
      ok: false,
      error: {
        code: 'invalid',
        message: 'Workspace command exceeds the maximum size',
      },
    };
  if (!request.body)
    return {
      ok: false,
      error: {
        code: 'invalid',
        message: 'Workspace command body is unavailable',
      },
    };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > MAX_COMMAND_BYTES) {
        await reader.cancel();
        return {
          ok: false,
          error: {
            code: 'invalid',
            message: 'Workspace command exceeds the maximum size',
          },
        };
      }
      chunks.push(chunk.value);
    }
  } catch {
    return {
      ok: false,
      error: {
        code: 'invalid',
        message: 'Workspace command body is unavailable',
      },
    };
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const body = new TextDecoder().decode(bytes);
  try {
    const parsed = parseWorkspaceCommand(JSON.parse(body));
    return parsed.ok && parsed.value.operation !== 'workspace.reset'
      ? { ok: true, value: body }
      : {
          ok: false,
          error: {
            code: 'invalid',
            message: parsed.ok
              ? 'Workspace reset is available only to guest sessions'
              : parsed.error.message,
          },
        };
  } catch {
    return {
      ok: false,
      error: { code: 'invalid', message: 'Workspace command must be JSON' },
    };
  }
}

function sameOrigin(request: Request): boolean {
  return request.headers.get('origin') === new URL(request.url).origin;
}

function validResult(value: unknown): value is WorkspaceResult<WorkspaceState> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const result = value as Record<string, unknown>;
  if (result.ok === true)
    return (
      Object.keys(result).length === 2 &&
      isWorkspaceState(result.value) &&
      !result.value.synthetic
    );
  if (
    result.ok !== false ||
    Object.keys(result).length !== 2 ||
    typeof result.error !== 'object' ||
    result.error === null ||
    Array.isArray(result.error)
  )
    return false;
  const error = result.error as Record<string, unknown>;
  return (
    Object.keys(error).length === 2 &&
    (error.code === 'invalid' ||
      error.code === 'denied' ||
      error.code === 'missing' ||
      error.code === 'conflict' ||
      error.code === 'unavailable') &&
    typeof error.message === 'string' &&
    error.message.length <= 4000
  );
}

function status(
  code: 'invalid' | 'denied' | 'missing' | 'conflict' | 'unavailable',
): number {
  if (code === 'invalid') return 400;
  if (code === 'denied') return 401;
  if (code === 'missing') return 404;
  if (code === 'conflict') return 409;
  return 503;
}

function json(result: WorkspaceResult<WorkspaceState>, code: number): Response {
  return new Response(JSON.stringify(result), {
    status: code,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function errorResponse(
  code: 'invalid' | 'denied' | 'missing' | 'conflict' | 'unavailable',
  message: string,
  responseStatus: number,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify({ ok: false, error: { code, message } }), {
    status: responseStatus,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extra,
    },
  });
}

function denied(message: string): WorkspaceResult<never> {
  return { ok: false, error: { code: 'denied', message } };
}

function unavailable(message: string): WorkspaceResult<never> {
  return { ok: false, error: { code: 'unavailable', message } };
}
