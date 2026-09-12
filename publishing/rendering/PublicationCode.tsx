import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import bash from 'shiki/langs/bash.mjs';
import css from 'shiki/langs/css.mjs';
import emacsLisp from 'shiki/langs/emacs-lisp.mjs';
import html from 'shiki/langs/html.mjs';
import javascript from 'shiki/langs/javascript.mjs';
import json from 'shiki/langs/json.mjs';
import jsx from 'shiki/langs/jsx.mjs';
import markdown from 'shiki/langs/markdown.mjs';
import mermaid from 'shiki/langs/mermaid.mjs';
import type { ReactNode } from 'react';
import python from 'shiki/langs/python.mjs';
import sql from 'shiki/langs/sql.mjs';
import tsx from 'shiki/langs/tsx.mjs';
import typescript from 'shiki/langs/typescript.mjs';
import { PublicationCopyCode } from './PublicationCopyCode.tsx';
import {
  publicationLanguage,
  supportedPublicationLanguages,
} from './publication-rendering.ts';

const theme = {
  name: 'ae-publication',
  type: 'dark' as const,
  colors: {
    'editor.background': 'var(--ae-hover-surface)',
    'editor.foreground': 'var(--ae-ink)',
  },
  tokenColors: [
    {
      scope: ['keyword', 'storage'],
      settings: { foreground: 'var(--ae-theme-accent)' },
    },
    { scope: ['string'], settings: { foreground: 'var(--ae-status-ready)' } },
    { scope: ['comment'], settings: { foreground: 'var(--ae-muted)' } },
    {
      scope: ['constant.numeric'],
      settings: { foreground: 'var(--ae-status-attention)' },
    },
  ],
};

const highlighter = createHighlighterCoreSync({
  engine: createJavaScriptRegexEngine(),
  langs: [
    javascript,
    typescript,
    jsx,
    tsx,
    json,
    html,
    css,
    bash,
    python,
    sql,
    emacsLisp,
    markdown,
    mermaid,
  ],
  themes: [theme],
});

export function PublicationCode({
  value,
  language: requestedLanguage,
  includeActions = true,
  headerAction,
}: {
  value: string;
  language: string;
  includeActions?: boolean;
  headerAction?: ReactNode;
}) {
  const language = publicationLanguage(requestedLanguage);
  let tokens: ReturnType<typeof highlighter.codeToTokens>['tokens'] | null =
    null;
  if (supportedPublicationLanguages.has(language)) {
    try {
      tokens = highlighter.codeToTokens(value, {
        lang: language,
        theme: 'ae-publication',
      }).tokens;
    } catch {}
  }
  return (
    <div
      className="publication-code-block"
      data-language={requestedLanguage || 'plain'}
    >
      <span className="publication-code-heading">
        <span>
          {requestedLanguage === 'org'
            ? 'org (plain text)'
            : requestedLanguage || 'plain text'}
        </span>
        {(includeActions || headerAction) && (
          <span className="publication-code-actions">
            {includeActions && <PublicationCopyCode value={value} />}
            {headerAction}
          </span>
        )}
      </span>
      <pre className="publication-code-source">
        <code>
          {tokens
            ? tokens.map((line, lineIndex) => (
                <span className="publication-code-line" key={lineIndex}>
                  {line.map((token, index) => (
                    <span key={index} style={{ color: token.color }}>
                      {token.content}
                    </span>
                  ))}
                  {lineIndex < tokens.length - 1 ? '\n' : null}
                </span>
              ))
            : value}
        </code>
      </pre>
    </div>
  );
}
