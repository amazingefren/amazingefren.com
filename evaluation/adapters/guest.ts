import {
  parseEvaluationCommand,
  isEvaluationState,
  type EvaluationAggregate,
  type EvaluationAttempt,
  type EvaluationCommand,
  type EvaluationPort,
  type EvaluationResult,
  type EvaluationRun,
  type EvaluationState,
} from '../contracts/index.ts';
import { emptyEvaluationState } from '../fixtures/guest.ts';

const time = '1970-01-01T00:00:00.000Z';

export function createGuestEvaluationPort(
  initial = emptyEvaluationState(),
): EvaluationPort {
  if (
    !isEvaluationState(initial) ||
    !initial.synthetic ||
    initial.definitions.some((item) => item.ownerId !== 'guest') ||
    initial.runs.some(
      (item) => item.ownerId !== 'guest' || item.definition.ownerId !== 'guest',
    )
  )
    throw new Error('Guest evaluation state is invalid.');
  let state = clone(initial);
  let sequence = 0;
  const used = new Set([
    ...state.definitions.map((item) => item.id),
    ...state.runs.flatMap((item) => [
      item.id,
      ...item.attempts.map((attempt) => attempt.id),
    ]),
  ]);
  const next = (kind: string) => {
    let id = `${kind}-${++sequence}`;
    while (used.has(id)) id = `${kind}-${++sequence}`;
    used.add(id);
    return id;
  };
  return {
    async execute(raw): Promise<EvaluationResult> {
      const command = parseEvaluationCommand(raw);
      if (!command) return error('invalid', 'Evaluation command is invalid.');
      if (command.operation === 'evaluation.read') return value(state);
      if (command.operation === 'evaluation.export-report')
        return exportReport(state, command);
      if (command.operation === 'evaluation.create-definition') {
        const definition = {
          ...clone(command.input),
          id: next('definition'),
          ownerId: 'guest',
          revision: 1,
          frozenAt: null,
          createdAt: time,
        };
        state = change(state, {
          definitions: [...state.definitions, definition],
        });
        return value(state);
      }
      if ('definitionId' in command) {
        const definition = state.definitions.find(
          (item) => item.id === command.definitionId,
        );
        if (!definition) return error('missing', 'Definition was not found.');
        if (command.operation === 'evaluation.update-definition') {
          if (definition.frozenAt || definition.revision !== command.revision)
            return error('conflict', 'Definition revision is not current.');
          const updated = {
            ...clone(command.input),
            id: definition.id,
            ownerId: 'guest',
            revision: definition.revision + 1,
            frozenAt: null,
            createdAt: definition.createdAt,
          };
          state = change(state, {
            definitions: state.definitions.map((item) =>
              item.id === definition.id ? updated : item,
            ),
          });
          return value(state);
        }
        if (command.operation === 'evaluation.freeze-definition') {
          if (definition.frozenAt || definition.revision !== command.revision)
            return error('conflict', 'Definition revision is not current.');
          state = change(state, {
            definitions: state.definitions.map((item) =>
              item.id === definition.id ? { ...item, frozenAt: time } : item,
            ),
          });
          return value(state);
        }
        if (command.operation === 'evaluation.create-run') {
          if (!definition.frozenAt || definition.revision !== command.revision)
            return error(
              'conflict',
              'A current frozen definition is required.',
            );
          const run: EvaluationRun = {
            id: next('run'),
            ownerId: 'guest',
            definitionId: definition.id,
            definitionRevision: definition.revision,
            definition: clone(definition),
            status: 'planned',
            startedAt: null,
            completedAt: null,
            attempts: [],
          };
          state = change(state, { runs: [...state.runs, run] });
          return value(state);
        }
      }
      if (!('runId' in command))
        return error('invalid', 'Evaluation operation is undeclared.');
      const run = state.runs.find((item) => item.id === command.runId);
      if (!run) return error('missing', 'Run was not found.');
      if (command.operation === 'evaluation.cancel-run') {
        if (run.status === 'complete')
          return error('conflict', 'Completed runs cannot cancel.');
        state = replace(state, {
          ...run,
          status: 'cancelled',
          completedAt: time,
        });
        return value(state);
      }
      if (command.operation === 'evaluation.execute-run')
        return error(
          'unavailable',
          'Synthetic execution is unavailable. Import fixture attempts instead.',
        );
      if (command.operation === 'evaluation.import-attempts') {
        if (run.status !== 'planned')
          return error(
            'conflict',
            'Only planned runs accept imported attempts.',
          );
        const slots = coordinates(run);
        const seen = new Set(run.attempts.map(key));
        const imported: EvaluationAttempt[] = [];
        for (const item of command.attempts) {
          if (
            !validImported(item, run) ||
            !slots.has(key(item)) ||
            seen.has(key(item))
          )
            return error(
              'invalid',
              'Imported attempts are invalid or duplicate.',
            );
          seen.add(key(item));
          const expected =
            run.definition.cases.find((test) => test.id === item.caseId)
              ?.expected ?? '';
          imported.push({
            ...clone(item),
            id: next('attempt'),
            score:
              item.status === 'completed'
                ? score(run.definition.metric.kind, item.output ?? '', expected)
                : null,
            scoreNote: null,
          });
        }
        const attempts = [...run.attempts, ...imported];
        state = replace(state, {
          ...run,
          attempts,
          status: attempts.length === slots.size ? 'complete' : 'planned',
          completedAt: attempts.length === slots.size ? time : null,
        });
        return value(state);
      }
      if (command.operation === 'evaluation.score-manual') {
        if (
          run.definition.metric.kind !== 'manual' ||
          run.status !== 'complete'
        )
          return error('conflict', 'Only completed manual runs accept scores.');
        const scores = new Map(
          command.scores.map((item) => [item.attemptId, item]),
        );
        if (
          scores.size !== command.scores.length ||
          [...scores.values()].some(
            (item) =>
              item.note !== undefined &&
              (typeof item.note !== 'string' || item.note.length > 4000),
          ) ||
          [...scores.keys()].some(
            (id) =>
              !run.attempts.some(
                (attempt) =>
                  attempt.id === id && attempt.status === 'completed',
              ),
          )
        )
          return error('invalid', 'Manual scores are invalid.');
        state = replace(state, {
          ...run,
          attempts: run.attempts.map((attempt) => {
            const manual = scores.get(attempt.id);
            return manual
              ? {
                  ...attempt,
                  score: manual.passed,
                  scoreNote: manual.note ?? null,
                }
              : attempt;
          }),
        });
        return value(state);
      }
      return error('invalid', 'Evaluation operation is undeclared.');
    },
  };
}

