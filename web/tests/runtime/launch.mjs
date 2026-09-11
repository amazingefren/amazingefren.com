import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { authenticator } from '../../../auth/tests/support.ts';

const origin = 'https://example.com';
const secret = 's'.repeat(43);
const runtime = new Miniflare(convertV4MiniflareOptions({ workers: [{ name: 'web', modules: true, scriptPath: new URL('../../dist/worker/index.js', import.meta.url).pathname, compatibilityDate: '2026-09-10', compatibilityFlags: ['nodejs_compat'], d1Databases: ['AUTH_DB'], bindings: { AUTH_ORIGIN: origin, AUTH_BOOTSTRAP_TOKEN: secret }, serviceBindings: { ASSETS: () => new Response(null, { status: 404 }) } }] }));
const cookies = new Map();
const device = authenticator();
let requests = 0;
async function send(path, body, extras = {}) {
  const response = await runtime.dispatchFetch(origin + path, { method: body === undefined ? 'GET' : 'POST', redirect: 'manual', headers: { origin, 'content-type': 'application/json', cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join('; '), ...extras }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  for (const cookie of response.headers.getSetCookie()) {
    const [name, value] = cookie.split(';')[0].split('=');
    if (value) cookies.set(name, value); else cookies.delete(name);
  }
  requests++;
  return response;
}
try {
  const db = await runtime.getD1Database('AUTH_DB');
  const sql = await readFile(new URL('../../../auth/migrations/0001_auth.sql', import.meta.url), 'utf8');
  for (const statement of sql.split(';').map(x => x.trim()).filter(Boolean)) await db.prepare(statement).run();
  for (const path of ['/workspace', '/guest/dashboard', '/guest/telemetry', '/workspace?__rsc']) assert.equal((await send(path)).status, 303, path);
  assert.equal((await send('/api/workspace/operation', { operation: 'workspace.read', input: {} }, { 'Cf-Access-Jwt-Assertion': 'forged' })).status, 401);
  const page = await send('/auth/me');
  assert.equal(page.status, 200);
  assert.ok((await page.text()).includes('Use passkey'));
  const options = await send('/api/auth/registration-options', { bootstrapToken: secret });
  assert.equal(options.status, 200);
  const challenge = (await options.json()).challenge;
  const verify = await send('/api/auth/registration-verify', { response: device.registration(challenge) });
  assert.equal(verify.status, 200);
  assert.match(verify.headers.getSetCookie().find(x => x.startsWith('__Host-ae-session=')), /Secure; HttpOnly; SameSite=Strict; Max-Age=43200/);
  assert.equal((await send('/guest/dashboard')).status, 200);
  assert.equal((await send('/api/writing/assets/private')).status, 503);
  const logout = await send('/api/auth/logout', {});
  assert.equal(logout.status, 200);
  assert.equal((await send('/guest/dashboard')).status, 303);
  assert.equal((await send('/api/auth/registration-options', { bootstrapToken: secret })).status, 403);
  const authOptions = await send('/api/auth/authentication-options', {});
  const authResponse = device.authentication((await authOptions.json()).challenge);
  assert.equal((await send('/api/auth/authentication-verify', { response: authResponse })).status, 200);
  assert.equal((await send('/auth/me?__rsc_action_id=forged', {})).status, 403);
  console.log(`Built Worker launch integration passed: ${requests} HTTP requests; real WebAuthn registration/login, D1 sessions, logout, closed bootstrap, and route protection.`);
} finally { await runtime.dispose(); }
