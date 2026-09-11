import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import design from '../design.manifest.ts';
import { brand } from '../brand/brand.ts';
import { foundations, lightTheme, darkTheme } from '../foundations/tokens.ts';
import { renderTokens } from '../adapters/css/render.ts';

const tokenNames = new Set([
  ...Object.keys(foundations),
  ...Object.keys(lightTheme),
]);

export function inspectStyles(source: string, canonical = false): string[] {
  const errors: string[] = [];
  if (
    /#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})\b|\b(?:rgba?|hsla?|oklch|oklab|color)\(/i.test(
      source,
    )
  )
    errors.push('Raw color');
  for (const declaration of source.matchAll(
    /(?:^|[;{])\s*(?:color|background(?:-color)?|border(?:-(?:top|right|bottom|left))?-color|outline-color|fill|stroke)\s*:\s*([^;}]+)/g,
  )) {
    const value = declaration[1].replace(/\s*!important\s*$/, '').trim();
    if (
      /^[a-z-]+$/i.test(value) &&
      !/^(transparent|currentcolor|inherit|initial|unset|revert|revert-layer|none|auto)$/i.test(
        value,
      )
    )
      errors.push('Raw color');
  }
  if (
    [...source.matchAll(/font-family\s*:\s*([^;\n]+)/gi)].some(
      (match) => !match[1].trim().startsWith('var('),
    )
  )
    errors.push('Local font family');
  if (!canonical && /--ae-[\w-]+\s*:/.test(source))
    errors.push('Canonical token override');
  for (const match of source.matchAll(/var\(\s*(--[\w-]+)/g)) {
    if (!tokenNames.has(match[1])) errors.push(`Unknown token ${match[1]}`);
  }
  for (const rule of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!rule[1].includes(':hover')) continue;
    for (const token of design.interaction.forbiddenHoverTokens) {
      if (rule[2].includes(`var(${token})`))
        errors.push(`Wrong hover token ${token}`);
    }
  }
  return [...new Set(errors)];
}

export function inspectCopy(source: string): string[] {
  const normalized = source.replace(/\s+/g, ' ').toLowerCase();
  return design.copy.forbiddenUiPhrases
    .filter((phrase) => normalized.includes(phrase.toLowerCase()))
    .map((phrase) => `Prohibited UI copy: ${phrase}`);
}

export function contrast(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    assert.match(hex, /^#[0-9a-f]{6}$/i);
    const channels = [1, 3, 5]
      .map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
      .map((value) =>
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
      );
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const first = luminance(foreground),
    second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export async function checkDesign(
  root: URL,
  systems: readonly { id: string; dependencies: readonly string[] }[],
) {
  assert.equal(
    await readFile(new URL(design.foundations.stylesheet, root), 'utf8'),
    renderTokens(),
    'Design CSS drift: run npm run design:sync',
  );
  for (const asset of Object.values(brand.assets)) {
    assert.deepEqual(
      await readFile(new URL(asset.output, root)),
      await readFile(new URL(asset.source, root)),
      `Brand asset drift: ${asset.output}`,
    );
  }
  assert.deepEqual(
    Object.keys(darkTheme).sort(),
    Object.keys(lightTheme).sort(),
    'Theme token parity',
  );
  for (const value of Object.values({
    ...foundations,
    ...lightTheme,
    ...darkTheme,
  })) {
    for (const match of value.matchAll(/var\(\s*(--[\w-]+)/g))
      assert(tokenNames.has(match[1]), `Unknown foundation token: ${match[1]}`);
  }
  for (const theme of [lightTheme, darkTheme])
    for (const pair of design.interaction.contrastPairs) {
      const tokens = theme as Record<string, string>;
      assert(
        contrast(tokens[pair.foreground], tokens[pair.background]) >=
          pair.minimum,
        `Insufficient contrast: ${pair.foreground} on ${pair.background}`,
      );
    }
  const ids = new Set<string>();
  for (const item of [
    ...design.behaviors,
    ...design.components,
    ...design.patterns,
  ]) {
    assert(!ids.has(item.id), `Duplicate design ID: ${item.id}`);
    ids.add(item.id);
    if (item.status === 'proposed')
      assert.equal(
        item.implementation,
        null,
        `Unapproved implementation: ${item.id}`,
      );
    if (item.implementation) await access(new URL(item.implementation, root));
  }
  for (const path of [
    design.foundations.source,
    design.brand.contract,
    design.brand.component,
    design.adoption.stylesheet,
    design.adoption.componentEntrypoint,
    design.adoption.themeBootstrap,
    ...design.verification.tests,
  ])
    await access(new URL(path, root));
  for (const consumer of design.adoption.consumers)
    assert(
      systems
        .find((system) => system.id === consumer)
        ?.dependencies.includes('design'),
      `Missing design dependency: ${consumer}`,
    );
  const exceptions = new Set<string>(
    design.adoption.exceptions.map((exception) => exception.path),
  );
  for (const path of exceptions) await access(new URL(path, root));
  let count = 0;
  async function scan(path: string) {
    let entries;
    try {
      entries = await readdir(new URL(path, root), { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const child = `${path}/${entry.name}`;
      if (entry.isDirectory()) await scan(child);
      else if (/\.(css|tsx)$/.test(entry.name) && !exceptions.has(child)) {
        const source = await readFile(new URL(child, root), 'utf8');
        const errors = [
          ...inspectStyles(source),
          ...(child.endsWith('.tsx') ? inspectCopy(source) : []),
        ];
        assert.equal(errors.length, 0, `${child}: ${errors.join(', ')}`);
        count++;
      }
    }
  }
  for (const path of [
    ...systems
      .filter((system) => system.id !== 'design')
      .map((system) => `${system.id}/ui`),
    'web/adapters/http',
    'web/composition',
    'design/ui',
  ])
    await scan(path);
  return count;
}
