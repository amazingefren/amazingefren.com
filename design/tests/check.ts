import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import design from '../design.manifest.ts';
import { brand } from '../brand/brand.ts';
import { foundations, lightTheme, darkTheme } from '../foundations/tokens.ts';
import { renderTokens } from '../adapters/css/render.ts';

const tokenNames = new Set([...Object.keys(foundations), ...Object.keys(lightTheme)]);

export function inspectStyles(source: string, canonical = false): string[] {
  const errors: string[] = [];
  if (/#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})\b|\b(?:rgba?|hsla?|oklch|oklab|color)\(/i.test(source)) errors.push('Raw color');
  if ([...source.matchAll(/font-family\s*:\s*([^;\n]+)/gi)].some(match => !match[1].trim().startsWith('var('))) errors.push('Local font family');
  if (!canonical && /--ae-[\w-]+\s*:/.test(source)) errors.push('Canonical token override');
  for (const match of source.matchAll(/var\(\s*(--[\w-]+)/g)) {
    if (!tokenNames.has(match[1])) errors.push(`Unknown token ${match[1]}`);
  }
  return [...new Set(errors)];
}

export async function checkDesign(root: URL, systems: readonly { id: string; dependencies: readonly string[] }[]) {
  assert.equal(await readFile(new URL(design.foundations.stylesheet, root), 'utf8'), renderTokens(), 'Design CSS drift: run npm run design:sync');
  for (const asset of Object.values(brand.assets)) {
    assert.deepEqual(await readFile(new URL(asset.output, root)), await readFile(new URL(asset.source, root)), `Brand asset drift: ${asset.output}`);
  }
  assert.deepEqual(Object.keys(darkTheme).sort(), Object.keys(lightTheme).sort(), 'Theme token parity');
  for (const value of Object.values({ ...foundations, ...lightTheme, ...darkTheme })) {
    for (const match of value.matchAll(/var\(\s*(--[\w-]+)/g)) assert(tokenNames.has(match[1]), `Unknown foundation token: ${match[1]}`);
  }
  const ids = new Set<string>();
  for (const item of [...design.behaviors, ...design.components, ...design.patterns]) {
    assert(!ids.has(item.id), `Duplicate design ID: ${item.id}`);
    ids.add(item.id);
    if (item.status === 'proposed') assert.equal(item.implementation, null, `Unapproved implementation: ${item.id}`);
    if (item.implementation) await access(new URL(item.implementation, root));
  }
  for (const path of [design.foundations.source, design.brand.contract, design.brand.component, design.adoption.stylesheet, design.adoption.componentEntrypoint, design.adoption.themeBootstrap, ...design.verification.tests]) await access(new URL(path, root));
  for (const consumer of design.adoption.consumers) assert(systems.find(system => system.id === consumer)?.dependencies.includes('design'), `Missing design dependency: ${consumer}`);
  const exceptions = new Set<string>(design.adoption.exceptions.map(exception => exception.path));
  for (const path of exceptions) await access(new URL(path, root));
  let count = 0;
  async function scan(path: string) {
    let entries;
    try { entries = await readdir(new URL(path, root), { withFileTypes: true }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      const child = `${path}/${entry.name}`;
      if (entry.isDirectory()) await scan(child);
      else if (/\.(css|tsx)$/.test(entry.name) && !exceptions.has(child)) {
        const errors = inspectStyles(await readFile(new URL(child, root), 'utf8'));
        assert.equal(errors.length, 0, `${child}: ${errors.join(', ')}`);
        count++;
      }
    }
  }
  for (const path of [...systems.filter(system => system.id !== 'design').map(system => `${system.id}/ui`), 'web/adapters/http', 'design/ui']) await scan(path);
  return count;
}
