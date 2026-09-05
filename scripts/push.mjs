import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

function git(directory, ...args) {
  return execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8' }).trim();
}

function push(directory, expected) {
  const head = git(directory, 'rev-parse', 'HEAD');
  if (expected && head !== expected) throw new Error(`Submodule differs from committed pointer: ${directory}`);
  const branch = git(directory, 'branch', '--show-current');
  if (!branch) {
    git(directory, 'fetch', '--no-recurse-submodules', 'origin');
    const published = git(directory, 'for-each-ref', `--contains=${head}`, '--format=%(refname)', 'refs/remotes/origin');
    if (!published) throw new Error(`Check out a branch before publishing detached commits: ${directory}`);
  }
  for (const entry of git(directory, 'ls-tree', '-rz', 'HEAD').split('\0')) {
    if (!entry.startsWith('160000 ')) continue;
    const [metadata, path] = entry.split('\t');
    const child = resolve(directory, path);
    if (!existsSync(resolve(child, '.git'))) throw new Error(`Initialize submodule first: ${path}`);
    push(child, metadata.split(' ')[2]);
  }
  if (branch) execFileSync('git', ['-C', directory, 'push', '--recurse-submodules=check', '--set-upstream', 'origin', branch], { stdio: 'inherit' });
}

const root = git(process.cwd(), 'rev-parse', '--show-toplevel');
if (!git(root, 'branch', '--show-current')) throw new Error('Check out a branch before pushing');
push(root);
