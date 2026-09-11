import {
  parseEvidenceCommand,
  type EvidenceResult,
  isEvidenceResult,
  maxEvidenceCommandBytes,
  maxEvidenceStateBytes,
} from '../contracts/index.ts';
import { boundedJson } from '../../web/adapters/http/body.ts';
import { sessionCookieHeader } from '../../web/domain/access/index.ts';
import type { OwnerWorkspaceService } from '../../web/composition/owner-workspace.ts';

export function createEvidenceGateway(
  service: OwnerWorkspaceService | undefined,
) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST')
      return new Response(null, {
        status: 405,
        headers: { allow: 'POST', 'cache-control': 'no-store' },
      });
    if (
      request.headers.get('origin') !== new URL(request.url).origin ||
      !sessionCookieHeader(request)
    )
      return response(
        {
          ok: false,
          error: {
            code: 'denied',
            message: 'Owner authentication is required.',
          },
        },
        401,
      );
    const body = await boundedJson(request, maxEvidenceCommandBytes);
    const command = body.ok ? parseEvidenceCommand(body.value) : null;
    if (!command)
      return response(
        {
          ok: false,
          error: { code: 'invalid', message: 'Invalid evidence command.' },
        },
        400,
      );
    if (
      new URL(request.url).pathname !==
      `/api/evidence/operations/${command.operation}`
    )
      return response(
        {
          ok: false,
          error: {
            code: 'invalid',
            message: 'Operation does not match its declared route.',
          },
        },
        400,
      );
    if (!service)
      return response(
        {
          ok: false,
          error: {
            code: 'unavailable',
            message: 'Evidence storage is unavailable.',
          },
        },
        503,
      );
    try {
      const upstream = await service.fetch(
        new Request('https://workspace-owner.internal/api/evidence/operation', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            cookie: sessionCookieHeader(request)!,
          },
          body: JSON.stringify(command),
          signal: request.signal,
        }),
      );
      const result = await boundedJson(upstream, maxEvidenceStateBytes);
      if (
        !result.ok ||
        !isEvidenceResult(result.value) ||
        (result.value.ok &&
          ('value' in result.value
            ? result.value.value.synthetic
            : result.value.report.synthetic))
      )
        return response(
          {
            ok: false,
            error: {
              code: 'unavailable',
              message: 'Evidence returned an invalid response.',
            },
          },
          503,
        );
      return response(
        result.value,
        result.value.ok
          ? 200
          : {
              invalid: 400,
              denied: 403,
              missing: 404,
              conflict: 409,
              unavailable: 503,
            }[result.value.error.code],
      );
    } catch {
      return response(
        {
          ok: false,
          error: { code: 'unavailable', message: 'Evidence is unavailable.' },
        },
        503,
      );
    }
  };
}

const response = (value: EvidenceResult, status: number) =>
  Response.json(value, { status, headers: { 'cache-control': 'no-store' } });
