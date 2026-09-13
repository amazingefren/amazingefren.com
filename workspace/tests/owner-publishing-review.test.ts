import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalPath,
  guardLaunchRequest,
  protectedPath,
} from '../../web/domain/access/index.ts';

const origin = 'https://amazingefren.com';
const alias = '/workspace/publishing/project-1/review';

test('owner publishing review alias preserves the workspace authorization boundary', async () => {
  assert.equal(canonicalPath(new URL(origin + alias)), alias);
  assert.equal(protectedPath(alias), true);

  let anonymousChecks = 0;
  const anonymous = await guardLaunchRequest(
    new Request(origin + alias),
    origin,
    async () => {
      anonymousChecks += 1;
      return false;
    },
  );
  assert.equal(anonymous?.status, 303);
  assert.equal(anonymous?.headers.get('location'), '/auth/me');
  assert.equal(anonymous?.headers.get('cache-control'), 'private, no-store');
  assert.equal(anonymousChecks, 1);

  let ownerChecks = 0;
  const owner = await guardLaunchRequest(
    new Request(origin + alias),
    origin,
    async () => {
      ownerChecks += 1;
      return true;
    },
  );
  assert.equal(owner, null);
  assert.equal(ownerChecks, 1);
});
