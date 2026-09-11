import { execFileSync } from 'node:child_process';
import { readFile, writeFile, lstat } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import manifest from './format.manifest.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2);
const check = args.includes('--check');
const files = args.includes('--files')
  ? args.slice(args.indexOf('--files') + 1).map((file) => resolve(file))
  : execFileSync('git', ['ls-files', '--recurse-submodules', '-z'], {
      cwd: root,
      encoding: 'utf8',
    })
      .split('\0')
      .filter(Boolean)
      .map((file) => resolve(root, file));
let changed = 0;
let failed = false;
const python = [];

for (const file of files) {
  const path = relative(root, file).split('\\').join('/');
  if (
    path.startsWith('../') ||
    manifest.excluded.some((pattern) => new RegExp(pattern).test(path))
  )
    continue;
  if (!(await lstat(file)).isFile()) continue;
  if (extname(file) === manifest.python.extension) {
    python.push(file);
    continue;
  }
  if (!manifest.prettier.extensions.includes(extname(file))) continue;
  try {
    const config = await prettier.resolveConfig(file, {
      config: resolve(root, manifest.prettier.config),
    });
    const source = await readFile(file, 'utf8');
    let formatted = await prettier.format(source, {
      ...config,
      filepath: file,
    });
    formatted = await prettier.format(formatted, { ...config, filepath: file });
    if (formatted === source) continue;
    changed++;
    if (check) console.error(path);
    else await writeFile(file, formatted);
  } catch (error) {
    console.error(`${path}: ${error.message}`);
    failed = true;
  }
}

if (python.length) {
  try {
    execFileSync(
      manifest.python.command,
      [...manifest.python.arguments, ...(check ? ['--check'] : []), ...python],
      { cwd: root, stdio: 'inherit' },
    );
  } catch {
    console.error(
      'Python formatting failed. Run mise install to install Ruff, then retry mise run format.',
    );
    failed = true;
  }
}
console.log(
  `${changed} Prettier files ${check ? 'need formatting' : 'formatted'}.`,
);
process.exitCode = failed || (check && changed > 0) ? 1 : 0;
