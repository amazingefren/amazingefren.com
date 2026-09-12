import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import {
  HighlightStyle,
  LanguageDescription,
  syntaxHighlighting,
} from '@codemirror/language';
import { redo, undo } from '@codemirror/commands';
import {
  Compartment,
  EditorState,
  RangeSetBuilder,
  StateField,
  Transaction,
} from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { getCM, vim, Vim } from '@replit/codemirror-vim';
import type { Asset, EditorProps } from '../../../contracts/writing/index.ts';
import {
  countWords,
  manuscriptOutline,
  markdownInsertion,
} from './editor-helpers.ts';
import './editor.css';

type EditorViewMode = 'markdown' | 'split' | 'reading';
type EditorOptions = {
  busy?: boolean;
  quiet?: boolean;
  previewMode?: boolean;
  toolsMode?: boolean;
  viewMode?: EditorViewMode;
  onUploadImage?(
    file: File,
    metadata: { alt: string; caption: string; rights: string },
  ): Promise<Asset | null>;
};

type ScrollPoint = { source: number; preview: number };
type UploadMetadata = { alt: string; caption: string; rights: string };

const saveHandlers = new WeakMap<EditorView, () => void>();
let writeCommandInstalled = false;
const PublicationMarkdown = lazy(async () => ({
  default: (
    await import('../../../publishing/rendering/PublicationMarkdown.tsx')
  ).PublicationMarkdown,
}));

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

