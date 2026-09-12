import { renderMermaidSVG } from 'beautiful-mermaid';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ReactNode } from 'react';
import { PublicationCode } from './PublicationCode.tsx';
import { PublicationDiagram } from './PublicationDiagram.tsx';
import {
  publicationAssetId,
  publicationLanguage,
  safePublicationUrl,
  sanitizeMermaidSvg,
  type PublicationAsset,
} from './publication-rendering.ts';

export type PublicationMarkdownProps = {
  value: string;
  assets: readonly PublicationAsset[];
  resolveAsset?(asset: PublicationAsset): string | null;
  includeActions?: boolean;
  renderDiagram?(svg: string, source: string): ReactNode;
};

const maximumDiagramSource = 20_000;
const maximumDiagramOutput = 300_000;

type SourceNode = {
  tagName?: string;
  children?: SourceNode[];
  properties?: Record<string, unknown>;
  position?: { start: { line: number }; end: { line: number } };
};

function sourcePosition(node?: SourceNode) {
  return {
    'data-source-line': node?.position?.start.line,
    'data-source-end-line': node?.position?.end.line,
  };
}

function annotateSource() {
  return (tree: SourceNode) => {
    const visit = (node: SourceNode) => {
      if (
        node.position &&
        node.tagName &&
        /^(p|h[1-6]|pre|ul|ol|blockquote|table|hr)$/.test(node.tagName)
      )
        node.properties = { ...node.properties, ...sourcePosition(node) };
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}

function MermaidDiagram({
  value,
  includeActions,
  renderDiagram,
}: {
  value: string;
  includeActions: boolean;
  renderDiagram?: PublicationMarkdownProps['renderDiagram'];
}) {
  if (value.length > maximumDiagramSource)
    return (
      <DiagramFailure
        message="This Mermaid source is too large to render."
        value={value}
      />
    );
  try {
    const svg = sanitizeMermaidSvg(
      renderMermaidSVG(value, { transparent: true }),
    );
    if (!svg || svg.length > maximumDiagramOutput)
      return (
        <DiagramFailure
          message="This Mermaid diagram could not render."
          value={value}
        />
      );
    return (
      <figure className="publication-diagram">
        {renderDiagram ? (
          renderDiagram(svg, value)
        ) : (
          <PublicationDiagram
            includeActions={includeActions}
            source={value}
            svg={svg}
          />
        )}
      </figure>
    );
  } catch {
    return (
      <DiagramFailure
        message="This Mermaid diagram could not render."
        value={value}
      />
    );
  }
}

function DiagramFailure({
  message,
  value,
}: {
  message: string;
  value: string;
}) {
  return (
    <figure className="publication-diagram publication-diagram-failure">
      <p role="alert">{message}</p>
      <pre>
        <code>{value}</code>
      </pre>
    </figure>
  );
}

export function PublicationMarkdown({
  value,
  assets,
  resolveAsset,
  includeActions = true,
  renderDiagram,
}: PublicationMarkdownProps) {
  const library = new Map(assets.map((asset) => [asset.id, asset]));
  return (
    <article className="publication-markdown">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[annotateSource]}
        urlTransform={(url, key) => {
          if (key === 'src' && publicationAssetId(url))
            return library.has(publicationAssetId(url) ?? '') ? url : '';
          return safePublicationUrl(url, key === 'href' ? 'href' : 'src');
        }}
        components={{
          pre: ({ children, node }) => {
            const source = node as {
              children?: { properties?: { className?: string[] } }[];
            };
            const classes = source.children?.[0]?.properties?.className ?? [];
            return classes.some((item) => item.startsWith('language-')) ? (
              <div {...sourcePosition(node)}>{children}</div>
            ) : (
              <pre className="publication-code-block" {...sourcePosition(node)}>
                {children}
              </pre>
            );
          },
          p: ({ children, node }) => {
            const source = node as { children?: { tagName?: string }[] };
            const imageOnly =
              source.children?.length === 1 &&
              source.children[0]?.tagName === 'img';
            return imageOnly ? (
              <figure
                className="publication-inline-image"
                {...sourcePosition(node)}
              >
                {children}
              </figure>
            ) : (
              <p {...sourcePosition(node)}>{children}</p>
            );
          },
          code: ({ className, children, ...props }) => {
            const requestedLanguage =
              /language-([^\s]+)/.exec(className ?? '')?.[1] ?? '';
            const language = publicationLanguage(requestedLanguage);
            const source = String(children);
            if (language === 'mermaid')
              return (
                <MermaidDiagram
                  includeActions={includeActions}
                  renderDiagram={renderDiagram}
                  value={source}
                />
              );
            if (className?.includes('language-'))
              return (
                <PublicationCode
                  includeActions={includeActions}
                  language={requestedLanguage}
                  value={source}
                />
              );
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          img: ({ src = '', alt = '' }) => {
            const asset = library.get(publicationAssetId(src) ?? '');
            if (!asset) return <span>Image unavailable</span>;
            const resolved =
              resolveAsset?.(asset) ?? asset.readPath ?? asset.dataUrl;
            if (!resolved) return <span>Image unavailable</span>;
            return (
              <span className="publication-inline-image" data-publication-image>
                <img alt={alt || asset.alt} src={resolved} />
                {asset.caption && (
                  <span className="publication-image-caption">
                    {asset.caption}
                  </span>
                )}
              </span>
            );
          },
        }}
      >
        {value}
      </Markdown>
    </article>
  );
}
