import type { FormEvent, RefObject, SyntheticEvent } from 'react';
import type { Asset } from '../../../contracts/writing/index.ts';
import type { EditorViewMode } from './editor-config.ts';
import type {
  ManuscriptOutlineItem,
  MarkdownCommand,
} from './editor-helpers.ts';

const modeLabels: Record<EditorViewMode, string> = {
  markdown: 'Write',
  split: 'Split',
  reading: 'Read',
};

type EditorBarProps = {
  mode: EditorViewMode;
  tools: boolean;
  busy: boolean;
  readOnly: boolean;
  onModeChange(mode: EditorViewMode): void;
  onToolsChange(open: boolean): void;
  onSave(): void;
};

export function EditorBar({
  mode,
  tools,
  busy,
  readOnly,
  onModeChange,
  onToolsChange,
  onSave,
}: EditorBarProps) {
  return (
    <div className="studio-editor-bar">
      <div>
        {(['markdown', 'split', 'reading'] as const).map((item) => (
          <button
            aria-pressed={mode === item}
            key={item}
            onClick={() => onModeChange(item)}
            type="button"
          >
            {modeLabels[item]}
          </button>
        ))}
        <button
          aria-expanded={tools}
          onClick={() => onToolsChange(!tools)}
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
  );
}

type FormattingToolbarProps = {
  readOnly: boolean;
  uploading: boolean;
  canUploadImage: boolean;
  onApply(command: MarkdownCommand): void;
  onPrefixLines(prefix: string, remove: RegExp): void;
  onChooseImage(): void;
  onUndo(): void;
  onRedo(): void;
};

export function FormattingToolbar({
  readOnly,
  uploading,
  canUploadImage,
  onApply,
  onPrefixLines,
  onChooseImage,
  onUndo,
  onRedo,
}: FormattingToolbarProps) {
  const disabled = readOnly || uploading;
  return (
    <div
      className="publication-format-toolbar"
      role="toolbar"
      aria-label="Markdown formatting"
    >
      <button
        aria-label="Bold"
        disabled={disabled}
        onClick={() => onApply('bold')}
        type="button"
      >
        B
      </button>
      <button
        aria-label="Italic"
        disabled={disabled}
        onClick={() => onApply('italic')}
        type="button"
      >
        <i>I</i>
      </button>
      <button
        aria-label="Heading 1"
        disabled={disabled}
        onClick={() => onPrefixLines('# ', /^#{1,6}\s*/)}
        type="button"
      >
        H1
      </button>
      <button
        aria-label="Heading 2"
        disabled={disabled}
        onClick={() => onPrefixLines('## ', /^#{1,6}\s*/)}
        type="button"
      >
        H2
      </button>
      <button
        aria-label="Heading 3"
        disabled={disabled}
        onClick={() => onPrefixLines('### ', /^#{1,6}\s*/)}
        type="button"
      >
        H3
      </button>
      <span aria-hidden="true" className="publication-toolbar-rule" />
      <button
        aria-label="List"
        disabled={disabled}
        onClick={() => onApply('list')}
        type="button"
      >
        •≡
      </button>
      <button
        aria-label="Ordered list"
        disabled={disabled}
        onClick={() => onPrefixLines('1. ', /^\d+\.\s*/)}
        type="button"
      >
        1≡
      </button>
      <button
        aria-label="Quote"
        disabled={disabled}
        onClick={() => onApply('quote')}
        type="button"
      >
        “
      </button>
      <button
        aria-label="Link"
        disabled={disabled}
        onClick={() => onApply('link')}
        type="button"
      >
        ↗
      </button>
      <button
        aria-label="Image"
        disabled={disabled || !canUploadImage}
        onClick={onChooseImage}
        type="button"
      >
        ▧
      </button>
      <button
        aria-label="Inline code"
        disabled={disabled}
        onClick={() => onApply('code')}
        type="button"
      >
        &lt;/&gt;
      </button>
      <button
        aria-label="Table"
        disabled={disabled}
        onClick={() => onApply('table')}
        type="button"
      >
        ▦
      </button>
      <span aria-hidden="true" className="publication-toolbar-rule" />
      <button
        aria-label="Undo"
        disabled={disabled}
        onClick={onUndo}
        type="button"
      >
        ↶
      </button>
      <button
        aria-label="Redo"
        disabled={disabled}
        onClick={onRedo}
        type="button"
      >
        ↷
      </button>
    </div>
  );
}

type EditorToolsProps = {
  vimEnabled: boolean;
  escapeMapping: string;
  outline: readonly ManuscriptOutlineItem[];
  assets: Asset[];
  asset: string;
  readOnly: boolean;
  onVimEnabledChange(enabled: boolean): void;
  onEscapeMappingChange(mapping: string): void;
  onOutlineSelect(line: number): void;
  onAssetChange(asset: string): void;
  onInsertAsset(): void;
};

export function EditorTools({
  vimEnabled,
  escapeMapping,
  outline,
  assets,
  asset,
  readOnly,
  onVimEnabledChange,
  onEscapeMappingChange,
  onOutlineSelect,
  onAssetChange,
  onInsertAsset,
}: EditorToolsProps) {
  return (
    <section className="studio-tools publication-editor-tools">
      <div className="studio-tool-row">
        <label className="studio-check">
          <input
            checked={vimEnabled}
            onChange={(event) => onVimEnabledChange(event.target.checked)}
            type="checkbox"
          />
          Vim mode
        </label>
        {vimEnabled && (
          <label>
            Insert escape
            <select
              onChange={(event) => onEscapeMappingChange(event.target.value)}
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
              onClick={() => onOutlineSelect(item.line)}
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
          onChange={(event) => onAssetChange(event.target.value)}
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
          onClick={onInsertAsset}
          type="button"
        >
          Insert image
        </button>
      </div>
    </section>
  );
}

type ImageInputProps = {
  input: RefObject<HTMLInputElement | null>;
  disabled: boolean;
  onFile(file: File): void;
};

export function ImageInput({ input, disabled, onFile }: ImageInputProps) {
  return (
    <input
      accept="image/png,image/jpeg,image/webp,image/gif"
      className="publication-image-input"
      disabled={disabled}
      onChange={(event) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (file) onFile(file);
      }}
      ref={input}
      type="file"
    />
  );
}

type ImageDialogProps = {
  dialog: RefObject<HTMLDialogElement | null>;
  pendingFile: File | null;
  uploadError: string;
  uploading: boolean;
  onCancel(event: SyntheticEvent<HTMLDialogElement>): void;
  onClose(): void;
  onSubmit(event: FormEvent<HTMLFormElement>): void | Promise<void>;
  onCancelButton(): void;
};

export function ImageDialog({
  dialog,
  pendingFile,
  uploadError,
  uploading,
  onCancel,
  onClose,
  onSubmit,
  onCancelButton,
}: ImageDialogProps) {
  return (
    <dialog
      className="ws-dialog publication-image-dialog"
      onCancel={onCancel}
      onClose={onClose}
      ref={dialog}
    >
      <form onSubmit={(event) => void onSubmit(event)}>
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
          <button disabled={uploading} onClick={onCancelButton} type="button">
            Cancel
          </button>
          <button className="ws-primary" disabled={uploading} type="submit">
            {uploading ? 'Adding...' : 'Add image'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
