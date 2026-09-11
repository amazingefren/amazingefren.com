'use client';
import { useEffect, useRef, useState } from 'react';
import type {
  Command,
  Result,
  StudioPort,
  StudioProps,
  StudioState,
} from '../../contracts/writing/index.ts';
import type { WorkspacePageProps } from '../contracts/index.ts';
import { createGuestWritingPort } from '../../studio/writing/guest.ts';
import { isStudioState } from '../../studio/writing/validation.ts';
import { MediaView, NotesView, PublicationsView } from './writing/index.ts';

export function WritingPage(
  props: WorkspacePageProps & { section: 'documents' | 'publishing' },
) {
  const port = useRef<StudioPort | null>(null);
  const pending = useRef(false);
  const media = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<StudioState>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let disposed = false;
    try {
      port.current =
        props.audience === 'guest'
          ? createGuestWritingPort(window.sessionStorage)
          : createOwnerPort();
      void port.current
        .read()
        .then((result) => {
          if (disposed) return;
          if (result.ok) setState(result.value);
          else setError(result.error.message);
        })
        .catch(() => {
          if (!disposed) setError('Writing storage could not load.');
        });
    } catch {
      setError('Writing storage is unavailable.');
    }
    return () => {
      disposed = true;
      props.onDirtyChange?.(false);
    };
  }, [props.audience]);
  async function execute(command: Command): Promise<Result<StudioState>> {
    if (!port.current || pending.current)
      return {
        ok: false,
        error: {
          code: 'unavailable',
          message: 'Wait for the current save to finish.',
        },
      };
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await port.current.execute(command);
      if (result.ok) setState(result.value);
      else setError(result.error.message);
      return result;
    } catch {
      const result = {
        ok: false as const,
        error: {
          code: 'unavailable' as const,
          message:
            'Changes could not be saved. Your editor text is still here.',
        },
      };
      setError(result.error.message);
      return result;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  if (!state)
    return (
      <section className="writing-surface">
        <p role={error ? 'alert' : 'status'}>{error || 'Opening writing...'}</p>
        {error && (
          <button onClick={() => window.location.reload()}>Retry</button>
        )}
      </section>
    );
  const writing: StudioProps = {
    state,
    execute,
    busy,
    audience: props.audience,
    recordId: props.recordId,
    onDirtyChange: props.onDirtyChange,
    navigate(section, id) {
      if (section === 'media') media.current?.showModal();
      else props.navigate(section, id);
    },
  };
  return (
    <section className="writing-surface">
      {error && (
        <div role="alert" className="ws-error">
          {error}
          <button onClick={() => setError('')}>Dismiss</button>
        </div>
      )}
      {props.section === 'documents' ? (
        <NotesView {...writing} />
      ) : (
        <PublicationsView {...writing} />
      )}
      <dialog ref={media} className="ws-dialog writing-media-dialog">
        <button onClick={() => media.current?.close()}>Close images</button>
        <MediaView {...writing} />
      </dialog>
    </section>
  );
}

function createOwnerPort(): StudioPort {
  async function execute(command: Command): Promise<Result<StudioState>> {
    try {
      const response = await fetch(
        `/api/writing/operations/${command.operation}`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(command),
        },
      );
      const result: unknown = await response.json();
      if (typeof result === 'object' && result !== null && 'ok' in result) {
        if (
          result.ok === true &&
          'value' in result &&
          isStudioState(result.value) &&
          !result.value.synthetic
        )
          return { ok: true, value: result.value };
        if (
          result.ok === false &&
          'error' in result &&
          typeof result.error === 'object' &&
          result.error !== null &&
          'message' in result.error &&
          typeof result.error.message === 'string'
        )
          return {
            ok: false,
            error: { code: 'unavailable', message: result.error.message },
          };
      }
    } catch {}
    return {
      ok: false,
      error: {
        code: 'unavailable',
        message:
          'Writing storage could not be reached. Your text has not been discarded.',
      },
    };
  }
  return {
    read: () => execute({ operation: 'studio.writing.read', input: {} }),
    execute,
  };
}
