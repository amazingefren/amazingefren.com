import assert from 'node:assert/strict';
import test from 'node:test';
import {
  publicationAssetId,
  publicationLanguage,
  safePublicationUrl,
  sanitizeMermaidSvg,
} from '../../rendering/publication-rendering.ts';

test('publication rendering keeps approved asset references and known aliases', () => {
  assert.equal(publicationAssetId('asset:asset-1'), 'asset-1');
  assert.equal(publicationAssetId('https://example.com/image.png'), null);
  assert.equal(publicationLanguage('ts'), 'typescript');
  assert.equal(publicationLanguage('unknown'), 'unknown');
});

test('publication rendering rejects unsafe URLs and SVG execution paths', () => {
  assert.equal(safePublicationUrl('javascript:alert(1)', 'href'), '');
  assert.equal(safePublicationUrl('data:text/html,unsafe', 'src'), '');
  assert.equal(safePublicationUrl('/images/example.webp', 'src'), '');
  const clean = sanitizeMermaidSvg(
    '<svg onload="alert(1)"><script>x</script><foreignObject>bad</foreignObject><a href="https://bad.example">x</a><path d="M0 0" /></svg>',
  );
  assert.match(clean, /<svg/);
  assert.match(clean, /<path/);
  assert.doesNotMatch(clean, /script|foreignObject|onload|https:\/\//i);
});

test('publication rendering keeps safe relative Markdown links', () => {
  assert.equal(
    safePublicationUrl('/readings/ae-intro', 'href'),
    '/readings/ae-intro',
  );
  assert.equal(safePublicationUrl('./chapter', 'href'), './chapter');
  assert.equal(safePublicationUrl('chapter?part=1', 'href'), 'chapter?part=1');
  assert.equal(
    safePublicationUrl('mailto:hello@example.com', 'href'),
    'mailto:hello@example.com',
  );
  assert.equal(safePublicationUrl('\njavascript:alert(1)', 'href'), '');
  assert.equal(safePublicationUrl('java\tscript:alert(1)', 'href'), '');
});

test('publication SVG rendering keeps only local sanitized paint references', () => {
  const clean = sanitizeMermaidSvg(
    '<svg><path fill="url(https://bad.example/paint)" stroke="url(\'data:text/css,bad\')" marker-end="url(#missing)"/><defs><marker id="arrow"/></defs><path marker-end="url(#arrow)"/></svg>',
  );
  assert.doesNotMatch(clean, /bad\.example|data:text|missing/);
  assert.match(clean, /url\(#user-content-arrow\)/);
});
