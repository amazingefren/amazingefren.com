import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Snapshot } from '../../../contracts/writing/index.ts';
import { Shell } from '../../../web/ui/shared/PublicShell.tsx';
import { ReadingArticle } from '../../../web/ui/readings/ReadingArticle.tsx';
import { MarkdownPreview } from './Editor.tsx';
import './public-preview-controls.css';

const frameDocument = (styles: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="${styles}"></head><body><div id="preview-root"></div></body></html>`;

export function PublicPreview({
  snapshot,
  onClose,
}: {
  snapshot: Snapshot;
  onClose(): void;
}) {
  const [frame, setFrame] = useState<Document | null>(null);
  const [width, setWidth] = useState<'desktop' | 'mobile'>('desktop');
  const [styles, setStyles] = useState<string | null>(null);
  useEffect(() => {
    setStyles(
      window.document.querySelector<HTMLMetaElement>(
        'meta[name="publication-preview-styles"]',
      )?.content ?? null,
    );
  }, []);
  useEffect(() => {
    if (!frame) return;
    const source = window.document.documentElement;
    const apply = () => {
      const theme = source.getAttribute('data-theme');
      if (theme) frame.documentElement.setAttribute('data-theme', theme);
      else frame.documentElement.removeAttribute('data-theme');
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(source, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, [frame]);
  const root = frame?.getElementById('preview-root');
  return (
    <section
      className="publication-public-preview"
      aria-label="Public article preview"
    >
      <div className="publication-public-preview-bar">
        <button type="button" onClick={onClose}>
          Back to editor
        </button>
        <span>
          Draft preview · proposed dates · navigation and downloads disabled
        </span>
        <div role="group" aria-label="Preview width">
          <button
            type="button"
            aria-pressed={width === 'desktop'}
            onClick={() => setWidth('desktop')}
          >
            Desktop
          </button>
          <button
            type="button"
            aria-pressed={width === 'mobile'}
            onClick={() => setWidth('mobile')}
          >
            Mobile
          </button>
        </div>
      </div>
      <div className={`publication-public-preview-frame is-${width}`}>
        <iframe
          title="Public publication page preview"
          srcDoc={styles ? frameDocument(styles) : undefined}
          onLoad={(event) => setFrame(event.currentTarget.contentDocument)}
        />
      </div>
      {root &&
        createPortal(
          <div
            onClickCapture={(event) => {
              const target = event.target as Element;
              const choice = target
                .closest('[data-theme-choice]')
                ?.getAttribute('data-theme-choice');
              if (choice)
                window.document
                  .querySelector<HTMLButtonElement>(
                    `[data-theme-choice="${choice}"]`,
                  )
                  ?.click();
              const link = target.closest('a');
              if (link && !link.getAttribute('href')?.startsWith('#'))
                event.preventDefault();
            }}
          >
            <Shell page="reading">
              <ReadingArticle snapshot={snapshot}>
                <div className="prose">
                  {snapshot.coverAssetId &&
                    snapshot.assets
                      .filter((asset) => asset.id === snapshot.coverAssetId)
                      .map((asset) => (
                        <img
                          key={asset.id}
                          src={asset.dataUrl}
                          alt={asset.alt}
                        />
                      ))}
                  {snapshot.chapters.map((chapter, index) => (
                    <section
                      key={chapter.documentId}
                      id={`chapter-${index + 1}`}
                    >
                      {snapshot.kind === 'book' && <h2>{chapter.title}</h2>}
                      <MarkdownPreview
                        value={chapter.body}
                        assets={snapshot.assets}
                      />
                    </section>
                  ))}
                </div>
              </ReadingArticle>
            </Shell>
          </div>,
          root,
        )}
    </section>
  );
}
