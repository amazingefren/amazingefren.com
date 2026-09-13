import { basicSetup } from 'codemirror';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import {
  HighlightStyle,
  LanguageDescription,
  syntaxHighlighting,
} from '@codemirror/language';
import {
  Compartment,
  EditorState,
  RangeSetBuilder,
  StateField,
} from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { getCM, vim, Vim } from '@replit/codemirror-vim';
import type { Asset } from '../../../contracts/writing/index.ts';

export type EditorViewMode = 'markdown' | 'split' | 'reading';
export type UploadMetadata = { alt: string; caption: string; rights: string };
export type EditorOptions = {
  busy?: boolean;
  quiet?: boolean;
  previewMode?: boolean;
  toolsMode?: boolean;
  viewMode?: EditorViewMode;
  onUploadImage?(file: File, metadata: UploadMetadata): Promise<Asset | null>;
};
export type ScrollPoint = { source: number; preview: number };

const editorTheme = EditorView.theme({
  '&': {
    background: 'transparent',
    color: 'var(--ae-prose)',
    height: '100%',
  },
  '.cm-scroller': {
    fontFamily: 'var(--ae-font-serif)',
    fontSize: 'var(--ae-text-18)',
    lineHeight: '1.8',
    overflow: 'auto',
  },
  '.cm-content': {
    caretColor: 'var(--ae-theme-accent)',
    minHeight: '100%',
    padding: 'var(--ae-space-24) var(--ae-space-32) var(--ae-space-48)',
  },
  '.cm-line': { padding: '0' },
  '.cm-gutters': { display: 'none' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--ae-theme-accent)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection':
    {
      background: 'var(--ae-hover-surface)',
    },
  '.cm-activeLine': { background: 'transparent' },
  '.cm-focused': { outline: 'none' },
  '.cm-link': { color: 'var(--ae-theme-accent)', textDecoration: 'underline' },
});

const editorHighlight = HighlightStyle.define([
  {
    tag: tags.heading1,
    color: 'var(--ae-ink-strong)',
    fontSize: 'var(--ae-text-36)',
    fontWeight: '700',
  },
  {
    tag: tags.heading2,
    color: 'var(--ae-ink-strong)',
    fontSize: 'var(--ae-text-26)',
    fontWeight: '700',
  },
  {
    tag: tags.heading3,
    color: 'var(--ae-ink-strong)',
    fontSize: 'var(--ae-text-22)',
    fontWeight: '700',
  },
  {
    tag: tags.monospace,
    fontFamily: 'var(--ae-font-mono)',
    fontSize: 'var(--ae-text-14)',
  },
  { tag: tags.link, color: 'var(--ae-theme-accent)' },
  { tag: tags.meta, color: 'var(--ae-muted)' },
]);

const sourceCodeLanguages = [
  LanguageDescription.of({
    name: 'javascript',
    alias: ['js'],
    support: javascript(),
  }),
  LanguageDescription.of({
    name: 'typescript',
    alias: ['ts'],
    support: javascript({ typescript: true }),
  }),
  LanguageDescription.of({ name: 'jsx', support: javascript({ jsx: true }) }),
  LanguageDescription.of({
    name: 'tsx',
    support: javascript({ jsx: true, typescript: true }),
  }),
  LanguageDescription.of({ name: 'html', support: html() }),
  LanguageDescription.of({ name: 'css', support: css() }),
];

