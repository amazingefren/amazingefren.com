import { renderMermaidSVG } from 'beautiful-mermaid';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PublicationCode } from './PublicationCode.tsx';
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
};

const maximumDiagramSource = 20_000;
const maximumDiagramOutput = 300_000;

function MermaidDiagram({ value }: { value: string }) {
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
        <div dangerouslySetInnerHTML={{ __html: svg }} />
        <details>
          <summary>Diagram source</summary>
          <pre>
            <code>{value}</code>
          </pre>
        </details>
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
}: PublicationMarkdownProps) {
  const library = new Map(assets.map((asset) => [asset.id, asset]));
  return (
    <article className="publication-markdown">
      <Markdown
        remarkPlugins={[remarkGfm]}
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
              <>{children}</>
            ) : (
              <pre className="publication-code-block">{children}</pre>
            );
          },
          p: ({ children, node }) => {
            const source = node as { children?: { tagName?: string }[] };
            const imageOnly =
              source.children?.length === 1 &&
              source.children[0]?.tagName === 'img';
            return imageOnly ? (
              <figure className="publication-inline-image">{children}</figure>
            ) : (
              <p>{children}</p>
            );
          },
          code: ({ className, children, ...props }) => {
            const requestedLanguage =
              /language-([^\s]+)/.exec(className ?? '')?.[1] ?? '';
            const language = publicationLanguage(requestedLanguage);
            const source = String(children);
            if (language === 'mermaid')
              return <MermaidDiagram value={source} />;
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
