import { boundedJson } from '../adapters/http/body.ts';
import { sessionCookieHeader } from '../domain/access/index.ts';
import type { Result, Snapshot, StudioState } from '../../contracts/writing/index.ts';
import { isSnapshot, isStudioState } from '../../studio/writing/validation.ts';
import type { OwnerWorkspaceService } from './owner-workspace.ts';

const commandLimit = 3 * 1024 * 1024;
const responseLimit = 16 * 1024 * 1024;
const denied = () => json({ ok: false, error: { code: 'denied', message: 'Owner authentication is required.' } }, 401);
const unavailable = () => json({ ok: false, error: { code: 'unavailable', message: 'Writing storage is unavailable.' } }, 503);

export function createWritingGateway(service: OwnerWorkspaceService | undefined) {
  return {
    async operation(request: Request): Promise<Response> {
      if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } });
      if (request.headers.get('origin') !== new URL(request.url).origin) return denied();
      const assertion = sessionCookieHeader(request);
      if (!assertion) return denied();
      if (!service) return unavailable();
      const command = await boundedJson(request, commandLimit);
      if (!command.ok) return json(command, 400);
      const operation = new URL(request.url).pathname.split('/').at(-1);
      if (!record(command.value) || command.value.operation !== operation || operation === 'studio.writing.reset') return json({ ok: false, error: { code: 'invalid', message: 'Operation does not match its declared route.' } }, 400);
      try {
        const response = await service.fetch(new Request('https://workspace-owner.internal/api/writing/operation', { method: 'POST', headers: { 'content-type': 'application/json', cookie: assertion }, body: JSON.stringify(command.value) }));
        const result = await boundedJson(response, responseLimit);
        if (!result.ok || !writingResult(result.value)) return unavailable();
        return json(result.value, result.value.ok ? 200 : status(result.value.error.code));
      } catch { return unavailable(); }
    },
    async privateAsset(request: Request): Promise<Response> {
      const assertion = sessionCookieHeader(request);
      if (!assertion) return denied();
      if (!service) return unavailable();
      const path = new URL(request.url).pathname;
      if (!/^\/api\/writing\/assets\/[a-zA-Z0-9_-]{1,120}$/.test(path)) return new Response(null, { status: 404 });
      try { return safeAsset(await service.fetch(new Request(`https://workspace-owner.internal${path}`, { headers: { cookie: assertion } }))); }
      catch { return unavailable(); }
    },
    async publicAsset(request: Request): Promise<Response> {
      const path = new URL(request.url).pathname;
      if (!/^\/api\/publications\/assets\/[a-zA-Z0-9_-]{1,120}\/[a-zA-Z0-9_-]{1,120}$/.test(path)) return new Response(null, { status: 404 });
      if (!service) return unavailable();
      try { return safeAsset(await service.fetch(new Request(`https://workspace-owner.internal${path}`))); }
      catch { return unavailable(); }
    },
    async read(slug?: string): Promise<Result<Snapshot[]>> {
      if (slug !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { ok: false, error: { code: 'missing', message: 'Publication not found.' } };
      if (!service) return { ok: false, error: { code: 'unavailable', message: 'Publications are unavailable.' } };
      try {
        const response = await service.fetch(new Request(`https://workspace-owner.internal/api/publications${slug ? `/${encodeURIComponent(slug)}` : ''}`));
        const result = await boundedJson(response, responseLimit);
        if (result.ok && record(result.value) && result.value.ok === true && Array.isArray(result.value.value) && result.value.value.every(isPublicSnapshot)) return { ok: true, value: result.value.value };
        if (result.ok && failure(result.value)) return result.value;
      } catch {}
      return { ok: false, error: { code: 'unavailable', message: 'Publications are unavailable.' } };
    }
  };
}

export type WritingGateway = ReturnType<typeof createWritingGateway>;


function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function failure(value: unknown): value is { ok: false; error: { code: 'invalid' | 'denied' | 'missing' | 'conflict' | 'unavailable'; message: string } } {
  return record(value) && value.ok === false && record(value.error) && ['invalid', 'denied', 'missing', 'conflict', 'unavailable'].includes(String(value.error.code)) && typeof value.error.message === 'string';
}
function writingResult(value: unknown): value is Result<StudioState> { return failure(value) || (record(value) && value.ok === true && isStudioState(value.value) && !value.value.synthetic); }
function status(code: string) { return code === 'denied' ? 403 : code === 'missing' ? 404 : code === 'conflict' ? 409 : code === 'invalid' ? 400 : 503; }
function json(value: unknown, code: number) { return new Response(JSON.stringify(value), { status: code, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } }); }
function safeAsset(response: Response) {
  const mime = response.headers.get('content-type')?.split(';')[0] ?? '';
  if (!response.ok || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(mime)) return new Response(null, { status: response.status === 404 ? 404 : 503, headers: { 'cache-control': 'no-store' } });
  return new Response(response.body, { headers: { 'content-type': mime, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'", 'cross-origin-resource-policy': 'same-origin' } });
}

export function isPublicSnapshot(value: unknown): value is Snapshot {
  return isSnapshot(value) && /^[a-zA-Z0-9_-]{1,120}$/.test(value.id) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug) && value.assets.every(asset => /^[a-zA-Z0-9_-]{1,120}$/.test(asset.id) && asset.dataUrl === `/api/publications/assets/${value.id}/${asset.id}`);
}
