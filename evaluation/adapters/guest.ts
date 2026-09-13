import {
  parseEvaluationCommand,
  isEvaluationState,
  type EvaluationAggregate,
  type EvaluationAttempt,
  type EvaluationCommand,
  type EvaluationDefinition,
  type EvaluationPort,
  type EvaluationResult,
  type EvaluationRun,
  type EvaluationState,
} from '../contracts/index.ts';
import { emptyEvaluationState } from '../fixtures/guest.ts';

const syntheticTime = '1970-01-01T00:00:00.000Z';

type IdFactory = (kind: string) => string;
type DefinitionCommand = Extract<
  EvaluationCommand,
  {
    operation:
      | 'evaluation.update-definition'
      | 'evaluation.freeze-definition'
      | 'evaluation.create-run';
  }
>;
type RunCommand = Extract<
  EvaluationCommand,
  {
    operation:
      | 'evaluation.execute-run'
      | 'evaluation.cancel-run'
      | 'evaluation.import-attempts'
      | 'evaluation.score-manual';
  }
>;
type GuestContext = {
  state: EvaluationState;
  next: IdFactory;
};
type ManualScore = {
  attemptId: string;
  passed: boolean;
  note?: string;
};

export function createGuestEvaluationPort(
  initial = emptyEvaluationState(),
): EvaluationPort {
  assertGuestState(initial);
  const state = clone(initial);
  const context: GuestContext = {
    state,
    next: createIdFactory(state),
  };
  return {
    async execute(raw): Promise<EvaluationResult> {
      const command = parseEvaluationCommand(raw);
      if (!command) return error('invalid', 'Evaluation command is invalid.');
      return executeGuestCommand(context, command);
    },
  };
}

function assertGuestState(initial: EvaluationState): void {
  if (
    !isEvaluationState(initial) ||
    !initial.synthetic ||
    initial.definitions.some((item) => item.ownerId !== 'guest') ||
    initial.runs.some(
      (item) => item.ownerId !== 'guest' || item.definition.ownerId !== 'guest',
    )
  )
    throw new Error('Guest evaluation state is invalid.');
}

function createIdFactory(state: EvaluationState): IdFactory {
  let sequence = 0;
  const used = new Set([
    ...state.definitions.map((item) => item.id),
    ...state.runs.flatMap((item) => [
      item.id,
      ...item.attempts.map((attempt) => attempt.id),
    ]),
  ]);
  return (kind: string) => {
    let id = `${kind}-${++sequence}`;
    while (used.has(id)) id = `${kind}-${++sequence}`;
    used.add(id);
    return id;
  };
}

function executeGuestCommand(
  context: GuestContext,
  command: EvaluationCommand,
): EvaluationResult {
  const { state, next } = context;
  if (command.operation === 'evaluation.read') return value(state);
  if (command.operation === 'evaluation.export-report')
    return exportReport(state, command);
  if (command.operation === 'evaluation.create-definition') {
    const definition: EvaluationDefinition = {
      ...clone(command.input),
      id: next('definition'),
      ownerId: 'guest',
      revision: 1,
      frozenAt: null,
      createdAt: syntheticTime,
    };
    const nextState = updateState(state, {
      definitions: [...state.definitions, definition],
    });
    context.state = nextState;
    return value(nextState);
  }
  if ('definitionId' in command)
    return executeDefinitionCommand(context, command);
  if ('runId' in command) return executeRunCommand(context, command);
  return error('invalid', 'Evaluation operation is undeclared.');
}

function executeDefinitionCommand(
  context: GuestContext,
  command: DefinitionCommand,
): EvaluationResult {
  const { state, next } = context;
  const definition = state.definitions.find(
    (item) => item.id === command.definitionId,
  );
  if (!definition) return error('missing', 'Definition was not found.');
  if (command.operation === 'evaluation.update-definition') {
    if (definition.frozenAt || definition.revision !== command.revision)
      return error('conflict', 'Definition revision is not current.');
    const updated: EvaluationDefinition = {
      ...clone(command.input),
      id: definition.id,
      ownerId: 'guest',
      revision: definition.revision + 1,
      frozenAt: null,
      createdAt: definition.createdAt,
    };
    const nextState = updateState(state, {
      definitions: state.definitions.map((item) =>
        item.id === definition.id ? updated : item,
      ),
    });
    context.state = nextState;
    return value(nextState);
  }
  if (command.operation === 'evaluation.freeze-definition') {
    if (definition.frozenAt || definition.revision !== command.revision)
      return error('conflict', 'Definition revision is not current.');
    const nextState = updateState(state, {
      definitions: state.definitions.map((item) =>
        item.id === definition.id ? { ...item, frozenAt: syntheticTime } : item,
      ),
    });
    context.state = nextState;
    return value(nextState);
  }
  if (!definition.frozenAt || definition.revision !== command.revision)
    return error('conflict', 'A current frozen definition is required.');
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
  const nextState = updateState(state, { runs: [...state.runs, run] });
  context.state = nextState;
  return value(nextState);
}

