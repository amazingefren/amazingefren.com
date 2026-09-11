import assert from 'node:assert/strict';
import { test } from 'node:test';
import manifest from '../deployment.manifest.ts';
import { commandEnvironment, deploymentPlan, runDeployment } from './plan.ts';

const deployment = manifest.contracts.pipeline;

test('production migrates each shared database once and deploys the private service first', () => {
  const migrations = deploymentPlan('migrate', deployment).filter(command => command.tool === 'wrangler');
  assert.deepEqual(migrations.map(command => command.args[3]), ['ae-auth', 'ae-workspace']);
  for (const command of migrations) {
    assert.ok(command.args.includes('--remote'));
    assert.equal(command.args.at(-1), 'ae-studio-engine/wrangler.jsonc');
  }
  const deploys = deploymentPlan('deploy', deployment).filter(command => command.tool === 'wrangler');
  assert.deepEqual(deploys.map(command => command.args.at(-1)), ['ae-studio-engine/wrangler.jsonc', 'web/dist/worker/wrangler.json']);
});

test('build verification cannot migrate or publish', () => {
  for (const phase of ['build', 'dry-run'] as const) {
    for (const command of deploymentPlan(phase, deployment)) {
      assert.ok(!command.args.includes('--remote'));
      if (command.tool === 'wrangler' && command.args[0] === 'deploy') assert.ok(command.args.includes('--dry-run'));
    }
  }
});

test('private commands cannot inherit the connected web Worker identity', () => {
  const environment = { WRANGLER_CI_OVERRIDE_NAME: 'ae-web', WRANGLER_CI_MATCH_TAG: 'web-tag', CLOUDFLARE_API_TOKEN: 'test-token', WORKERS_CI: '1' };
  const [owner, web] = deploymentPlan('deploy', deployment).filter(command => command.tool === 'wrangler');
  const privateEnvironment = commandEnvironment(environment, owner);
  assert.equal(privateEnvironment.WRANGLER_CI_OVERRIDE_NAME, undefined);
  assert.equal(privateEnvironment.WRANGLER_CI_MATCH_TAG, undefined);
  assert.equal(privateEnvironment.CLOUDFLARE_API_TOKEN, 'test-token');
  assert.equal(commandEnvironment(environment, web).WRANGLER_CI_MATCH_TAG, 'web-tag');
  assert.equal(environment.WRANGLER_CI_OVERRIDE_NAME, 'ae-web');
});

test('a failed auth migration prevents the content migration and both uploads', async () => {
  const seen: string[] = [];
  const commands = [...deploymentPlan('migrate', deployment), ...deploymentPlan('deploy', deployment)];
  await assert.rejects(runDeployment(commands, async command => {
    seen.push(command.id);
    if (command.id === 'deployment.migrate.ae-auth') throw new Error('database unavailable');
  }), /database unavailable/);
  assert.deepEqual(seen, ['deployment.preflight', 'deployment.migrate.ae-auth']);
});

test('a failed private Worker deployment prevents the public upload', async () => {
  const seen: string[] = [];
  await assert.rejects(runDeployment(deploymentPlan('deploy', deployment), async command => {
    seen.push(command.id);
    if (command.id === 'deployment.owner') throw new Error('upload denied');
  }), /upload denied/);
  assert.deepEqual(seen, ['deployment.preflight', 'deployment.owner']);
});