function interpolateScroll(
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

function vimStatus(view: EditorView | null, enabled: boolean) {
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

export function MarkdownPreview({
  value,
  assets,
}: Pick<EditorProps, 'value' | 'assets'>) {
  return (
    <Suspense
      fallback={
        <p className="studio-notice" role="status">
          Loading preview...
        </p>
      }
    >
      <PublicationMarkdown assets={assets} value={value} />
    </Suspense>
  );
}

export function Editor({
  value,
  onChange,
  onSave,
  assets,
  readOnly = false,
  busy = false,
  quiet = false,
  previewMode,
  toolsMode,
  viewMode,
  onUploadImage,
}: EditorProps & EditorOptions) {
  const host = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const imageDialog = useRef<HTMLDialogElement>(null);
  const valueRef = useRef(value);
  const changeRef = useRef(onChange);
  const saveRef = useRef(onSave);
  const uploadRef = useRef(onUploadImage);
  const uploadPending = useRef(false);
  const uploadAnchor = useRef<{ at: number; source: string } | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const mounted = useRef(true);
  const modeRef = useRef<EditorViewMode>(
    viewMode ?? (previewMode ? 'reading' : 'markdown'),
  );
  const readOnlyRef = useRef(readOnly);
  const followCursor = useRef(false);
  const scrollFrame = useRef(0);
  const ignoredScroll = useRef<{ source?: number; preview?: number }>({});
  const vimExtension = useRef(new Compartment());
  const readonlyExtension = useRef(new Compartment());
  const [localMode, setLocalMode] = useState<EditorViewMode>('markdown');
  const [localTools, setTools] = useState(false);
  const [vimEnabled, setVimEnabled] = useState(true);
  const [escapeMapping, setEscapeMapping] = useState('');
  const [asset, setAsset] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [vimMode, setVimMode] = useState('Vim');
  const mode = viewMode ?? (previewMode ? 'reading' : localMode);
  const tools = toolsMode ?? localTools;
  const words = useMemo(() => countWords(value), [value]);
  const outline = useMemo(() => manuscriptOutline(value), [value]);
  const sourceVisible = mode !== 'reading';

  function scrollPoints(editor: EditorView, rendered: HTMLDivElement) {
    const source = editor.scrollDOM;
    const sourceTop =
      editor.documentTop -
      source.getBoundingClientRect().top +
      source.scrollTop;
    const previewTop = rendered.getBoundingClientRect().top;
    const points: ScrollPoint[] = [{ source: 0, preview: 0 }];
    for (const block of rendered.querySelectorAll<HTMLElement>(
      '[data-source-line]',
    )) {
      const line = Number(block.dataset.sourceLine);
      if (!Number.isInteger(line) || line < 1 || line > editor.state.doc.lines)
        continue;
      points.push({
        source:
          sourceTop + editor.lineBlockAt(editor.state.doc.line(line).from).top,
        preview:
          block.getBoundingClientRect().top - previewTop + rendered.scrollTop,
      });
    }
    points.push({
      source: Math.max(0, source.scrollHeight - source.clientHeight),
      preview: Math.max(0, rendered.scrollHeight - rendered.clientHeight),
    });
    return points;
  }

  function setLinkedScroll(
    side: 'source' | 'preview',
    target: HTMLElement,
    top: number,
  ) {
    const bounded = Math.max(
      0,
      Math.min(top, target.scrollHeight - target.clientHeight),
    );
    if (Math.abs(target.scrollTop - bounded) < 1) return;
    ignoredScroll.current[side] = bounded;
    target.scrollTop = bounded;
  }

  function syncScroll(from: 'source' | 'preview') {
    const editor = view.current;
    const rendered = preview.current;
    if (modeRef.current !== 'split' || !editor || !rendered) return;
    const origin = from === 'source' ? editor.scrollDOM : rendered;
    const expected = ignoredScroll.current[from];
    if (expected !== undefined && Math.abs(origin.scrollTop - expected) < 2)
      return;
    delete ignoredScroll.current[from];
    const to = from === 'source' ? 'preview' : 'source';
    setLinkedScroll(
      to,
      to === 'source' ? editor.scrollDOM : rendered,
      interpolateScroll(origin.scrollTop, scrollPoints(editor, rendered), from),
    );
  }

  function revealCursor() {
    const editor = view.current;
    const rendered = preview.current;
    if (modeRef.current !== 'split' || !editor || !rendered) return;
    const source = editor.scrollDOM;
    const sourceTop =
      editor.documentTop -
      source.getBoundingClientRect().top +
      source.scrollTop;
    const cursorTop =
      sourceTop + editor.lineBlockAt(editor.state.selection.main.head).top;
    const renderedTop = interpolateScroll(
      cursorTop,
      scrollPoints(editor, rendered),
      'source',
    );
    if (
      renderedTop < rendered.scrollTop + 32 ||
      renderedTop > rendered.scrollTop + rendered.clientHeight - 64
    )
      setLinkedScroll(
        'preview',
        rendered,
        renderedTop - rendered.clientHeight * 0.35,
      );
  }

  useEffect(() => {
    changeRef.current = onChange;
    saveRef.current = onSave;
    uploadRef.current = onUploadImage;
    readOnlyRef.current = readOnly;
  }, [onChange, onSave, onUploadImage, readOnly]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('ae-writing-vim-escape');
      if (stored === 'jj' || stored === 'jk') setEscapeMapping(stored);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (escapeMapping)
        window.localStorage.setItem('ae-writing-vim-escape', escapeMapping);
      else window.localStorage.removeItem('ae-writing-vim-escape');
    } catch {}
  }, [escapeMapping]);
  useEffect(() => {
    modeRef.current = mode;
    ignoredScroll.current = {};
    if (mode !== 'reading') view.current?.requestMeasure();
  }, [mode]);
  useEffect(() => {
    if (mode !== 'split') return;
    if (followCursor.current) {
      followCursor.current = false;
      cancelAnimationFrame(scrollFrame.current);
      scrollFrame.current = requestAnimationFrame(revealCursor);
    }
  }, [mode, value]);
  useEffect(() => {
    const editor = view.current;
    if (!editor || value === valueRef.current) return;
    valueRef.current = value;
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: value },
      annotations: Transaction.addToHistory.of(false),
    });
  }, [value]);
  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    editor.dispatch({
      effects: [
        vimExtension.current.reconfigure(vimEnabled ? vim() : []),
        readonlyExtension.current.reconfigure([
          EditorState.readOnly.of(readOnly || mode === 'reading'),
          EditorView.editable.of(!readOnly && mode !== 'reading'),
        ]),
      ],
    });
    setVimMode(vimStatus(editor, vimEnabled));
  }, [mode, readOnly, vimEnabled]);
  useEffect(() => {
    if (!vimEnabled || !escapeMapping) return;
    Vim.map(escapeMapping, '<Esc>', 'insert');
    return () => Vim.unmap(escapeMapping, 'insert');
  }, [escapeMapping, vimEnabled]);
  useEffect(() => {
    if (!host.current) return;
    if (!writeCommandInstalled) {
      Vim.defineEx('write', 'w', (cm) => {
        const editor = cm.cm6 as EditorView;
        saveHandlers.get(editor)?.();
      });
      writeCommandInstalled = true;
    }
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: valueRef.current,
        extensions: [
          vimExtension.current.of(vimEnabled ? vim() : []),
          basicSetup,
          markdown({ codeLanguages: sourceCodeLanguages }),
          fencedSourceLines,
          editorTheme,
          syntaxHighlighting(editorHighlight),
          readonlyExtension.current.of([
            EditorState.readOnly.of(readOnly || modeRef.current === 'reading'),
            EditorView.editable.of(!readOnly && modeRef.current !== 'reading'),
          ]),
          EditorState.transactionFilter.of((transaction) =>
            uploadPending.current && transaction.docChanged ? [] : transaction,
          ),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({
            'aria-label': 'Manuscript source',
          }),
          EditorView.domEventHandlers({
            scroll: () => {
              syncScroll('source');
              return false;
            },
            paste: (event) => {
              const file = [...(event.clipboardData?.files ?? [])].find(
                (item) => item.type.startsWith('image/'),
              );
              if (!file || readOnlyRef.current || modeRef.current === 'reading')
                return false;
              event.preventDefault();
              openImageDetails(file, editor, editor.state.selection.main.head);
              return true;
            },
            drop: (event) => {
              const file = [...(event.dataTransfer?.files ?? [])].find((item) =>
                item.type.startsWith('image/'),
              );
              if (!file || readOnlyRef.current || modeRef.current === 'reading')
                return false;
              event.preventDefault();
              const at = editor.posAtCoords({
                x: event.clientX,
                y: event.clientY,
              });
              openImageDetails(
                file,
                editor,
                at ?? editor.state.selection.main.head,
              );
              return true;
            },
          }),
          EditorView.updateListener.of((update) => {
            if (update.selectionSet || update.docChanged)
              followCursor.current = true;
            if (!update.docChanged) return;
            valueRef.current = update.state.doc.toString();
            changeRef.current(valueRef.current);
          }),
        ],
      }),
    });
    view.current = editor;
    saveHandlers.set(editor, () => saveRef.current());
    setVimMode(vimStatus(editor, vimEnabled));
    const vimEditor = getCM(editor);
    vimEditor?.on('vim-mode-change', () => setVimMode(vimStatus(editor, true)));
    vimEditor?.on('vim-command-done', () =>
      setVimMode(vimStatus(editor, true)),
    );
    return () => {
      cancelAnimationFrame(scrollFrame.current);
      saveHandlers.delete(editor);
      editor.destroy();
      view.current = null;
    };
  }, []);

  function replaceSelection(text: string) {
    const editor = view.current;
    if (!editor) return;
    const selection = editor.state.selection.main;
    editor.dispatch({
      changes: { from: selection.from, to: selection.to, insert: text },
      selection: { anchor: selection.from + text.length },
    });
    editor.focus();
  }

  function apply(command: Parameters<typeof markdownInsertion>[0]) {
    const editor = view.current;
    if (!editor || readOnly || mode === 'reading' || uploadPending.current)
      return;
    const selection = editor.state.selection.main;
    replaceSelection(
      markdownInsertion(
        command,
        editor.state.sliceDoc(selection.from, selection.to),
      ),
    );
  }

  function prefixLines(prefix: string, remove: RegExp) {
    const editor = view.current;
    if (!editor || readOnly || mode === 'reading' || uploadPending.current)
      return;
    const selection = editor.state.selection.main;
    const from = editor.state.doc.lineAt(selection.from).from;
    const to = editor.state.doc.lineAt(selection.to).to;
    const replacement = editor.state
      .sliceDoc(from, to)
      .split('\n')
      .map((line) => `${prefix}${line.replace(remove, '')}`)
      .join('\n');
    editor.dispatch({
      changes: { from, to, insert: replacement },
      selection: { anchor: from, head: from + replacement.length },
    });
    editor.focus();
  }

  function insertAsset(editor: EditorView, image: Asset, at: number) {
    const alt = (image.alt || image.name).replace(/[\[\]\\]/g, '');
    const source = `\n![${alt}](asset:${image.id})\n`;
    const position = Math.max(0, Math.min(at, editor.state.doc.length));
    editor.dispatch({
      changes: { from: position, insert: source },
      selection: { anchor: position + source.length },
    });
    editor.focus();
  }

  function closeImageDetails() {
    imageDialog.current?.close();
  }

  function openImageDetails(file: File, editor = view.current, at?: number) {
    if (
      !editor ||
      !uploadRef.current ||
      uploadPending.current ||
      readOnlyRef.current ||
      modeRef.current === 'reading'
    )
      return;
    if (
      !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(
        file.type,
      )
    ) {
      setUploadError('Use a PNG, JPEG, WebP, or GIF image.');
      return;
    }
    returnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    uploadAnchor.current = {
      at: at ?? editor.state.selection.main.head,
      source: editor.state.doc.toString(),
    };
    setUploadError('');
    setPendingFile(file);
    imageDialog.current?.showModal();
  }

  async function submitImageDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const editor = view.current;
    const file = pendingFile;
    const upload = uploadRef.current;
    const anchor = uploadAnchor.current;
    if (!editor || !file || !upload || !anchor || uploadPending.current) return;
    const form = new FormData(event.currentTarget);
    const metadata: UploadMetadata = {
      alt: String(form.get('alt') ?? '').trim(),
      caption: String(form.get('caption') ?? '').trim(),
      rights: String(form.get('rights') ?? '').trim(),
    };
    if (!metadata.alt || !metadata.rights) {
      setUploadError('Alternative text and rights are required.');
      return;
    }
    uploadPending.current = true;
    setUploading(true);
    setUploadError('');
    try {
      const image = await upload(file, metadata);
      if (!image) {
        if (mounted.current)
          setUploadError('This image could not be uploaded.');
        return;
      }
      if (
        view.current !== editor ||
        readOnlyRef.current ||
        modeRef.current === 'reading'
      )
        return;
      const position =
        editor.state.doc.toString() === anchor.source
          ? anchor.at
          : editor.state.selection.main.head;
      uploadPending.current = false;
      insertAsset(editor, image, position);
      closeImageDetails();
    } catch {
      if (mounted.current)
        setUploadError(
          'This image could not be uploaded. Your manuscript is unchanged.',
        );
    } finally {
      uploadPending.current = false;
      if (mounted.current) setUploading(false);
    }
  }

  function insertSelectedAsset() {
    const image = assets.find((item) => item.id === asset);
    if (!image || !view.current || readOnly || mode === 'reading') return;
    insertAsset(view.current, image, view.current.state.selection.main.head);
    setAsset('');
  }

  return (
    <section
      className={`studio-editor publication-editor is-${mode}`}
      aria-label="Writing editor"
    >
      {!quiet && (
        <div className="studio-editor-bar">
          <div>
            {(['markdown', 'split', 'reading'] as const).map((item) => (
              <button
                aria-pressed={mode === item}
                key={item}
                onClick={() => setLocalMode(item)}
                type="button"
              >
                {item === 'markdown'
                  ? 'Write'
                  : item === 'split'
                    ? 'Split'
                    : 'Read'}
              </button>
            ))}
            <button
              aria-expanded={tools}
              onClick={() => setTools(!tools)}
              type="button"
            >
              Tools
            </button>
          </div>
          <button
            className="ws-primary"
            disabled={readOnly || busy}
            onClick={onSave}
            type="button"
          >
            {busy ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
      {sourceVisible && (
        <div
          className="publication-format-toolbar"
          role="toolbar"
          aria-label="Markdown formatting"
        >
          <button
            aria-label="Bold"
            disabled={readOnly || uploading}
            onClick={() => apply('bold')}
            type="button"
          >
            B
          </button>
          <button
            aria-label="Italic"
            disabled={readOnly || uploading}
            onClick={() => apply('italic')}
            type="button"
          >
            <i>I</i>
          </button>
          <button
            aria-label="Heading 1"
            disabled={readOnly || uploading}
            onClick={() => prefixLines('# ', /^#{1,6}\s*/)}
            type="button"
          >
            H1
          </button>
          <button
            aria-label="Heading 2"
            disabled={readOnly || uploading}
            onClick={() => prefixLines('## ', /^#{1,6}\s*/)}
            type="button"
          >
            H2
          </button>
          <button
            aria-label="Heading 3"
            disabled={readOnly || uploading}
            onClick={() => prefixLines('### ', /^#{1,6}\s*/)}
            type="button"
          >
            H3
          </button>
          <span aria-hidden="true" className="publication-toolbar-rule" />
          <button
            aria-label="List"
            disabled={readOnly || uploading}
            onClick={() => apply('list')}
            type="button"
          >
            •≡
          </button>
          <button
            aria-label="Ordered list"
            disabled={readOnly || uploading}
            onClick={() => prefixLines('1. ', /^\d+\.\s*/)}
            type="button"
          >
            1≡
          </button>
          <button
            aria-label="Quote"
            disabled={readOnly || uploading}
            onClick={() => apply('quote')}
            type="button"
          >
            “
          </button>
          <button
            aria-label="Link"
            disabled={readOnly || uploading}
            onClick={() => apply('link')}
            type="button"
          >
            ↗
          </button>
          <button
            aria-label="Image"
            disabled={readOnly || uploading || !onUploadImage}
            onClick={() => imageInput.current?.click()}
            type="button"
          >
            ▧
          </button>
          <button
            aria-label="Inline code"
            disabled={readOnly || uploading}
            onClick={() => apply('code')}
            type="button"
          >
            &lt;/&gt;
          </button>
          <button
            aria-label="Table"
            disabled={readOnly || uploading}
            onClick={() => apply('table')}
            type="button"
          >
            ▦
          </button>
          <span aria-hidden="true" className="publication-toolbar-rule" />
          <button
            aria-label="Undo"
            disabled={readOnly || uploading}
            onClick={() => view.current && undo(view.current)}
            type="button"
          >
            ↶
          </button>
          <button
            aria-label="Redo"
            disabled={readOnly || uploading}
            onClick={() => view.current && redo(view.current)}
            type="button"
          >
            ↷
          </button>
        </div>
      )}
      <input
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="publication-image-input"
        disabled={readOnly || uploading}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) openImageDetails(file);
        }}
        ref={imageInput}
        type="file"
      />
      {tools && sourceVisible && (
        <section className="studio-tools publication-editor-tools">
          <div className="studio-tool-row">
            <label className="studio-check">
              <input
                checked={vimEnabled}
                onChange={(event) => setVimEnabled(event.target.checked)}
                type="checkbox"
              />
              Vim mode
            </label>
            {vimEnabled && (
              <label>
                Insert escape
                <select
                  onChange={(event) => setEscapeMapping(event.target.value)}
                  value={escapeMapping}
                >
                  <option value="">Disabled</option>
                  <option value="jj">jj</option>
                  <option value="jk">jk</option>
                </select>
              </label>
            )}
          </div>
          {outline.length > 0 && (
            <details>
              <summary>Manuscript outline</summary>
              {outline.map((item) => (
                <button
                  key={item.line}
                  onClick={() => {
                    const editor = view.current;
                    if (!editor) return;
                    editor.dispatch({
                      selection: {
                        anchor: editor.state.doc.line(item.line + 1).from,
                      },
                      scrollIntoView: true,
                    });
                    editor.focus();
                  }}
                  type="button"
                >
                  {'—'.repeat(item.depth - 1)} {item.title}
                </button>
              ))}
            </details>
          )}
          <div className="studio-tool-row">
            <select
              aria-label="Image to insert"
              onChange={(event) => setAsset(event.target.value)}
              value={asset}
            >
              <option value="">Choose an image</option>
              {assets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button
              disabled={!asset || readOnly}
              onClick={insertSelectedAsset}
              type="button"
            >
              Insert image
            </button>
          </div>
        </section>
      )}
      {uploadError && !pendingFile && (
        <p className="publication-upload-error" role="alert">
          {uploadError}
        </p>
      )}
      <div className="publication-editor-panes">
        <div
          aria-hidden={!sourceVisible}
          className="publication-source"
          ref={host}
        />
        <div
          aria-hidden={mode === 'markdown'}
          className="publication-preview"
          onScroll={() => syncScroll('preview')}
          ref={preview}
        >
          <MarkdownPreview assets={assets} value={value} />
        </div>
      </div>
      <footer className="publication-editor-footer">
        <span>{words} words</span>
        <span>{Math.max(1, Math.ceil(words / 200))} min read</span>
        <span>
          {uploading ? 'Uploading image…' : vimMode}
          {vimEnabled && !uploading ? ' · :w' : ''}
        </span>
      </footer>
      <dialog
        className="ws-dialog publication-image-dialog"
        onCancel={(event) => {
          if (uploading) event.preventDefault();
        }}
        onClose={() => {
          setPendingFile(null);
          uploadAnchor.current = null;
          setUploadError('');
          const target = returnFocus.current;
          returnFocus.current = null;
          target?.focus();
        }}
        ref={imageDialog}
      >
        <form onSubmit={(event) => void submitImageDetails(event)}>
          <h2>Add image details</h2>
          <label>
            Alternative text
            <input
              autoFocus
              defaultValue={pendingFile?.name.replace(/\.[^/.]+$/, '') || ''}
              key={pendingFile?.name}
              name="alt"
              required
            />
          </label>
          <label>
            Caption
            <input name="caption" />
          </label>
          <label>
            Rights or license
            <input name="rights" required />
          </label>
          {uploadError && (
            <p className="publication-upload-error" role="alert">
              {uploadError}
            </p>
          )}
          <div className="studio-actions">
            <button
              disabled={uploading}
              onClick={closeImageDetails}
              type="button"
            >
              Cancel
            </button>
            <button className="ws-primary" disabled={uploading} type="submit">
              {uploading ? 'Adding...' : 'Add image'}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
