'use client';
import { useEffect, useRef, useState } from 'react';
import type {
  Command,
  Result,
  State,
  WorkPort,
} from '../../contracts/work/index.ts';
import { createGuestWorkPort } from '../../work/adapters/guest.ts';
import { isState } from '../../work/operations/validation.ts';
import { WorkView } from '../../work/ui/index.ts';

export function WorkPage({
  audience,
  onDirtyChange,
}: {
  audience: 'owner' | 'guest';
  onDirtyChange?(dirty: boolean): void;
}) {
  const [state, setState] = useState<State>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(0);
  const port = useRef<WorkPort | null>(null);
  const pending = useRef(false);
  useEffect(() => {
    const refresh = () => setReset((value) => value + 1);
    window.addEventListener('work:guest-reset', refresh);
    return () => window.removeEventListener('work:guest-reset', refresh);
  }, []);
  useEffect(() => {
    let active = true;
    setState(undefined);
    setError('');
    try {
      port.current =
        audience === 'guest'
          ? createGuestWorkPort(window.sessionStorage)
          : createOwnerWorkPort();
    } catch {
      setError('Work storage is unavailable.');
      return;
    }
    void port.current
      .execute({ operation: 'work.read' })
      .then((result) => {
        if (active) {
          if (result.ok) setState(result.state);
          else setError(result.message);
        }
      })
      .catch(() => {
        if (active) setError('Work could not load.');
      });
    return () => {
      active = false;
    };
  }, [audience, reset]);
  async function execute(command: Command): Promise<Result> {
    if (!port.current || pending.current)
      return {
        ok: false,
        error: 'unavailable',
        message: 'Wait for the current change.',
      };
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await port.current.execute(command);
      if (result.ok) setState(result.state);
      return result;
    } catch {
      return {
        ok: false,
        error: 'unavailable',
        message: 'Could not save. Try again.',
      };
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  if (!state)
    return (
      <section>
        <h1>Work</h1>
        {error ? (
          <div role="alert">
            {error}
            <button onClick={() => location.reload()}>Retry</button>
          </div>
        ) : (
          <p role="status">Loading…</p>
        )}
      </section>
    );
  return (
    <WorkView
      key={reset}
      state={state}
      execute={execute}
      busy={busy}
      audience={audience}
      onDirtyChange={onDirtyChange}
    />
  );
}

function createOwnerWorkPort(): WorkPort {
  return {
    async execute(command) {
      try {
        const response = await fetch(
          `/api/work/operations/${command.operation}`,
          {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(command),
          },
        );
        const result: unknown = await response.json();
        if (result && typeof result === 'object' && 'ok' in result) {
          if (
            result.ok === true &&
            'state' in result &&
            isState(result.state) &&
            !result.state.synthetic
          )
            return { ok: true, state: result.state };
          if (
            result.ok === false &&
            'error' in result &&
            ['invalid', 'denied', 'conflict', 'unavailable'].includes(
              String(result.error),
            ) &&
            'message' in result &&
            typeof result.message === 'string'
          )
            return {
              ok: false,
              error: result.error as
                'invalid' | 'denied' | 'conflict' | 'unavailable',
              message: result.message,
            };
        }
      } catch {}
      return {
        ok: false,
        error: 'unavailable',
        message: 'Work could not be reached. Try again.',
      };
    },
  };
}