function change(state: EvaluationState, patch: Partial<EvaluationState>) {
  const next = { ...state, ...patch, version: state.version + 1 };
  return { ...next, aggregates: next.runs.flatMap(aggregate) };
}
function replace(state: EvaluationState, run: EvaluationRun) {
  return change(state, {
    runs: state.runs.map((item) => (item.id === run.id ? run : item)),
  });
}
function coordinates(run: EvaluationRun) {
  return new Set(
    run.definition.subjects.flatMap((subject) =>
      run.definition.cases.flatMap((test) =>
        Array.from(
          { length: run.definition.repetitions },
          (_, index) => `${subject.id}:${test.id}:${index + 1}`,
        ),
      ),
    ),
  );
}
function key(
  item: Pick<EvaluationAttempt, 'subjectId' | 'caseId' | 'repetition'>,
) {
  return `${item.subjectId}:${item.caseId}:${item.repetition}`;
}
function validImported(
  item: Omit<EvaluationAttempt, 'id' | 'score' | 'scoreNote'>,
  run: EvaluationRun,
) {
  return (
    ['completed', 'failed', 'cancelled'].includes(item.status) &&
    run.definition.subjects.some((subject) => subject.id === item.subjectId) &&
    run.definition.cases.some((test) => test.id === item.caseId) &&
    Number.isSafeInteger(item.repetition) &&
    item.repetition >= 1 &&
    item.repetition <= run.definition.repetitions &&
    (item.status === 'completed'
      ? typeof item.output === 'string' &&
        item.output.length <= 1_000_000 &&
        item.failure === null
      : item.output === null &&
        typeof item.failure === 'string' &&
        item.failure.length <= 4000) &&
    validUsage(item.usage)
  );
}
function validUsage(
  value: EvaluationAttempt['usage'],
): value is { requests: number; tokens: number } | null {
  return (
    value === null ||
    (typeof value.requests === 'number' &&
      typeof value.tokens === 'number' &&
      Number.isSafeInteger(value.requests) &&
      Number.isSafeInteger(value.tokens) &&
      value.requests >= 0 &&
      value.tokens >= 0)
  );
}
function score(kind: string, output: string, expected: string) {
  return kind === 'manual'
    ? null
    : kind === 'exact-match'
      ? output.trim() === expected.trim()
      : output.includes(expected.trim());
}
function aggregate(run: EvaluationRun): EvaluationAggregate[] {
  return run.definition.subjects.map((subject) => {
    const attempts = run.attempts.filter(
      (attempt) => attempt.subjectId === subject.id,
    );
    const passed = attempts.filter((attempt) => attempt.score === true).length;
    const failed = attempts.filter((attempt) => attempt.score === false).length;
    const scheduled = run.definition.cases.length * run.definition.repetitions;
    return {
      subjectId: subject.id,
      scheduled,
      completed: attempts.filter((attempt) => attempt.status === 'completed')
        .length,
      passed,
      failed,
      unknown: scheduled - passed - failed,
      passRate: passed + failed ? passed / (passed + failed) : null,
    };
  });
}
function exportReport(
  state: EvaluationState,
  command: Extract<
    EvaluationCommand,
    { operation: 'evaluation.export-report' }
  >,
): EvaluationResult {
  const runs = command.runId
    ? state.runs.filter((run) => run.id === command.runId)
    : state.runs;
  return command.runId && !runs.length
    ? error('missing', 'Run was not found.')
    : {
        ok: true,
        report: {
          format: command.format,
          definitions: state.definitions.map(
            ({ id, name, hypothesis, revision, frozenAt }) => ({
              id,
              name,
              hypothesis,
              revision,
              frozenAt,
            }),
          ),
          runs: runs.map((run) => ({
            id: run.id,
            definitionId: run.definitionId,
            definitionRevision: run.definitionRevision,
            status: run.status,
            aggregates: aggregate(run),
          })),
          observations: runs.map(
            (run) =>
              `Run ${run.id}: ${run.status}; ${run.attempts.length} attempts retained.`,
          ),
        },
      };
}
function clone<T>(value: T): T {
  return structuredClone(value);
}
function value(state: EvaluationState): EvaluationResult {
  return { ok: true, value: clone(state) };
}
function error(
  code: 'invalid' | 'missing' | 'conflict' | 'unavailable',
  message: string,
): EvaluationResult {
  return { ok: false, error: { code, message } };
}
export { emptyEvaluationState };
