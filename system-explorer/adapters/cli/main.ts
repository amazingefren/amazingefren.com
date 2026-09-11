import { executeSystemExplorerCli } from './index.ts';
import { createSystemExplorer } from '../../operations/index.ts';

const result = executeSystemExplorerCli(
  createSystemExplorer(),
  process.argv.slice(2),
);
process.stdout.write(
  `${JSON.stringify(result.ok ? result.value : result.error)}\n`,
);
if (!result.ok) process.exitCode = 1;
