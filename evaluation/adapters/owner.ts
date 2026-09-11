import { isEvaluationResult } from '../contracts/result.ts';
import {
  maxEvaluationCommandBytes,
  maxEvaluationStateBytes,
  parseEvaluationCommand,
} from '../contracts/index.ts';
import { boundedJson } from '../../web/adapters/http/body.ts';
import { sessionCookieHeader } from '../../web/domain/access/index.ts';
import type { OwnerWorkspaceService } from '../../web/composition/owner-workspace.ts';

export function createEvaluationGateway(
  service: OwnerWorkspaceService | undefined,
) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST')
      return new Response(null, {
        status: 405,
        headers: { allow: 'POST', 'cache-control': 'no-store' },
      });
    if (request.headers.get('origin') !== new URL(request.url).origin)
      return failure('denied', 'Owner authentication is required.', 401);
    const cookie = sessionCookieHeader(request);
    if (!cookie)
      return failure('denied', 'Owner authentication is required.', 401);
    const input = await boundedJson(request, maxEvaluationCommandBytes);
    const command = input.ok ? parseEvaluationCommand(input.value) : null;
    if (!command) return failure('invalid', 'Invalid evaluation command.', 400);
    if (
      new URL(request.url).pathname !==
      `/api/evaluation/operations/${command.operation}`
    )
      return failure(
        'invalid',
        'Operation does not match its declared route.',
        400,
      );
    if (!service)
      return failure('unavailable', 'Evaluation storage is unavailable.', 503);
    try {
      const response = await service.fetch(
        new Request(
          'https://workspace-owner.internal/api/evaluation/operation',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify(command),
            signal: request.signal,
          },
        ),
      );
      const body = await boundedJson(response, maxEvaluationStateBytes);
      if (!body.ok || !isEvaluationResult(body.value))
        return failure(
          'unavailable',
          'Evaluation returned an invalid response.',
          503,
        );
      return Response.json(body.value, {
        status: body.value.ok
          ? 200
          : {
              invalid: 400,
              denied: 403,
              missing: 404,
              conflict: 409,
              unavailable: 503,
            }[body.value.error.code],
        headers: { 'cache-control': 'no-store' },
      });
    } catch {
      return failure(
        'unavailable',
        'Evaluation is unavailable. Try again.',
        503,
      );
    }
  };
}

const failure = (code: string, message: string, status: number) =>
  Response.json(
    { ok: false, error: { code, message } },
    { status, headers: { 'cache-control': 'no-store' } },
  );