function executeRunCommand(
  context: GuestContext,
  command: RunCommand,
): EvaluationResult {
  const { state, next } = context;
  const run = state.runs.find((item) => item.id === command.runId);
  if (!run) return error('missing', 'Run was not found.');
  if (command.operation === 'evaluation.cancel-run') {
    if (run.status === 'complete')
      return error('conflict', 'Completed runs cannot cancel.');
    const nextState = replaceRun(state, {
      ...run,
      status: 'cancelled',
      completedAt: syntheticTime,
    });
    context.state = nextState;
    return value(nextState);
  }
  if (command.operation === 'evaluation.execute-run')
    return error(
      'unavailable',
      'Synthetic execution is unavailable. Import fixture attempts instead.',
    );
  if (command.operation === 'evaluation.import-attempts')
    return importAttempts(context, run, command.attempts);
  if (run.definition.metric.kind !== 'manual' || run.status !== 'complete')
    return error('conflict', 'Only completed manual runs accept scores.');
  if (!command.scores.every(validManualScore))
    return error('invalid', 'Manual scores are invalid.');
  const scores = new Map(command.scores.map((item) => [item.attemptId, item]));
  if (
    scores.size !== command.scores.length ||
    [...scores.keys()].some(
      (id) =>
        !run.attempts.some(
          (attempt) => attempt.id === id && attempt.status === 'completed',
        ),
    )
  )
    return error('invalid', 'Manual scores are invalid.');
  const nextState = replaceRun(state, {
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
  context.state = nextState;
  return value(nextState);
}

function importAttempts(
  context: GuestContext,
  run: EvaluationRun,
  input: Extract<
    RunCommand,
    { operation: 'evaluation.import-attempts' }
  >['attempts'],
): EvaluationResult {
  const { state, next } = context;
  if (run.status !== 'planned')
    return error('conflict', 'Only planned runs accept imported attempts.');
  const slots = scheduledCoordinates(run);
  const seen = new Set(run.attempts.map(attemptCoordinate));
  const imported: EvaluationAttempt[] = [];
  for (const item of input) {
    if (!isValidImportedAttempt(item, run))
      return error('invalid', 'Imported attempts are invalid or duplicate.');
    const coordinate = attemptCoordinate(item);
    if (!slots.has(coordinate) || seen.has(coordinate))
      return error('invalid', 'Imported attempts are invalid or duplicate.');
    seen.add(coordinate);
    const expected =
      run.definition.cases.find((test) => test.id === item.caseId)?.expected ??
      '';
    imported.push({
      ...clone(item),
      id: next('attempt'),
      score:
        item.status === 'completed'
          ? scoreOutput(run.definition.metric.kind, item.output ?? '', expected)
          : null,
      scoreNote: null,
    });
  }
  const attempts = [...run.attempts, ...imported];
  const complete = attempts.length === slots.size;
  const nextState = replaceRun(state, {
    ...run,
    attempts,
    status: complete ? 'complete' : 'planned',
    completedAt: complete ? syntheticTime : null,
  });
  context.state = nextState;
  return value(nextState);
}

function updateState(state: EvaluationState, patch: Partial<EvaluationState>) {
  const next = { ...state, ...patch, version: state.version + 1 };
  return { ...next, aggregates: next.runs.flatMap(summarizeRun) };
}
function replaceRun(state: EvaluationState, run: EvaluationRun) {
  return updateState(state, {
    runs: state.runs.map((item) => (item.id === run.id ? run : item)),
  });
}
function scheduledCoordinates(run: EvaluationRun) {
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
function attemptCoordinate(
  item: Pick<EvaluationAttempt, 'subjectId' | 'caseId' | 'repetition'>,
) {
  return `${item.subjectId}:${item.caseId}:${item.repetition}`;
}
function isValidImportedAttempt(
  item: unknown,
  run: EvaluationRun,
): item is Omit<EvaluationAttempt, 'id' | 'score' | 'scoreNote'> {
  if (
    !record(item) ||
    !exact(item, [
      'subjectId',
      'caseId',
      'repetition',
      'status',
      'output',
      'failure',
      'usage',
    ]) ||
    typeof item.status !== 'string' ||
    typeof item.repetition !== 'number'
  )
    return false;
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
    isValidUsage(item.usage)
  );
}
function isValidUsage(
  value: unknown,
): value is { requests: number; tokens: number } | null {
  return (
    value === null ||
    (record(value) &&
      exact(value, ['requests', 'tokens']) &&
      typeof value.requests === 'number' &&
      typeof value.tokens === 'number' &&
      Number.isSafeInteger(value.requests) &&
      Number.isSafeInteger(value.tokens) &&
      value.requests >= 0 &&
      value.tokens >= 0)
  );
}
function validManualScore(value: unknown): value is ManualScore {
  return (
    record(value) &&
    exact(value, [
      'attemptId',
      'passed',
      ...(Object.hasOwn(value, 'note') ? ['note'] : []),
    ]) &&
    typeof value.attemptId === 'string' &&
    typeof value.passed === 'boolean' &&
    (!Object.hasOwn(value, 'note') ||
      (typeof value.note === 'string' && value.note.length <= 4000))
  );
}
function exact(value: Record<string, unknown>, keys: readonly string[]) {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function scoreOutput(kind: string, output: string, expected: string) {
  return kind === 'manual'
    ? null
    : kind === 'exact-match'
      ? output.trim() === expected.trim()
      : output.includes(expected.trim());
}
function summarizeRun(run: EvaluationRun): EvaluationAggregate[] {
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
            aggregates: summarizeRun(run),
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
