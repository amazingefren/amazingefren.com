import { useEffect, useState, type ChangeEvent } from 'react';
import type {
  Asset,
  StudioProps,
  StudioState,
} from '../../../contracts/writing/index.ts';
import { maximumImageBytes, prepareImage } from './image-compression.ts';
export function MediaView(props: StudioProps) {
  const [state, setState] = useState(props.state),
    [selected, setSelected] = useState(''),
    [draft, setDraft] = useState<Asset | null>(null),
    [message, setMessage] = useState(''),
    [processing, setProcessing] = useState(false);
  const current =
      draft ?? state.assets.find((item) => item.id === selected) ?? null,
    dirty = Boolean(draft);
  useEffect(() => setState(props.state), [props.state]);
  useEffect(() => {
    props.onDirtyChange?.(dirty);
    const block = (event: Event) => {
      if (dirty) {
        event.preventDefault();
        setMessage('Save image details before leaving Media.');
      }
    };
    window.addEventListener('writing:before-navigate', block);
    return () => {
      window.removeEventListener('writing:before-navigate', block);
      props.onDirtyChange?.(false);
    };
  }, [dirty, props.onDirtyChange]);
  const run = async (
    command: Parameters<StudioProps['execute']>[0],
  ): Promise<StudioState | null> => {
    const result = await props.execute(command);
    if (result.ok) {
      setState(result.value);
      return result.value;
    }
    setMessage(result.error.message);
    return null;
  };
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || processing || props.busy) return;
    setProcessing(true);
    setMessage(file.size > maximumImageBytes ? 'Compressing image...' : '');
    try {
      const image = await prepareImage(file);
      const next = await run({
        operation: 'studio.assets.add',
        input: {
          name: image.name,
          mime: image.mime,
          dataUrl: image.dataUrl,
          alt: '',
          caption: '',
          rights: '',
        },
      });
      if (next) {
        setSelected(next.assets.at(-1)?.id ?? '');
        setMessage(
          image.compressed ? 'Image compressed to WebP before upload.' : '',
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'This image could not be read.',
      );
    } finally {
      setProcessing(false);
    }
  };
  return (
    <section className="studio-page">
      <div className="studio-switcher">
        <span>
          {state.assets.length} {props.audience === 'guest' ? 'guest ' : ''}
          images
        </span>
        <label className="studio-upload">
          Add image
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={props.busy || processing}
            onChange={upload}
          />
        </label>
      </div>
      <header className="studio-heading">
        <h1>Media library</h1>
        <p>PNG, JPEG, WebP or GIF / larger images compress to WebP</p>
      </header>
      {message && (
        <p className="studio-notice" role="alert">
          {message}
        </p>
      )}
      <section className="studio-gallery">
        {state.assets.map((item) => (
          <button
            aria-pressed={item.id === current?.id}
            key={item.id}
            onClick={() => {
              if (draft && draft.id !== item.id)
                return setMessage(
                  'Save image details before selecting another image.',
                );
              setSelected(item.id);
            }}
          >
            <img src={item.dataUrl} alt={item.alt || item.name} />
            <strong>{item.name}</strong>
            <small>{item.mime.replace('image/', '').toUpperCase()}</small>
          </button>
        ))}
      </section>
      {current && (
        <section className="studio-form studio-media-details">
          <h2>{current.name}</h2>
          <label>
            Alt text
            <input
              value={current.alt}
              onChange={(e) => setDraft({ ...current, alt: e.target.value })}
            />
          </label>
          <label>
            Caption
            <textarea
              value={current.caption}
              onChange={(e) =>
                setDraft({ ...current, caption: e.target.value })
              }
            />
          </label>
          <label>
            Rights
            <input
              value={current.rights}
              onChange={(e) => setDraft({ ...current, rights: e.target.value })}
            />
          </label>
          <div className="studio-actions">
            <button
              className="ws-primary"
              disabled={props.busy}
              onClick={async () => {
                if (
                  await run({
                    operation: 'studio.assets.update',
                    input: {
                      id: current.id,
                      alt: current.alt,
                      caption: current.caption,
                      rights: current.rights,
                    },
                  })
                )
                  setDraft(null);
              }}
            >
              Save image details
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
