import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
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
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { vim, Vim } from '@replit/codemirror-vim';
import type { Asset, EditorProps } from '../../../contracts/writing/index.ts';
import {
  countWords,
  manuscriptOutline,
  markdownInsertion,
} from './editor-helpers.ts';

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

const saveHandlers = new WeakMap<EditorView, () => void>();
let writeCommandInstalled = false;
const PublicationMarkdown = lazy(async () => ({
  default: (
    await import('../../../publishing/rendering/PublicationMarkdown.tsx')
  ).PublicationMarkdown,
}));

const editorTheme = EditorView.theme({
  '&': { backgroundColor: 'transparent', color: 'var(--ae-ink)' },
  '.cm-content': { caretColor: 'var(--ae-theme-accent)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--ae-theme-accent)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection':
    { backgroundColor: 'var(--ae-hover-surface)' },
  '.cm-link': { color: 'var(--ae-theme-accent)', textDecoration: 'underline' },
  '.cm-matchingBracket': {
    backgroundColor: 'var(--ae-hover-surface)',
    outline: '1px solid var(--ae-hover-line)',
  },
});

const editorHighlight = HighlightStyle.define([
  {
    tag: [tags.keyword, tags.controlKeyword, tags.operatorKeyword],
    color: 'var(--ae-theme-accent)',
  },
  {
    tag: [tags.string, tags.special(tags.string)],
    color: 'var(--ae-status-ready)',
  },
  { tag: [tags.comment, tags.meta], color: 'var(--ae-muted)' },
  {
    tag: [tags.number, tags.bool, tags.null],
    color: 'var(--ae-status-attention)',
  },
  {
    tag: [tags.heading, tags.heading1, tags.heading2, tags.heading3],
    color: 'var(--ae-ink-strong)',
    fontWeight: '700',
  },
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
  const view = useRef<EditorView | null>(null);
  const valueRef = useRef(value);
  const changeRef = useRef(onChange);
  const saveRef = useRef(onSave);
  const uploadRef = useRef(onUploadImage);
  const uploadingRef = useRef(false);
  const mounted = useRef(true);
  const vimExtension = useRef(new Compartment());
  const readonlyExtension = useRef(new Compartment());
  const [localMode, setLocalMode] = useState<EditorViewMode>('markdown');
  const [localTools, setTools] = useState(false);
  const [vimEnabled, setVimEnabled] = useState(true);
  const [escapeMapping, setEscapeMapping] = useState('');
  const [asset, setAsset] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const mode = viewMode ?? (previewMode ? 'reading' : localMode);
  const tools = toolsMode ?? localTools;
  const words = useMemo(() => countWords(value), [value]);
  const outline = useMemo(() => manuscriptOutline(value), [value]);

  useEffect(() => {
    changeRef.current = onChange;
    saveRef.current = onSave;
    uploadRef.current = onUploadImage;
  }, [onChange, onSave, onUploadImage]);
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
    if (value === valueRef.current || !view.current) return;
    valueRef.current = value;
    view.current.dispatch({
      changes: { from: 0, to: view.current.state.doc.length, insert: value },
    });
  }, [value]);
  useEffect(() => {
    if (mode !== 'reading') view.current?.requestMeasure();
  }, [mode]);
  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    editor.dispatch({
      effects: [
        vimExtension.current.reconfigure(vimEnabled ? vim() : []),
        readonlyExtension.current.reconfigure([
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
        ]),
      ],
    });
  }, [vimEnabled, readOnly]);
  useEffect(() => {
    if (!vimEnabled || !escapeMapping) return;
    Vim.map(escapeMapping, '<Esc>', 'insert');
    return () => Vim.unmap(escapeMapping, 'insert');
  }, [vimEnabled, escapeMapping]);
  useEffect(() => {
    if (!host.current) return;
    const save = () => saveRef.current();
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
          editorTheme,
          syntaxHighlighting(editorHighlight),
          readonlyExtension.current.of([
            EditorState.readOnly.of(readOnly),
            EditorView.editable.of(!readOnly),
          ]),
          EditorState.transactionFilter.of((transaction) =>
            uploadingRef.current && transaction.docChanged ? [] : transaction,
          ),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': 'Manuscript body' }),
          EditorView.domEventHandlers({
            paste: (event) => {
              const file = [...(event.clipboardData?.files ?? [])].find(
                (item) => item.type.startsWith('image/'),
              );
              if (!file || !uploadRef.current || readOnly) return false;
              event.preventDefault();
              void insertUploadedImage(file, editor);
              return true;
            },
            drop: (event) => {
              const file = [...(event.dataTransfer?.files ?? [])].find((item) =>
                item.type.startsWith('image/'),
              );
              if (!file || !uploadRef.current || readOnly) return false;
              event.preventDefault();
              void insertUploadedImage(file, editor);
              return true;
            },
          }),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            valueRef.current = update.state.doc.toString();
            changeRef.current(valueRef.current);
          }),
        ],
      }),
    });
    view.current = editor;
    saveHandlers.set(editor, save);
    return () => {
      saveHandlers.delete(editor);
      editor.destroy();
      view.current = null;
    };
  }, []);

  async function insertUploadedImage(file: File, editor = view.current) {
    if (!editor || uploadingRef.current || !uploadRef.current) return;
    const at = editor.state.selection.main.head;
    const fallback = file.name.replace(/\.[^/.]+$/, '') || 'Image';
    const alt = window.prompt('Alternative text', fallback);
    if (alt === null) return;
    const caption = window.prompt('Caption (optional)', '');
    if (caption === null) return;
    const rights = window.prompt('Rights or license', '');
    if (!rights?.trim()) return;
    uploadingRef.current = true;
    setUploadError('');
    setUploading(true);
    try {
      const image = await uploadRef.current(file, {
        alt: alt.trim() || fallback,
        caption: caption.trim(),
        rights: rights.trim(),
      });
      uploadingRef.current = false;
      if (image && view.current === editor) insertAsset(editor, image, at);
    } catch {
      if (mounted.current)
        setUploadError(
          'This image could not be uploaded. Your manuscript is unchanged.',
        );
    } finally {
      uploadingRef.current = false;
      if (mounted.current) setUploading(false);
    }
  }

  function insertAsset(
    editor: EditorView,
    image: Asset,
    at = editor.state.selection.main.head,
  ) {
    const alt = (image.alt || image.name).replace(/[\[\]\\]/g, '');
    const body = `\n![${alt}](asset:${image.id})\n`;
    const position = Math.min(at, editor.state.doc.length);
    editor.dispatch({
      changes: { from: position, insert: body },
      selection: { anchor: position + body.length },
    });
    editor.focus();
    setTools(false);
  }

  function insertSelectedAsset() {
    const image = assets.find((item) => item.id === asset);
    if (image && view.current) insertAsset(view.current, image);
  }

  function apply(command: Parameters<typeof markdownInsertion>[0]) {
    const editor = view.current;
    if (!editor || readOnly || mode === 'reading') return;
    const selection = editor.state.selection.main;
    const text = markdownInsertion(
      command,
      editor.state.sliceDoc(selection.from, selection.to),
    );
    editor.dispatch({
      changes: { from: selection.from, to: selection.to, insert: text },
      selection: { anchor: selection.from + text.length },
    });
    editor.focus();
  }

  return (
    <section className="studio-editor" aria-label="Writing editor">
      {!quiet && (
        <div className="studio-editor-bar">
          <div>
            {(['markdown', 'split', 'reading'] as const).map((item) => (
              <button
                aria-pressed={mode === item}
                key={item}
                onClick={() => setLocalMode(item)}
              >
                {item === 'markdown'
                  ? 'Markdown'
                  : item === 'split'
                    ? 'Split'
                    : 'Read'}
              </button>
            ))}
            <button aria-expanded={tools} onClick={() => setTools(!tools)}>
              Tools
            </button>
          </div>
          <button
            className="ws-primary"
            disabled={readOnly || busy}
            onClick={onSave}
          >
            {busy ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
      {tools && mode !== 'reading' && (
        <section className="studio-tools">
          <div
            className="studio-format-toolbar"
            role="toolbar"
            aria-label="Markdown formatting"
          >
            {(
              [
                ['bold', 'Bold'],
                ['italic', 'Italic'],
                ['heading', 'Heading'],
                ['link', 'Link'],
                ['code', 'Code'],
                ['list', 'List'],
                ['quote', 'Quote'],
                ['table', 'Table'],
              ] as const
            ).map(([command, label]) => (
              <button
                disabled={readOnly}
                key={command}
                onClick={() => apply(command)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
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
            <button disabled={!asset || readOnly} onClick={insertSelectedAsset}>
              Insert image
            </button>
            {onUploadImage && (
              <label className="studio-upload">
                Add image with details
                <input
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  disabled={uploading || readOnly}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = '';
                    if (file) void insertUploadedImage(file);
                  }}
                  type="file"
                />
              </label>
            )}
          </div>
        </section>
      )}
      {uploadError && (
        <p className="studio-notice" role="alert">
          {uploadError}
        </p>
      )}
      <div
        className={`studio-editor-workbench studio-editor-workbench-${mode}`}
      >
        <div
          aria-hidden={mode === 'reading'}
          className="studio-cm"
          ref={host}
        />
        <div
          aria-hidden={mode === 'markdown'}
          className="studio-editor-preview"
        >
          <MarkdownPreview assets={assets} value={value} />
        </div>
      </div>
      <footer className="studio-editor-status">
        <span>{words} words</span>
        <span>{Math.max(1, Math.ceil(words / 200))} min read</span>
        <span>{vimEnabled ? 'Vim / :w to save' : 'Markdown'}</span>
      </footer>
    </section>
  );
}
