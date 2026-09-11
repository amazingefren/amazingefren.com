'use client';
import { createGuestWritingPort } from '../../studio/writing/guest.ts';
import { isStudioState } from '../../studio/writing/validation.ts';
import { useEffect, useState } from 'react';
import { EvaluationWorkbench } from '../../evaluation/ui/index.tsx';
import { createGuestEvaluationPort } from '../../evaluation/adapters/guest.ts';
import { isEvaluationResult } from '../../evaluation/contracts/result.ts';
import type { EvaluationPort } from '../../evaluation/contracts/index.ts';

export function BenchmarkPage({ audience }: { audience: 'owner' | 'guest' }) {
  const [port, setPort] = useState<EvaluationPort | null>(null);
  useEffect(() => {
    setPort(
      audience === 'guest'
        ? createGuestEvaluationPort()
        : {
            async execute(command) {
              try {
                const response = await fetch(
                  `/api/evaluation/operations/${command.operation}`,
                  {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(command),
                  },
                );
                const result: unknown = await response.json();
                if (isEvaluationResult(result)) return result;
              } catch {}
              return {
                ok: false,
                error: {
                  code: 'unavailable',
                  message:
                    'Evaluation storage is unavailable. Your form values remain here.',
                },
              };
            },
          },
    );
  }, [audience]);
  async function saveReport(title: string, body: string) {
    const command = {
      operation: 'studio.notes.create' as const,
      input: { kind: 'note' as const, title, body, collection: 'Benchmarks' },
    };
    if (audience === 'guest') {
      const result = await createGuestWritingPort(
        window.sessionStorage,
      ).execute(command);
      if (!result.ok) throw new Error(result.error.message);
    } else {
      const response = await fetch(
        '/api/writing/operations/studio.notes.create',
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(command),
        },
      );
      const result = await response.json();
      if (
        typeof result !== 'object' ||
        result === null ||
        !('ok' in result) ||
        !result.ok ||
        !('value' in result) ||
        !isStudioState(result.value) ||
        result.value.synthetic
      )
        throw new Error('Notes could not save the report.');
    }
    return 'Saved to Notes.';
  }
  return port ? (
    <EvaluationWorkbench
      audience={audience}
      port={port}
      onDocumentReport={saveReport}
    />
  ) : (
    <p role="status">Loading benchmarks…</p>
  );
}
