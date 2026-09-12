import { fromHtml } from 'hast-util-from-html';
import { toHtml } from 'hast-util-to-html';
import rehypeSanitize from 'rehype-sanitize';
import type { Schema } from 'hast-util-sanitize';

export type PublicationAsset = {
  id: string;
  alt: string;
  caption?: string;
  readPath?: string;
  dataUrl?: string;
};

const svgSchema = {
  tagNames: [
    'svg',
    'g',
    'path',
    'rect',
    'circle',
    'ellipse',
    'line',
    'polyline',
    'polygon',
    'text',
    'tspan',
    'defs',
    'clipPath',
    'marker',
    'title',
    'desc',
    'use',
  ],
  attributes: {
    svg: ['viewBox', 'width', 'height', 'role', 'ariaLabel'],
    g: ['transform', 'clipPath'],
    path: [
      'd',
      'fill',
      'stroke',
      'strokeWidth',
      'strokeLinecap',
      'strokeLinejoin',
      'markerStart',
      'markerEnd',
      'transform',
    ],
    rect: [
      'x',
      'y',
      'width',
      'height',
      'rx',
      'ry',
      'fill',
      'stroke',
      'strokeWidth',
      'transform',
    ],
    circle: ['cx', 'cy', 'r', 'fill', 'stroke', 'strokeWidth', 'transform'],
    ellipse: [
      'cx',
      'cy',
      'rx',
      'ry',
      'fill',
      'stroke',
      'strokeWidth',
      'transform',
    ],
    line: [
      'x1',
      'x2',
      'y1',
      'y2',
      'stroke',
      'strokeWidth',
      'strokeLinecap',
      'markerStart',
      'markerEnd',
      'transform',
    ],
    polyline: [
      'points',
      'fill',
      'stroke',
      'strokeWidth',
      'strokeLinecap',
      'strokeLinejoin',
      'markerStart',
      'markerEnd',
      'transform',
    ],
    polygon: [
      'points',
      'fill',
      'stroke',
      'strokeWidth',
      'strokeLinejoin',
      'transform',
    ],
    text: [
      'x',
      'y',
      'dx',
      'dy',
      'fill',
      'fontSize',
      'fontWeight',
      'textAnchor',
      'transform',
    ],
    tspan: [
      'x',
      'y',
      'dx',
      'dy',
      'fill',
      'fontSize',
      'fontWeight',
      'textAnchor',
    ],
    marker: [
      'id',
      'markerWidth',
      'markerHeight',
      'refX',
      'refY',
      'orient',
      'viewBox',
    ],
    clipPath: ['id'],
    use: ['href', 'x', 'y', 'width', 'height', 'transform'],
  },
  protocols: { href: [] },
} satisfies Schema;

const diagramStyle = [
  '--bg:var(--ae-panel)',
  '--fg:var(--ae-ink)',
  '--line:var(--ae-muted)',
  '--accent:var(--ae-theme-accent)',
  '--muted:var(--ae-muted)',
  '--surface:var(--ae-hover-surface)',
  '--border:var(--ae-line)',
  '--_text:var(--ae-ink)',
  '--_text-sec:var(--ae-muted)',
  '--_text-muted:var(--ae-muted)',
  '--_text-faint:var(--ae-muted)',
  '--_line:var(--ae-muted)',
  '--_arrow:var(--ae-theme-accent)',
  '--_node-fill:var(--ae-hover-surface)',
  '--_node-stroke:var(--ae-line)',
  '--_group-fill:var(--ae-panel)',
  '--_group-hdr:var(--ae-hover-surface)',
  '--_inner-stroke:var(--ae-line)',
  '--_key-badge:var(--ae-hover-surface)',
].join(';');

const languageAliases: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  sh: 'bash',
  shell: 'bash',
  elisp: 'emacs-lisp',
  emacs_lisp: 'emacs-lisp',
  md: 'markdown',
};

export const supportedPublicationLanguages = new Set([
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'json',
  'html',
  'css',
  'bash',
  'python',
  'sql',
  'emacs-lisp',
  'markdown',
  'mermaid',
]);

export function publicationLanguage(value?: string | null) {
  const language = value?.trim().toLowerCase() ?? '';
  return languageAliases[language] ?? language;
}

