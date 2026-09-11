import type { Command, CommandRunner, Deployment, Phase } from './contracts.ts';

export function deploymentPlan(
  phase: Phase,
  deployment: Deployment,
): readonly Command[] {
  const preflight: Command = {
    id: 'deployment.preflight',
    tool: 'node',
    args: ['cloudflare/check-launch.ts'],
  };
  const workers: Command[] = [
    {
      id: 'deployment.owner',
      tool: 'wrangler',
      args: ['deploy', '--config', deployment.owner.config],
      owner: true,
    },
    {
      id: 'deployment.web',
      tool: 'wrangler',
      args: ['deploy', '--config', deployment.web.builtConfig],
    },
  ];
  const dryRuns = workers.map((command) => ({
    ...command,
    id: `${command.id}.dry-run`,
    args: [...command.args, '--dry-run'],
  }));
  if (phase === 'dry-run') return [preflight, ...dryRuns];
  if (phase === 'deploy') return [preflight, ...workers];
  if (phase === 'migrate')
    return [
      preflight,
      ...deployment.databases.map((database) => ({
        id: `deployment.migrate.${database.name}`,
        tool: 'wrangler' as const,
        args: [
          'd1',
          'migrations',
          'apply',
          database.name,
          '--remote',
          '--config',
          database.config,
        ],
        owner: true,
      })),
    ];
  return [
    preflight,
    {
      id: 'deployment.types',
      tool: 'wrangler',
      args: [
        'types',
        'web/worker-configuration.d.ts',
        '--config',
        deployment.web.config,
      ],
    },
    {
      id: 'deployment.pipeline-types',
      tool: 'node',
      args: [
        'node_modules/typescript/bin/tsc',
        '--project',
        'cloudflare/deployment/tsconfig.json',
      ],
    },
    { id: 'deployment.check', tool: 'npm', args: ['run', 'check'] },
    { id: 'deployment.tests', tool: 'npm', args: ['test'] },
    {
      id: 'deployment.owner-tests',
      tool: 'node',
      args: ['--test', 'ae-studio-engine/tests/*.test.ts'],
    },
    { id: 'deployment.build', tool: 'npm', args: ['run', 'build'] },
    {
      id: 'deployment.web-integration',
      tool: 'node',
      args: ['web/tests/runtime/launch.mjs'],
    },
    {
      id: 'deployment.owner-integration',
      tool: 'node',
      args: ['ae-studio-engine/tests/launch-runtime.mjs'],
    },
    ...dryRuns,
  ];
}

export function commandEnvironment(
  environment: Record<string, string | undefined>,
  command: Command,
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {
    ...environment,
    CI: 'true',
    WRANGLER_SEND_METRICS: 'false',
  };
  if (command.owner) {
    delete result.WRANGLER_CI_OVERRIDE_NAME;
    delete result.WRANGLER_CI_MATCH_TAG;
  }
  return result;
}

export async function runDeployment(
  commands: readonly Command[],
  run: CommandRunner,
): Promise<void> {
  for (const command of commands) await run(command);
}
