import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTokens } from './render.ts';
import { brand } from '../../brand/brand.ts';

const root = new URL('../../../', import.meta.url);
const css = new URL('design/foundations/tokens.css', root);
await writeFile(css, renderTokens());
for (const asset of Object.values(brand.assets)) {
  const output = new URL(asset.output, root);
  await mkdir(dirname(fileURLToPath(output)), { recursive: true });
  await writeFile(output, await readFile(new URL(asset.source, root)));
}
console.log('AE Design CSS and logo assets synchronized.');
