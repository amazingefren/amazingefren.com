'use client';

import { useEffect, useState } from 'react';

export function PublicationCopyCode({ value }: { value: string }) {
  const [state, setState] = useState<'copy' | 'copied' | 'failed'>('copy');
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (state === 'copy') return;
    const timer = setTimeout(() => setState('copy'), 1800);
    return () => clearTimeout(timer);
  }, [state]);
  return (
    <span className="publication-copy">
      <button
        className="publication-copy-button"
        aria-label={
          state === 'copied'
            ? 'Copied'
            : state === 'failed'
              ? 'Copy failed'
              : 'Copy'
        }
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            await navigator.clipboard.writeText(value);
            setState('copied');
          } catch {
            setState('failed');
          } finally {
            setPending(false);
          }
        }}
        type="button"
      >
        {(['copy', 'copied', 'failed'] as const).map((label) => (
          <span
            key={label}
            className={`publication-copy-label${state === label ? ' is-visible' : ''}`}
            aria-hidden="true"
          >
            {label === 'copy'
              ? 'Copy'
              : label === 'copied'
                ? 'Copied'
                : 'Failed'}
          </span>
        ))}
      </button>
      <span className="publication-copy-status" aria-live="polite">
        {state === 'copied'
          ? 'Copied'
          : state === 'failed'
            ? 'Copy failed'
            : ''}
      </span>
    </span>
  );
}
