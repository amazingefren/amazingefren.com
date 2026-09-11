'use client';
import { useEffect, useState } from 'react';
import { EvidenceWorkbench } from '../../evidence/ui/index.tsx';
import { createGuestEvidenceSession } from '../../evidence/adapters/guest-session.ts';
import {
  isEvidenceResult,
  type EvidencePort,
} from '../../evidence/contracts/index.ts';

export function EvidencePage({ audience }: { audience: 'owner' | 'guest' }) {
  const [port, setPort] = useState<EvidencePort | null>(null);
  useEffect(() => {
    setPort(
      audience === 'guest'
        ? createGuestEvidenceSession(window.sessionStorage)
        : {
            async execute(command) {
              try {
                const response = await fetch(
                  `/api/evidence/operations/${command.operation}`,
                  {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(command),
                  },
                );
                const result: unknown = await response.json();
                if (
                  isEvidenceResult(result) &&
                  (!result.ok ||
                    ('value' in result
                      ? !result.value.synthetic
                      : !result.report.synthetic))
                )
                  return result;
              } catch {}
              return {
                ok: false,
                error: {
                  code: 'unavailable',
                  message:
                    'Evidence storage is unavailable. Your edits remain here.',
                },
              };
            },
          },
    );
  }, [audience]);
  return port ? (
    <EvidenceWorkbench audience={audience} port={port} />
  ) : (
    <p role="status">Loading evidence…</p>
  );
}
