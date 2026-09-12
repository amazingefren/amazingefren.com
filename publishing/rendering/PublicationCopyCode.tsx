'use client';

import { useState } from 'react';

export function PublicationCopyCode({ value }: { value: string }) {
  const [message, setMessage] = useState('');
  return (
    <span className="publication-copy">
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setMessage('Copied');
          } catch {
            setMessage('Copy failed');
          }
        }}
        type="button"
      >
        Copy
      </button>
      <span aria-live="polite">{message}</span>
    </span>
  );
}
