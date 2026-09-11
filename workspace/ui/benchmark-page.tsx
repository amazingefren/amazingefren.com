'use client';
import { createGuestWritingPort } from '../../studio/writing/guest.ts';
import { isStudioState } from '../../studio/writing/validation.ts';
import { useEffect, useState } from 'react';
import { EvaluationWorkbench } from '../../evaluation/ui/index.tsx';
import { createGuestEvaluationSession } from '../../evaluation/adapters/guest-session.ts';
import { isEvaluationResult } from '../../evaluation/contracts/result.ts';
import type { EvaluationPort } from '../../evaluation/contracts/index.ts';
import { createGuestEvidenceSession } from '../../evidence/adapters/guest-session.ts';
import {
  isEvidenceResult,
  type EvidenceCommand,
} from '../../evidence/contracts/index.ts';

export function BenchmarkPage({ audience }: { audience: 'owner' | 'guest' }) {
  const [port, setPort] = useState<EvaluationPort | null>(null);
  useEffect(() => {
    setPort(
      audience === 'guest'
        ? createGuestEvaluationSession(window.sessionStorage)
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
  async function recordEvidence(runId: string, text: string) {
    if (text.length > 20000)
      throw new Error('Report exceeds evidence record limits.');
    const command: EvidenceCommand = {
      operation: 'evidence.create',
      input: {
        kind: 'observation',
        text,
        sources: [
          {
            id: 'benchmark-run',
            label: `Benchmark run ${runId}`,
            reference: `evaluation:${runId}`,
          },
        ],
      },
    };
    const result: unknown =
      audience === 'guest'
        ? await createGuestEvidenceSession(window.sessionStorage).execute(
            command,
          )
        : await (
            await fetch('/api/evidence/operations/evidence.create', {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(command),
            })
          ).json();
    if (
      !isEvidenceResult(result) ||
      !result.ok ||
      !('value' in result) ||
      result.value.synthetic !== (audience === 'guest')
    )
      throw new Error('Evidence could not save the report.');
    return 'Recorded in Evidence as a draft observation.';
  }
  return port ? (
    <EvaluationWorkbench
      audience={audience}
      port={port}
      onDocumentReport={saveReport}
      onRecordEvidence={recordEvidence}
    />
  ) : (
    <p role="status">Loading benchmarks…</p>
  );
}
