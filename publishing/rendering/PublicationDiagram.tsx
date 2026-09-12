'use client';

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { publicationDiagramSize } from './publication-rendering.ts';

type DiagramSize = { width: number; height: number };

const PublicationCode = lazy(async () => ({
  default: (await import('./PublicationCode.tsx')).PublicationCode,
}));

export function PublicationDiagram({
  svg,
  source,
  includeActions,
}: {
  svg: string;
  source: string;
  includeActions: boolean;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const graphic = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const savedScroll = useRef({ left: 0, top: 0 });
  const restoreFocus = useRef(false);
  const [enhanced, setEnhanced] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showSource, setShowSource] = useState(false);
  const [size, setSize] = useState<DiagramSize>(() =>
    publicationDiagramSize(svg),
  );

  useEffect(() => {
    setEnhanced(true);
  }, []);

  useEffect(() => {
    const element = graphic.current?.querySelector('svg');
    const viewBox = element?.viewBox.baseVal;
    setSize(
      viewBox && viewBox.width > 0 && viewBox.height > 0
        ? { width: viewBox.width, height: viewBox.height }
        : publicationDiagramSize(svg),
    );
    setZoom(1);
    viewport.current?.scrollTo(0, 0);
  }, [svg]);

  useEffect(() => {
    if (!enhanced || showSource || !restoreFocus.current) return;
    requestAnimationFrame(() => {
      viewport.current?.scrollTo(
        savedScroll.current.left,
        savedScroll.current.top,
      );
      root.current
        ?.querySelector<HTMLButtonElement>('.diagram-source-toggle')
        ?.focus();
      restoreFocus.current = false;
    });
  }, [enhanced, showSource]);

  const changeZoom = (next: number) => {
    const element = viewport.current;
    if (!element) return;
    const bounded = Math.min(4, Math.max(0.05, next));
    const currentInset = Math.max(
      0,
      (element.clientWidth - size.width * zoom) / 2,
    );
    const x =
      (element.scrollLeft + element.clientWidth / 2 - currentInset) / zoom;
    const y = (element.scrollTop + element.clientHeight / 2) / zoom;
    setZoom(bounded);
    requestAnimationFrame(() => {
      const nextInset = Math.max(
        0,
        (element.clientWidth - size.width * bounded) / 2,
      );
      element.scrollLeft = x * bounded + nextInset - element.clientWidth / 2;
      element.scrollTop = y * bounded - element.clientHeight / 2;
    });
  };

  const toggleSource = () => {
    if (!showSource && viewport.current)
      savedScroll.current = {
        left: viewport.current.scrollLeft,
        top: viewport.current.scrollTop,
      };
    if (showSource) restoreFocus.current = true;
    setShowSource((current) => !current);
  };

  return (
    <div
      className={`diagram-viewer${enhanced ? ' is-enhanced' : ''}${showSource ? ' is-source' : ''}`}
      ref={root}
    >
      {enhanced && !showSource && (
        <div
          className="diagram-tools"
          role="group"
          aria-label="Diagram controls"
        >
          <button
            aria-label="Zoom out"
            disabled={zoom <= 0.05}
            onClick={() => changeZoom(zoom / 1.25)}
            type="button"
          >
            −
          </button>
          <output className="diagram-zoom-status" aria-label="Diagram zoom">
            {Math.round(zoom * 100)}%
          </output>
          <button
            aria-label="Zoom in"
            disabled={zoom >= 4}
            onClick={() => changeZoom(zoom * 1.25)}
            type="button"
          >
            +
          </button>
          <button
            className="diagram-source-toggle"
            onClick={toggleSource}
            type="button"
          >
            Source
          </button>
        </div>
      )}
      {enhanced && showSource ? (
        <Suspense
          fallback={
            <pre className="publication-code-block">
              <code>{source}</code>
            </pre>
          }
        >
          <PublicationCode
            headerAction={
              <button
                className="diagram-source-toggle"
                onClick={toggleSource}
                type="button"
              >
                Diagram
              </button>
            }
            includeActions={includeActions}
            language="mermaid"
            value={source}
          />
        </Suspense>
      ) : (
        <details className="diagram-transcript">
          <summary>Diagram source</summary>
          <pre>
            <code>{source}</code>
          </pre>
        </details>
      )}
      <div
        className="publication-diagram-viewport diagram-canvas"
        hidden={showSource}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          const element = event.currentTarget;
          drag.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            left: element.scrollLeft,
            top: element.scrollTop,
          };
          element.setPointerCapture(event.pointerId);
          element.focus();
          event.preventDefault();
        }}
        onPointerMove={(event) => {
          const origin = drag.current;
          if (!origin || origin.id !== event.pointerId) return;
          event.currentTarget.scrollLeft =
            origin.left + origin.x - event.clientX;
          event.currentTarget.scrollTop = origin.top + origin.y - event.clientY;
        }}
        onPointerUp={(event) => {
          drag.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        ref={viewport}
        role="region"
        aria-label="Mermaid diagram"
        style={{
          height: size.height * Math.min(zoom, 1) + 2,
          maxHeight: size.height + 2,
        }}
        tabIndex={0}
      >
        <div
          className="diagram-space"
          style={{ width: size.width * zoom, height: size.height * zoom }}
        >
          <div
            aria-hidden="true"
            className="diagram-graphic"
            dangerouslySetInnerHTML={{ __html: svg }}
            ref={graphic}
            style={{ transform: `scale(${zoom})` }}
          />
        </div>
      </div>
    </div>
  );
}