function fencedSourceDecorations(state: EditorState) {
  const builder = new RangeSetBuilder<Decoration>();
  let fence: string | null = null;
  for (let number = 1; number <= state.doc.lines; number++) {
    const line = state.doc.line(number);
    const marker = /^\s*(`{3,}|~{3,})/.exec(line.text)?.[1];
    if (!fence && marker) {
      fence = marker;
      builder.add(
        line.from,
        line.from,
        Decoration.line({ class: 'cm-fenced-source' }),
      );
      continue;
    }
    if (!fence) continue;
    builder.add(
      line.from,
      line.from,
      Decoration.line({ class: 'cm-fenced-source' }),
    );
    if (marker && marker[0] === fence[0] && marker.length >= fence.length)
      fence = null;
  }
  return builder.finish();
}

const fencedSourceLines = StateField.define<DecorationSet>({
  create: fencedSourceDecorations,
  update(decorations, transaction) {
    return transaction.docChanged
      ? fencedSourceDecorations(transaction.state)
      : decorations.map(transaction.changes);
  },
  provide: (field) => EditorView.decorations.from(field),
});

const saveHandlers = new WeakMap<EditorView, () => void>();
let writeCommandInstalled = false;

function installWriteCommand() {
  if (writeCommandInstalled) return;
  Vim.defineEx('write', 'w', (cm) => {
    const editor = cm.cm6 as EditorView;
    saveHandlers.get(editor)?.();
  });
  writeCommandInstalled = true;
}

type CreateEditorOptions = {
  parent: HTMLElement;
  doc: string;
  vimEnabled: boolean;
  readOnly: boolean;
  mode: EditorViewMode;
  vimCompartment: Compartment;
  readonlyCompartment: Compartment;
  isUploadPending(): boolean;
  onScroll(): void;
  onPaste(event: ClipboardEvent, editor: EditorView): boolean;
  onDrop(event: DragEvent, editor: EditorView): boolean;
  onActivity(): void;
  onChange(value: string): void;
  onSave(): void;
};

export function createEditor({
  parent,
  doc,
  vimEnabled,
  readOnly,
  mode,
  vimCompartment,
  readonlyCompartment,
  isUploadPending,
  onScroll,
  onPaste,
  onDrop,
  onActivity,
  onChange,
  onSave,
}: CreateEditorOptions) {
  installWriteCommand();
  const editor = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        vimCompartment.of(vimEnabled ? vim() : []),
        basicSetup,
        markdown({ codeLanguages: sourceCodeLanguages }),
        fencedSourceLines,
        editorTheme,
        syntaxHighlighting(editorHighlight),
        readonlyCompartment.of([
          EditorState.readOnly.of(readOnly || mode === 'reading'),
          EditorView.editable.of(!readOnly && mode !== 'reading'),
        ]),
        EditorState.transactionFilter.of((transaction) =>
          isUploadPending() && transaction.docChanged ? [] : transaction,
        ),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({
          'aria-label': 'Manuscript source',
        }),
        EditorView.domEventHandlers({
          scroll: () => {
            onScroll();
            return false;
          },
          paste: (event, current) => onPaste(event, current),
          drop: (event, current) => onDrop(event, current),
        }),
        EditorView.updateListener.of((update) => {
          if (update.selectionSet || update.docChanged) onActivity();
          if (!update.docChanged) return;
          onChange(update.state.doc.toString());
        }),
      ],
    }),
  });
  saveHandlers.set(editor, onSave);
  return editor;
}

export function destroyEditor(editor: EditorView) {
  saveHandlers.delete(editor);
  editor.destroy();
}

export function interpolateScroll(
  position: number,
  points: ScrollPoint[],
  from: 'source' | 'preview',
) {
  const to = from === 'source' ? 'preview' : 'source';
  const ordered = [...points].sort((a, b) => a[from] - b[from]);
  for (let index = 1; index < ordered.length; index++) {
    const before = ordered[index - 1];
    const after = ordered[index];
    if (position > after[from]) continue;
    const distance = after[from] - before[from];
    const fraction = distance
      ? Math.max(0, Math.min(1, (position - before[from]) / distance))
      : 0;
    return before[to] + (after[to] - before[to]) * fraction;
  }
  return ordered.at(-1)?.[to] ?? 0;
}

export function vimStatus(view: EditorView | null, enabled: boolean) {
  if (!enabled || !view) return 'Markdown';
  const state = getCM(view)?.state.vim;
  if (!state) return 'Vim';
  if (state.visualMode)
    return state.visualBlock
      ? 'Vim · Visual block'
      : state.visualLine
        ? 'Vim · Visual line'
        : 'Vim · Visual';
  return state.insertMode ? 'Vim · Insert' : 'Vim · Normal';
}
