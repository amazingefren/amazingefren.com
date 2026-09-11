import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import manifest from '../deployment.manifest.ts';
import { commandEnvironment, deploymentPlan, runDeployment } from './plan.ts';
import type { Phase } from './contracts.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const deployment = manifest.contracts.pipeline;
const phase = process.argv[2];
try {
  if (
    !['build', 'migrate', 'deploy', 'dry-run'].includes(phase) ||
    process.argv.length !== 3
  )
    throw new Error('Use build, migrate, deploy, or dry-run.');
  if (
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_ACCOUNT_ID !== manifest.contracts.accountId
  )
    throw new Error(
      'Cloudflare account override does not match the deployment manifest.',
    );
  if (process.env.CLOUDFLARE_ENV)
    throw new Error(
      'This pipeline targets the default production configuration. Remove CLOUDFLARE_ENV.',
    );
  if (
    process.env.WRANGLER_CI_OVERRIDE_NAME &&
    process.env.WRANGLER_CI_OVERRIDE_NAME !== deployment.web.name
  )
    throw new Error('Connect this pipeline to the ae-web Worker.');
  if (
    ['migrate', 'deploy'].includes(phase) &&
    process.env.WORKERS_CI_BRANCH &&
    process.env.WORKERS_CI_BRANCH !== 'main'
  )
    throw new Error('Production deployment requires the main branch.');
  if (phase === 'deploy') {
    const config = JSON.parse(
      await readFile(
        new URL(`../../${deployment.web.builtConfig}`, import.meta.url),
        'utf8',
      ),
    );
    if (
      config.name !== deployment.web.name ||
      config.account_id !== manifest.contracts.accountId
    )
      throw new Error('Build the production web Worker before deploying.');
  }
  await runDeployment(
    deploymentPlan(phase as Phase, deployment),
    async (command) => {
      if (
        command.id.startsWith('deployment.web') &&
        command.tool === 'wrangler'
      ) {
        const config = JSON.parse(
          await readFile(
            new URL(`../../${deployment.web.builtConfig}`, import.meta.url),
            'utf8',
          ),
        );
        if (
          config.name !== deployment.web.name ||
          config.account_id !== manifest.contracts.accountId
        )
          throw new Error(
            'Built web configuration does not match the production Worker and account.',
          );
      }
      process.stdout.write(`\n${command.id}\n`);
      const executable = command.tool === 'npm' ? 'npm' : process.execPath;
      const args =
        command.tool === 'wrangler'
          ? ['node_modules/wrangler/bin/wrangler.js', ...command.args]
          : [...command.args];
      await new Promise<void>((resolve, reject) => {
        const child = spawn(executable, args, {
          cwd: root,
          env: commandEnvironment(process.env, command),
          stdio: ['ignore', 'inherit', 'inherit'],
        });
        child.once('error', reject);
        child.once('exit', (code, signal) =>
          code === 0
            ? resolve()
            : reject(
                new Error(
                  `${command.id} failed (${signal ?? code}). Remaining steps were not run.`,
                ),
              ),
        );
      });
    },
  );
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Deployment failed.'}\n`,
  );
  process.exitCode = 1;
}