export function publicationAssetId(value: string) {
  return value.startsWith('asset:') ? value.slice(6) : null;
}

export function publicationDiagramSize(value: string) {
  const viewBox =
    /\bviewBox=["']\s*[-.\d]+\s+[-.\d]+\s+([\d.]+)\s+([\d.]+)\s*["']/i.exec(
      value,
    );
  if (!viewBox) return { width: 1, height: 1 };
  const width = Number(viewBox[1]);
  const height = Number(viewBox[2]);
  return width > 0 && height > 0 ? { width, height } : { width: 1, height: 1 };
}

export function safePublicationUrl(value: string, key: 'href' | 'src') {
  if (key === 'src') return '';
  if (/[\u0000-\u0020\u007f]/.test(value)) return '';
  try {
    const protocol = new URL(value, 'https://publication.invalid').protocol;
    return protocol === 'https:' ||
      protocol === 'http:' ||
      protocol === 'mailto:'
      ? value
      : '';
  } catch {
    return '';
  }
}

export function sanitizeMermaidSvg(value: string) {
  const tree = fromHtml(value, { fragment: true });
  removeSvgStyleNodes(tree);
  const clean = rehypeSanitize(svgSchema)(tree);
  const svg = clean.children.find((node) => {
    const candidate = node as { type?: string; tagName?: string };
    return candidate.type === 'element' && candidate.tagName === 'svg';
  });
  if (!svg || svg.type !== 'element') return '';
  constrainSvgReferences(svg);
  svg.properties.style = diagramStyle;
  svg.properties.role = 'img';
  svg.properties.ariaLabel = 'Mermaid diagram';
  return toHtml(svg);
}

function removeSvgStyleNodes(node: { children?: unknown[] }) {
  if (!node.children) return;
  node.children = node.children.filter(
    (
      child,
    ): child is { type?: string; tagName?: string; children?: unknown[] } => {
      if (!child || typeof child !== 'object') return false;
      const candidate = child as {
        type?: string;
        tagName?: string;
        children?: unknown[];
      };
      if (
        candidate.type === 'element' &&
        ['style', 'script', 'foreignObject'].includes(candidate.tagName ?? '')
      )
        return false;
      removeSvgStyleNodes(candidate);
      return true;
    },
  );
}

function constrainSvgReferences(node: {
  type?: string;
  properties?: Record<string, unknown>;
  children?: unknown[];
}) {
  const ids = new Set<string>();
  collectSvgIds(node, ids);
  cleanSvgNode(node, ids);
}

function collectSvgIds(
  node: { properties?: Record<string, unknown>; children?: unknown[] },
  ids: Set<string>,
) {
  const id = node.properties?.id;
  if (typeof id === 'string' && /^user-content-[A-Za-z][\w.-]*$/.test(id))
    ids.add(id);
  for (const child of node.children ?? []) {
    if (child && typeof child === 'object')
      collectSvgIds(
        child as { properties?: Record<string, unknown>; children?: unknown[] },
        ids,
      );
  }
}

function cleanSvgNode(
  node: { properties?: Record<string, unknown>; children?: unknown[] },
  ids: Set<string>,
) {
  if (node.properties) {
    for (const name of [
      'fill',
      'stroke',
      'markerStart',
      'markerEnd',
      'clipPath',
      'href',
    ]) {
      const value = node.properties[name];
      if (typeof value !== 'string') continue;
      const local = /^(?:url\()?#[A-Za-z][\w.-]*\)?$/.exec(value);
      if (local) {
        const id = `user-content-${local[0].replace(/^url\(#?|\)?$/g, '').replace(/^#/, '')}`;
        if (ids.has(id))
          node.properties[name] = value.startsWith('url(')
            ? `url(#${id})`
            : `#${id}`;
        else delete node.properties[name];
        continue;
      }
      if (!safeSvgPaint(value)) delete node.properties[name];
    }
  }
  for (const child of node.children ?? []) {
    if (child && typeof child === 'object')
      cleanSvgNode(
        child as { properties?: Record<string, unknown>; children?: unknown[] },
        ids,
      );
  }
}

function safeSvgPaint(value: string) {
  return /^(?:none|currentColor|transparent|#[0-9a-fA-F]{3,8}|[a-zA-Z]+|var\(--[A-Za-z0-9_-]+\))$/.test(
    value,
  );
}
