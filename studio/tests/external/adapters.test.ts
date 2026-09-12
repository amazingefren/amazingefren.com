import assert from 'node:assert/strict';
import test from 'node:test';
import { createExternalDraftCliAdapter } from '../../external/adapters.ts';

test('external CLI adapter preserves the injected draft envelope', async () => {
  const adapter = createExternalDraftCliAdapter({
    list: async () => ({ ok: true, value: { items: [], nextCursor: null } }),
    read: async () => ({
      ok: false,
      error: { code: 'missing', message: 'missing' },
    }),
    create: async () => ({
      ok: false,
      error: { code: 'unavailable', message: 'unavailable' },
    }),
    save: async () => ({
      ok: false,
      error: { code: 'unavailable', message: 'unavailable' },
    }),
    upload: async () => ({
      ok: false,
      error: { code: 'unavailable', message: 'unavailable' },
    }),
    asset: async () => new Response(null, { status: 404 }),
  });
  assert.deepEqual(await adapter.list(), {
    ok: true,
    value: { items: [], nextCursor: null },
  });
});
