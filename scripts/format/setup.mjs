import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

try {
  if (process.env.CI || process.env.HUSKY === '0') process.exit(0);
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const directory = resolve(root, '.husky');
  const hooks = resolve(directory, '_');
  const modules = execFileSync(
    'git',
    ['submodule', 'foreach', '--quiet', '--recursive', 'pwd'],
    { cwd: root, encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .filter(Boolean);
  for (const repository of [root, ...modules]) {
    let current = '';
    try {
      current = execFileSync('git', ['config', '--get', 'core.hooksPath'], {
        cwd: repository,
        encoding: 'utf8',
      }).trim();
    } catch {}
    if (current && resolve(repository, current) !== hooks) {
      console.warn(`Existing hooks preserved: ${repository}`);
      if (repository === root) break;
      continue;
    }
    if (repository === root) {
      process.chdir(root);
      const { default: husky } = await import('husky');
      const warning = husky(directory);
      if (warning) throw new Error(warning);
    } else {
      execFileSync('git', ['config', '--local', 'core.hooksPath', hooks], {
        cwd: repository,
      });
    }
    console.log(`Formatting hook enabled: ${repository}`);
  }
} catch (error) {
  console.warn(`Hook setup skipped; work can continue: ${error.message}`);
}
