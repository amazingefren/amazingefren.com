import { maxWorkCommandBytes } from '../../contracts/work/index.ts';
import type { Result } from '../../contracts/work/index.ts';
import { isState, parseCommand } from '../../work/operations/validation.ts';
import type { OwnerWorkspaceService } from '../../web/composition/owner-workspace.ts';

export function createWorkGateway(service: OwnerWorkspaceService | undefined) {
  return {
    async operation(request: Request): Promise<Response> {
      if (request.method !== 'POST') return json({ ok: false, error: 'invalid', message: 'Use POST.' }, 405);
      if (request.headers.get('origin') !== new URL(request.url).origin) return json({ ok: false, error: 'denied', message: 'Sign in to continue.' }, 403);
      const assertion = request.headers.get('Cf-Access-Jwt-Assertion');
      if (!assertion) return json({ ok: false, error: 'denied', message: 'Sign in to continue.' }, 401);
      if (!service) return unavailable();
      const body = await boundedJson(request, maxWorkCommandBytes);
      const command = parseCommand(body);
      if (!command || command.operation !== new URL(request.url).pathname.split('/').at(-1)) return json({ ok: false, error: 'invalid', message: 'Invalid work request.' }, 400);
      try {
        const response = await service.fetch(new Request('https://workspace-owner.internal/api/work/operation', {
          method: 'POST', headers: { 'content-type': 'application/json', 'Cf-Access-Jwt-Assertion': assertion }, body: JSON.stringify(command)
        }));
        const result = await boundedJson(response, 8 * 1024 * 1024);
        if (!validResult(result)) return unavailable();
        return json(result, result.ok ? 200 : result.error === 'denied' ? 403 : result.error === 'conflict' ? 409 : result.error === 'invalid' ? 400 : 503);
      } catch { return unavailable(); }
    }
  };
}

export function validResult(value: unknown): value is Result {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  if (result.ok === true) return Object.keys(result).length === 2 && isState(result.state) && !result.state.synthetic;
  return result.ok === false && Object.keys(result).length === 3 && ['invalid', 'denied', 'conflict', 'unavailable'].includes(String(result.error)) && typeof result.message === 'string' && result.message.length <= 4000;
}

async function boundedJson(message: Request | Response, limit: number): Promise<unknown> {
  if (!message.body) return null;
  const reader = message.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > limit) { await reader.cancel(); return null; }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { return null; }
  finally { reader.releaseLock(); }
}
function json(result: Result, status: number) { return new Response(JSON.stringify(result), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store', ...(status === 405 ? { allow: 'POST' } : {}) } }); }
function unavailable() { return json({ ok: false, error: 'unavailable', message: 'Work is unavailable. Try again.' }, 503); }
