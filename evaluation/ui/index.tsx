'use client';
import { useEffect, useMemo, useState } from 'react';
import type {
  EvaluationDefinition,
  EvaluationPort,
  EvaluationState,
} from '../contracts/index.ts';
import {
  nextMatrixId,
  reportMarkdown,
  summarizeRun,
} from '../domain/report.ts';
import './styles.css';

export function EvaluationWorkbench({
  audience,
  port,
  onDocumentReport,
}: {
  audience: 'owner' | 'guest';
  port: EvaluationPort;
  onDocumentReport?: (title: string, markdown: string) => Promise<string>;
}) {
  const [state, setState] = useState<EvaluationState | null>(null);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [cases, setCases] = useState([
    { id: 'case-1', input: '', expected: '' },
  ]);
  const [subjects, setSubjects] = useState([
    { id: 'subject-1', label: '', model: '' },
  ]);
  const [metric, setMetric] = useState<'exact-match' | 'contains' | 'manual'>(
    'exact-match',
  );
  const [repetitions, setRepetitions] = useState(1);
  const [requests, setRequests] = useState(1);
  const [tokens, setTokens] = useState(1000);
  const [busy, setBusy] = useState(false);
  const [definitionId, setDefinitionId] = useState('');
  const [editing, setEditing] = useState<EvaluationDefinition | null>(null);
  const [runId, setRunId] = useState('');
  const [attemptText, setAttemptText] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const definitions = state?.definitions ?? [];
  const selected =
    definitions.find((item) => item.id === definitionId) ?? definitions.at(-1);
  const runs =
    state?.runs.filter((run) => run.definitionId === selected?.id) ?? [];
  const selectedRun = runs.find((item) => item.id === runId) ?? runs.at(-1);
  const scheduled = useMemo(
    () => Math.max(0, repetitions) * cases.length * subjects.length,
    [repetitions, cases, subjects],
  );
  async function execute(command: Parameters<EvaluationPort['execute']>[0]) {
    setBusy(true);
    setMessage('');
    try {
      const result = await port.execute(command);
      if (result.ok && 'value' in result) {
        setState(result.value);
        if (
          command.operation === 'evaluation.update-definition' ||
          command.operation === 'evaluation.freeze-definition'
        )
          setEditing(null);
      } else if (!result.ok) setMessage(result.error.message);
    } catch {
      setMessage(
        'Evaluation storage is unavailable. Your form values remain here.',
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void execute({ operation: 'evaluation.read' });
  }, []);
  function create() {
    if (
      !name.trim() ||
      !cases.length ||
      !subjects.every((item) => item.label.trim())
    ) {
      setMessage(
        'Name, at least one case, and a label for each subject are required.',
      );
      return;
    }
    void execute({
      ...(editing
        ? {
            operation: 'evaluation.update-definition' as const,
            definitionId: editing.id,
            revision: editing.revision,
          }
        : { operation: 'evaluation.create-definition' as const }),
      input: {
        name,
        hypothesis,
        cases,
        subjects: subjects.map(({ id, label, model }) => ({
          id,
          label,
          configuration: { model: model.trim() || null },
        })),
        metric: { kind: metric },
        repetitions,
        budget: { maxRequests: requests, maxTokens: tokens },
      },
    });
  }
  function importAttempts() {
    if (!selectedRun) return;
    try {
      const attempts: unknown = JSON.parse(attemptText);
      if (!Array.isArray(attempts)) throw new Error();
      void execute({
        operation: 'evaluation.import-attempts',
        runId: selectedRun.id,
        attempts: attempts as never,
      });
    } catch {
      setMessage(
        'Paste a JSON array of completed, failed, or cancelled attempts.',
      );
    }
  }
  async function download(format: 'json' | 'markdown') {
    try {
      const result = await port.execute({
        operation: 'evaluation.export-report',
        format,
        ...(selectedRun ? { runId: selectedRun.id } : {}),
      });
      if (!result.ok || !('report' in result)) {
        setMessage(
          result.ok ? 'Report export is unavailable.' : result.error.message,
        );
        return;
      }
      const body =
        format === 'json'
          ? JSON.stringify(result.report, null, 2)
          : reportMarkdown(result.report);
      const url = URL.createObjectURL(
        new Blob([body], {
          type: format === 'json' ? 'application/json' : 'text/markdown',
        }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `evaluation-report.${format === 'json' ? 'json' : 'md'}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setMessage('Report export is unavailable.');
    }
  }
  async function documentReport() {
    if (!selectedRun || !onDocumentReport) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await port.execute({
        operation: 'evaluation.export-report',
        runId: selectedRun.id,
        format: 'markdown',
      });
      if (!result.ok || !('report' in result)) {
        setMessage(result.ok ? 'Report unavailable.' : result.error.message);
        return;
      }
      setMessage(
        await onDocumentReport(
          `${selected?.name ?? 'Benchmark'} — observations`,
          reportMarkdown(result.report),
        ),
      );
    } catch {
      setMessage('The report could not be saved to Notes.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="evaluation-workbench">
      <header>
        <h1>Benchmarks</h1>
      </header>
      {message && (
        <p className="ws-error" role="alert">
          {message}
        </p>
      )}
      <details open>
        <summary>Definition</summary>
        <div className="evaluation-form">
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Hypothesis
            <textarea
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
            />
          </label>
          {cases.map((item, index) => (
            <fieldset key={item.id}>
              <legend>
                Case {index + 1} · {item.id}
              </legend>
              <label>
                Input
                <textarea
                  value={item.input}
                  onChange={(e) =>
                    setCases((all) =>
                      all.map((value, i) =>
                        i === index
                          ? { ...value, input: e.target.value }
                          : value,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Expected
                <textarea
                  value={item.expected}
                  onChange={(e) =>
                    setCases((all) =>
                      all.map((value, i) =>
                        i === index
                          ? { ...value, expected: e.target.value }
                          : value,
                      ),
                    )
                  }
                />
              </label>
              <button
                onClick={() =>
                  setCases((all) => all.filter((_, i) => i !== index))
                }
                disabled={cases.length === 1}
              >
                Remove case
              </button>
            </fieldset>
          ))}
          <button
            onClick={() =>
              setCases((all) => [
                ...all,
                { id: nextMatrixId('case', all), input: '', expected: '' },
              ])
            }
          >
            Add case
          </button>
          {subjects.map((item, index) => (
            <fieldset key={item.id}>
              <legend>
                Subject {index + 1} · {item.id}
              </legend>
              <label>
                Label
                <input
                  value={item.label}
                  onChange={(e) =>
                    setSubjects((all) =>
                      all.map((value, i) =>
                        i === index
                          ? { ...value, label: e.target.value }
                          : value,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Model (optional for imports)
                <input
                  value={item.model}
                  onChange={(event) =>
                    setSubjects((all) =>
                      all.map((value, i) =>
                        i === index
                          ? { ...value, model: event.target.value }
                          : value,
                      ),
                    )
                  }
                />
              </label>
              <button
                onClick={() =>
                  setSubjects((all) => all.filter((_, i) => i !== index))
                }
                disabled={subjects.length === 1}
              >
                Remove subject
              </button>
            </fieldset>
          ))}
          <button
            onClick={() =>
              setSubjects((all) => [
                ...all,
                { id: nextMatrixId('subject', all), label: '', model: '' },
              ])
            }
          >
            Add subject
          </button>
          <label>
            Metric
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as typeof metric)}
            >
              <option value="exact-match">Exact match</option>
              <option value="contains">Contains</option>
              <option value="manual">Manual</option>
            </select>
          </label>
          <label>
            Repetitions
            <input
              type="number"
              min="1"
              value={repetitions}
              onChange={(e) => setRepetitions(Number(e.target.value))}
            />
          </label>
          <label>
            Request budget
            <input
              type="number"
              min="1"
              value={requests}
              onChange={(e) => setRequests(Number(e.target.value))}
            />
          </label>
          <label>
            Token budget
            <input
              type="number"
              min="1"
              value={tokens}
              onChange={(e) => setTokens(Number(e.target.value))}
            />
          </label>
          <p>
            {scheduled} scheduled attempts. No provider call occurs until Run.
          </p>
          <button className="ws-primary" disabled={busy} onClick={create}>
            {editing ? 'Save draft changes' : 'Save definition'}
          </button>
        </div>
      </details>
      {selected && (
        <section className="evaluation-review">
          <label>
            Definition
            <select
              value={selected.id}
              onChange={(e) => setDefinitionId(e.target.value)}
            >
              {definitions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <h2>{selected.name}</h2>
          <button
            disabled={busy || Boolean(selected.frozenAt)}
            onClick={() => {
              setEditing(selected);
              setName(selected.name);
              setHypothesis(selected.hypothesis);
              setCases(selected.cases.map((item) => ({ ...item })));
              setSubjects(
                selected.subjects.map((item) => ({
                  id: item.id,
                  label: item.label,
                  model:
                    typeof item.configuration.model === 'string'
                      ? item.configuration.model
                      : '',
                })),
              );
              setMetric(selected.metric.kind);
              setRepetitions(selected.repetitions);
              setRequests(selected.budget.maxRequests);
              setTokens(selected.budget.maxTokens);
            }}
          >
            Edit draft
          </button>
          {editing && (
            <button onClick={() => setEditing(null)}>
              Save as new definition
            </button>
          )}
          <p>{selected.hypothesis}</p>
          <p>
            {selected.frozenAt
              ? `Frozen revision ${selected.revision}`
              : `Draft revision ${selected.revision}`}
          </p>
          <button
            disabled={busy || Boolean(selected.frozenAt)}
            onClick={() =>
              void execute({
                operation: 'evaluation.freeze-definition',
                definitionId: selected.id,
                revision: selected.revision,
              })
            }
          >
            Freeze review
          </button>
          <button
            className="ws-primary"
            disabled={busy || !selected.frozenAt}
            onClick={() =>
              void execute({
                operation: 'evaluation.create-run',
                definitionId: selected.id,
                revision: selected.revision,
              })
            }
          >
            Create run
          </button>
          <button
            disabled={busy || !selectedRun}
            onClick={() => void download('markdown')}
          >
            Markdown report
          </button>
          <button
            disabled={busy || !selectedRun}
            onClick={() => void download('json')}
          >
            JSON report
          </button>
          {onDocumentReport && (
            <button
              disabled={busy || !selectedRun}
              onClick={() => void documentReport()}
            >
              Save report to Notes
            </button>
          )}
        </section>
      )}
      {runs.map((run) => (
        <section className="evaluation-run" key={run.id}>
          <h2>Run {run.id}</h2>
          <button onClick={() => setRunId(run.id)}>Inspect run</button>
          <p>
            {run.status}. Failed and unknown attempts remain in this record.
          </p>
          <button
            className="ws-primary"
            disabled={busy || run.status !== 'planned'}
            onClick={() =>
              void execute({
                operation: 'evaluation.execute-run',
                runId: run.id,
              })
            }
          >
            Run
          </button>
          <button
            disabled={run.status !== 'planned' && run.status !== 'running'}
            onClick={() =>
              void execute({
                operation: 'evaluation.cancel-run',
                runId: run.id,
              })
            }
          >
            Cancel run
          </button>
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Pass</th>
                <th>Failed</th>
                <th>Unknown</th>
                <th>Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {summarizeRun(run).map((item) => (
                <tr key={item.subjectId}>
                  <td>{item.subjectId}</td>
                  <td>{item.passed}</td>
                  <td>{item.failed}</td>
                  <td>{item.unknown}</td>
                  <td>{item.scheduled}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <details>
            <summary>Attempts and manual scoring</summary>
            {run.attempts.map((attempt) => (
              <article key={attempt.id}>
                <strong>
                  {attempt.subjectId} / {attempt.caseId}
                </strong>
                <p>
                  {attempt.status} · requests{' '}
                  {attempt.usage?.requests ?? 'unknown'} · tokens{' '}
                  {attempt.usage?.tokens ?? 'unknown'}
                </p>
                <pre>{attempt.output ?? attempt.failure ?? 'No output'}</pre>
                {run.definition.metric.kind === 'manual' &&
                  attempt.status === 'completed' && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void execute({
                          operation: 'evaluation.score-manual',
                          runId: run.id,
                          scores: [{ attemptId: attempt.id, passed: true }],
                        })
                      }
                    >
                      Mark pass
                    </button>
                  )}
              </article>
            ))}
          </details>
        </section>
      ))}
      {selectedRun && (
        <section className="evaluation-run">
          <h2>Import attempts</h2>
          <textarea
            aria-label="Attempt JSON"
            value={attemptText}
            onChange={(e) => setAttemptText(e.target.value)}
            placeholder='[{"subjectId":"subject-1","caseId":"case-1","repetition":1,"status":"completed","output":"...","failure":null,"usage":{"requests":1,"tokens":10}}]'
          />
          <button
            disabled={
              busy || selectedRun.status !== 'planned' || !attemptText.trim()
            }
            onClick={importAttempts}
          >
            Import attempts
          </button>
          {selectedRun.definition.metric.kind === 'manual' && (
            <details open>
              <summary>Manual scoring</summary>
              {selected?.metric.kind === 'manual' &&
                selectedRun.attempts
                  .filter((attempt) => attempt.status === 'completed')
                  .map((attempt) => (
                    <div key={attempt.id}>
                      <span>
                        {attempt.subjectId} / {attempt.caseId}
                      </span>
                      <input
                        aria-label={`Note ${attempt.id}`}
                        value={notes[attempt.id] ?? ''}
                        onChange={(e) =>
                          setNotes((all) => ({
                            ...all,
                            [attempt.id]: e.target.value,
                          }))
                        }
                      />
                      <button
                        disabled={busy}
                        onClick={() =>
                          void execute({
                            operation: 'evaluation.score-manual',
                            runId: selectedRun.id,
                            scores: [
                              {
                                attemptId: attempt.id,
                                passed: true,
                                note: notes[attempt.id],
                              },
                            ],
                          })
                        }
                      >
                        Pass
                      </button>
                      <button
                        disabled={busy}
                        onClick={() =>
                          void execute({
                            operation: 'evaluation.score-manual',
                            runId: selectedRun.id,
                            scores: [
                              {
                                attemptId: attempt.id,
                                passed: false,
                                note: notes[attempt.id],
                              },
                            ],
                          })
                        }
                      >
                        Fail
                      </button>
                    </div>
                  ))}
            </details>
          )}
        </section>
      )}
    </section>
  );
}
