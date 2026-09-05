import assert from 'node:assert/strict';
import test from 'node:test';
import auth from '../../auth/auth.manifest.ts';
import { checkRisks, scoreRisk } from './check.mjs';

test('scores preserve unknown residual risk and reject invalid scales', () => {
  assert.equal(scoreRisk(null), null);
  assert.equal(scoreRisk({ likelihood: 3, impact: 5, rationale: 'Estimate' }), 15);
  assert.throws(() => scoreRisk({ likelihood: 0, impact: 5, rationale: 'Estimate' }));
});

test('a proposed design cannot resolve a risk', async () => {
  const risk = structuredClone(auth.risks[0]);
  risk.status = 'avoided';
  risk.resolution = 'No passwords';
  await assert.rejects(checkRisks([risk], 'auth', new Set(), async () => {}), /verified treatment/);
});

test('verified treatments require evidence and resolve their references', async () => {
  const risk = structuredClone(auth.risks[0]);
  risk.treatment.status = 'verified';
  risk.treatment.implementations = ['auth/implementation.ts'];
  await assert.rejects(checkRisks([risk], 'auth', new Set(), async () => {}), /needs evidence/);
  risk.treatment.evidence = ['auth/verification.json'];
  const paths = [];
  await checkRisks([risk], 'auth', new Set(), async path => paths.push(path));
  assert.deepEqual(paths, ['auth/implementation.ts', 'auth/verification.json']);
});
