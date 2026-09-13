import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { redo, undo } from '@codemirror/commands';
import { Compartment, EditorState, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { getCM, vim, Vim } from '@replit/codemirror-vim';
import type { Asset, EditorProps } from '../../../contracts/writing/index.ts';
import {
  createEditor,
  destroyEditor,
  interpolateScroll,
  type EditorOptions,
  type EditorViewMode,
  type ScrollPoint,
  type UploadMetadata,
  vimStatus,
} from './editor-config.ts';
import {
  EditorBar,
  EditorTools,
  FormattingToolbar,
  ImageDialog,
  ImageInput,
} from './editor-controls.tsx';
import {
  countWords,
  manuscriptOutline,
  markdownInsertion,
  type MarkdownCommand,
} from './editor-helpers.ts';
import './editor.css';

const PublicationMarkdown = lazy(async () => ({
  default: (
    await import('../../../publishing/rendering/PublicationMarkdown.tsx')
  ).PublicationMarkdown,
}));

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
  const vimExtension = useRef(new Compartment());
  const readonlyExtension = useRef(new Compartment());
  const followCursor = useRef(false);
  const scrollFrame = useRef(0);
  const ignoredScroll = useRef<{ source?: number; preview?: number }>({});
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
    const editor = createEditor({
      parent: host.current,
      doc: valueRef.current,
      vimEnabled,
      readOnly,
      mode: modeRef.current,
      vimCompartment: vimExtension.current,
      readonlyCompartment: readonlyExtension.current,
      isUploadPending: () => uploadPending.current,
      onScroll: () => syncScroll('source'),
      onPaste: (event, current) => {
        const file = [...(event.clipboardData?.files ?? [])].find((item) =>
          item.type.startsWith('image/'),
        );
        if (!file || readOnlyRef.current || modeRef.current === 'reading')
          return false;
        event.preventDefault();
        openImageDetails(file, current, current.state.selection.main.head);
        return true;
      },
      onDrop: (event, current) => {
        const file = [...(event.dataTransfer?.files ?? [])].find((item) =>
          item.type.startsWith('image/'),
        );
        if (!file || readOnlyRef.current || modeRef.current === 'reading')
          return false;
        event.preventDefault();
        const at = current.posAtCoords({
          x: event.clientX,
          y: event.clientY,
        });
        openImageDetails(
          file,
          current,
          at ?? current.state.selection.main.head,
        );
        return true;
      },
      onActivity: () => {
        followCursor.current = true;
      },
      onChange: (nextValue) => {
        valueRef.current = nextValue;
        changeRef.current(nextValue);
      },
      onSave: () => saveRef.current(),
    });
    view.current = editor;
    setVimMode(vimStatus(editor, vimEnabled));
    const vimEditor = getCM(editor);
    vimEditor?.on('vim-mode-change', () => setVimMode(vimStatus(editor, true)));
    vimEditor?.on('vim-command-done', () =>
      setVimMode(vimStatus(editor, true)),
    );
    return () => {
      cancelAnimationFrame(scrollFrame.current);
      destroyEditor(editor);
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

  function apply(command: MarkdownCommand) {
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

  function selectOutline(line: number) {
    const editor = view.current;
    if (!editor) return;
    editor.dispatch({
      selection: {
        anchor: editor.state.doc.line(line + 1).from,
      },
      scrollIntoView: true,
    });
    editor.focus();
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
        <EditorBar
          busy={busy}
          mode={mode}
          onModeChange={setLocalMode}
          onSave={onSave}
          onToolsChange={setTools}
          readOnly={readOnly}
          tools={tools}
        />
      )}
      {sourceVisible && (
        <FormattingToolbar
          canUploadImage={Boolean(onUploadImage)}
          onApply={apply}
          onChooseImage={() => imageInput.current?.click()}
          onPrefixLines={prefixLines}
          onRedo={() => view.current && redo(view.current)}
          onUndo={() => view.current && undo(view.current)}
          readOnly={readOnly}
          uploading={uploading}
        />
      )}
      <ImageInput
        disabled={readOnly || uploading}
        input={imageInput}
        onFile={openImageDetails}
      />
      {tools && sourceVisible && (
        <EditorTools
          asset={asset}
          assets={assets}
          escapeMapping={escapeMapping}
          onAssetChange={setAsset}
          onEscapeMappingChange={setEscapeMapping}
          onInsertAsset={insertSelectedAsset}
          onOutlineSelect={selectOutline}
          onVimEnabledChange={setVimEnabled}
          outline={outline}
          readOnly={readOnly}
          vimEnabled={vimEnabled}
        />
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
      <ImageDialog
        dialog={imageDialog}
        onCancel={(event) => {
          if (uploading) event.preventDefault();
        }}
        onCancelButton={closeImageDetails}
        onClose={() => {
          setPendingFile(null);
          uploadAnchor.current = null;
          setUploadError('');
          const target = returnFocus.current;
          returnFocus.current = null;
          target?.focus();
        }}
        onSubmit={submitImageDetails}
        pendingFile={pendingFile}
        uploadError={uploadError}
        uploading={uploading}
      />
    </section>
  );
}
