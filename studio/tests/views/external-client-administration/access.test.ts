import test from 'node:test';
import assert from 'node:assert/strict';
import { guardLaunchRequest } from '../../../../web/domain/access/index.ts';

test('draft bearer access does not authorize the client administration page', async () => {
  const origin = 'https://amazingefren.com';
  const request = new Request(`${origin}/workspace/connections/emacs`, {
    headers: { authorization: `Bearer ae_draft_${'a'.repeat(43)}` },
  });
  assert.equal(
    (await guardLaunchRequest(request, origin, async () => false))?.status,
    303,
  );
  assert.equal(
    await guardLaunchRequest(request, origin, async () => true),
    null,
  );
});
