import { useEffect, useMemo, useRef, useState } from 'react';
import { basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { vim, Vim } from '@replit/codemirror-vim';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { EditorProps } from '../../../contracts/writing/index.ts';
import {
  countWords,
  manuscriptOutline,
  markdownInsertion,
} from './editor-helpers.ts';

const assetId = (url: string) =>
  url.startsWith('asset:') ? url.slice(6) : null;
let activeSave: (() => void) | null = null;
export function MarkdownPreview({
  value,
  assets,
}: Pick<EditorProps, 'value' | 'assets'>) {
  const library = new Map(assets.map((item) => [item.id, item]));
  return (
    <article className="studio-preview">
      <Markdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url, key) =>
          key === 'src' && assetId(url) && library.has(assetId(url) ?? '')
            ? url
            : key === 'href' && /^(https?:|mailto:|#)/.test(url)
              ? url
              : ''
        }
        components={{
          img: ({ src = '', alt = '' }) => {
            const item = library.get(assetId(src) ?? '');
            return item ? (
              <span className="studio-inline-image">
                <img src={item.dataUrl} alt={alt || item.alt} />
                {item.caption && <small>{item.caption}</small>}
              </span>
            ) : (
              <span>Local image unavailable</span>
            );
          },
        }}
      >
        {value}
      </Markdown>
    </article>
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
}: EditorProps & {
  busy?: boolean;
  quiet?: boolean;
  previewMode?: boolean;
  toolsMode?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null),
    valueRef = useRef(value),
    changeRef = useRef(onChange),
    saveRef = useRef(onSave);
  const [localPreview, setPreview] = useState(false),
    [localTools, setTools] = useState(false),
    [vimEnabled, setVimEnabled] = useState(true),
    [jj, setJj] = useState(false),
    [asset, setAsset] = useState('');
  const preview = previewMode ?? localPreview,
    tools = toolsMode ?? localTools;
  const words = useMemo(() => countWords(value), [value]);
  const outline = useMemo(() => manuscriptOutline(value), [value]);
  useEffect(() => {
    changeRef.current = onChange;
    saveRef.current = onSave;
  }, [onChange, onSave]);
  useEffect(() => {
    if (value === valueRef.current) return;
    valueRef.current = value;
    view.current?.dispatch({
      changes: { from: 0, to: view.current.state.doc.length, insert: value },
    });
  }, [value]);
  useEffect(() => {
    if (!host.current || preview) return;
    const save = () => saveRef.current();
    Vim.defineEx('write', 'w', () => activeSave?.());
    if (vimEnabled && jj) Vim.map('jj', '<Esc>', 'insert');
    activeSave = save;
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: valueRef.current,
        extensions: [
          ...(vimEnabled ? [vim()] : []),
          basicSetup,
          markdown(),
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': 'Manuscript body' }),
          EditorView.domEventHandlers({
            focus: () => {
              activeSave = save;
            },
            mousedown: () => {
              activeSave = save;
            },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              valueRef.current = update.state.doc.toString();
              changeRef.current(valueRef.current);
            }
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      if (jj) Vim.unmap('jj', 'insert');
      if (activeSave === save) activeSave = null;
      editor.destroy();
      view.current = null;
    };
  }, [preview, vimEnabled, jj, readOnly]);
  const insert = () => {
    const image = assets.find((item) => item.id === asset),
      editor = view.current;
    if (!image || !editor) return;
    const body = `\n![${(image.alt || image.name).replace(/[\[\]\\]/g, '')}](asset:${image.id})\n`,
      at = editor.state.selection.main.head;
    editor.dispatch({
      changes: { from: at, insert: body },
      selection: { anchor: at + body.length },
    });
    editor.focus();
    setTools(false);
  };
  const apply = (command: Parameters<typeof markdownInsertion>[0]) => {
    const editor = view.current;
    if (!editor || readOnly || preview) return;
    const selection = editor.state.selection.main;
    const selected = editor.state.sliceDoc(selection.from, selection.to);
    const text = markdownInsertion(command, selected);
    editor.dispatch({
      changes: { from: selection.from, to: selection.to, insert: text },
      selection: { anchor: selection.from + text.length },
    });
    editor.focus();
  };
  return (
    <section className="studio-editor" aria-label="Writing editor">
      {!quiet && (
        <div className="studio-editor-bar">
          <div>
            <button aria-pressed={!preview} onClick={() => setPreview(false)}>
              Edit
            </button>
            <button aria-pressed={preview} onClick={() => setPreview(true)}>
              Preview
            </button>
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
      {tools && !preview && (
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
                key={command}
                type="button"
                disabled={preview || readOnly}
                onClick={() => apply(command)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="studio-tool-row">
            <label className="studio-check">
              <input
                type="checkbox"
                checked={vimEnabled}
                onChange={(e) => setVimEnabled(e.target.checked)}
              />
              Vim mode
            </label>
            {vimEnabled && (
              <label className="studio-check">
                <input
                  type="checkbox"
                  checked={jj}
                  onChange={(e) => setJj(e.target.checked)}
                />
                Use jj to escape
              </label>
            )}
          </div>
          {outline.length > 0 && (
            <details>
              <summary>Manuscript outline</summary>
              {outline.map((item) => (
                <button
                  key={item.line}
                  disabled={preview}
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
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
            >
              <option value="">Choose an image</option>
              {assets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button disabled={!asset || preview || readOnly} onClick={insert}>
              Insert image
            </button>
          </div>
        </section>
      )}
      {preview ? (
        <MarkdownPreview value={value} assets={assets} />
      ) : (
        <div className="studio-cm" ref={host} />
      )}
      <footer className="studio-editor-status">
        <span>{words} words</span>
        <span>{Math.max(1, Math.ceil(words / 200))} min read</span>
        <span>{vimEnabled ? 'Vim / :w to save' : 'Markdown'}</span>
      </footer>
    </section>
  );
}
