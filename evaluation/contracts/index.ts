export type EvaluationMetric =
  { kind: 'exact-match' } | { kind: 'contains' } | { kind: 'manual' };

export type EvaluationCase = { id: string; input: string; expected: string };
export type EvaluationSubject = {
  id: string;
  label: string;
  configuration: Record<string, string | number | boolean | null>;
};
export type EvaluationBudget = { maxRequests: number; maxTokens: number };
export type EvaluationDefinition = {
  id: string;
  ownerId: string;
  name: string;
  hypothesis: string;
  cases: readonly EvaluationCase[];
  subjects: readonly EvaluationSubject[];
  metric: EvaluationMetric;
  repetitions: number;
  budget: EvaluationBudget;
  revision: number;
  frozenAt: string | null;
  createdAt: string;
};
export type EvaluationAttempt = {
  id: string;
  subjectId: string;
  caseId: string;
  repetition: number;
  status: 'completed' | 'failed' | 'cancelled';
  output: string | null;
  failure: string | null;
  usage: { requests: number | null; tokens: number | null } | null;
  score: boolean | null;
  scoreNote: string | null;
};
export type EvaluationRun = {
  id: string;
  ownerId: string;
  definitionId: string;
  definitionRevision: number;
  definition: EvaluationDefinition;
  status: 'planned' | 'running' | 'complete' | 'cancelled';
  startedAt: string | null;
  completedAt: string | null;
  attempts: readonly EvaluationAttempt[];
};
export type EvaluationAggregate = {
  subjectId: string;
  scheduled: number;
  completed: number;
  passed: number;
  failed: number;
  unknown: number;
  passRate: number | null;
};
export type EvaluationState = {
  schemaVersion: 1;
  version: number;
  synthetic: boolean;
  definitions: readonly EvaluationDefinition[];
  runs: readonly EvaluationRun[];
  aggregates: readonly EvaluationAggregate[];
};
export type EvaluationCommand =
  | { operation: 'evaluation.read'; definitionId?: string; runId?: string }
  | {
      operation: 'evaluation.create-definition';
      input: Omit<
        EvaluationDefinition,
        'id' | 'ownerId' | 'revision' | 'frozenAt' | 'createdAt'
      >;
    }
  | {
      operation: 'evaluation.update-definition';
      definitionId: string;
      revision: number;
      input: Omit<
        EvaluationDefinition,
        'id' | 'ownerId' | 'revision' | 'frozenAt' | 'createdAt'
      >;
    }
  | {
      operation: 'evaluation.freeze-definition';
      definitionId: string;
      revision: number;
    }
  | {
      operation: 'evaluation.create-run';
      definitionId: string;
      revision: number;
    }
  | { operation: 'evaluation.execute-run'; runId: string }
  | { operation: 'evaluation.cancel-run'; runId: string }
  | {
      operation: 'evaluation.import-attempts';
      runId: string;
      attempts: readonly Omit<
        EvaluationAttempt,
        'id' | 'score' | 'scoreNote'
      >[];
    }
  | {
      operation: 'evaluation.score-manual';
      runId: string;
      scores: readonly { attemptId: string; passed: boolean; note?: string }[];
    }
  | {
      operation: 'evaluation.export-report';
      runId?: string;
      format: 'json' | 'markdown';
    };
export type EvaluationReport = {
  format: 'json' | 'markdown';
  definitions: readonly Pick<
    EvaluationDefinition,
    'id' | 'name' | 'hypothesis' | 'revision' | 'frozenAt'
  >[];
  runs: readonly {
    id: string;
    definitionId: string;
    definitionRevision: number;
    status: EvaluationRun['status'];
    aggregates: readonly EvaluationAggregate[];
  }[];
  observations: readonly string[];
};
export type EvaluationError = {
  code: 'invalid' | 'denied' | 'missing' | 'conflict' | 'unavailable';
  message: string;
};
export type EvaluationResult =
  | { ok: true; value: EvaluationState }
  | { ok: true; report: EvaluationReport }
  | { ok: false; error: EvaluationError };
export type EvaluationPort = {
  execute(command: EvaluationCommand): Promise<EvaluationResult>;
};
export const maxEvaluationCommandBytes = 524_288;
export const maxEvaluationStateBytes = 8_000_000;
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));
const id = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(value);
const count = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0;
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max;
const usage = (value: unknown) =>
  value === null ||
  (object(value) &&
    exact(value, ['requests', 'tokens']) &&
    [value.requests, value.tokens].every(
      (number) => number === null || count(number),
    ));
const definition = (value: unknown): value is EvaluationDefinition =>
  object(value) &&
  exact(value, [
    'id',
    'ownerId',
    'name',
    'hypothesis',
    'cases',
    'subjects',
    'metric',
    'repetitions',
    'budget',
    'revision',
    'frozenAt',
    'createdAt',
  ]) &&
  id(value.id) &&
  id(value.ownerId) &&
  text(value.name, 160) &&
  text(value.hypothesis, 4000) &&
  Array.isArray(value.cases) &&
  value.cases.length > 0 &&
  value.cases.length <= 500 &&
  value.cases.every(
    (item) =>
      object(item) &&
      exact(item, ['id', 'input', 'expected']) &&
      id(item.id) &&
      text(item.input, 100_000) &&
      text(item.expected, 100_000),
  ) &&
  new Set(value.cases.map((item) => item.id)).size === value.cases.length &&
  Array.isArray(value.subjects) &&
  value.subjects.length > 0 &&
  value.subjects.length <= 50 &&
  value.subjects.every(
    (item) =>
      object(item) &&
      exact(item, ['id', 'label', 'configuration']) &&
      id(item.id) &&
      text(item.label, 160) &&
      object(item.configuration) &&
      Object.values(item.configuration).every(
        (setting) =>
          setting === null ||
          ['string', 'number', 'boolean'].includes(typeof setting),
      ),
  ) &&
  new Set(value.subjects.map((item) => item.id)).size ===
    value.subjects.length &&
  object(value.metric) &&
  exact(value.metric, ['kind']) &&
  ['exact-match', 'contains', 'manual'].includes(String(value.metric.kind)) &&
  count(value.repetitions) &&
  value.repetitions >= 1 &&
  value.repetitions <= 20 &&
  object(value.budget) &&
  exact(value.budget, ['maxRequests', 'maxTokens']) &&
  count(value.budget.maxRequests) &&
  value.budget.maxRequests > 0 &&
  count(value.budget.maxTokens) &&
  value.budget.maxTokens > 0 &&
  count(value.revision) &&
  value.revision > 0 &&
  (value.frozenAt === null || text(value.frozenAt, 64)) &&
  text(value.createdAt, 64);
export function isEvaluationState(value: unknown): value is EvaluationState {
  return (
    object(value) &&
    exact(value, [
      'schemaVersion',
      'version',
      'synthetic',
      'definitions',
      'runs',
      'aggregates',
    ]) &&
    value.schemaVersion === 1 &&
    count(value.version) &&
    typeof value.synthetic === 'boolean' &&
    Array.isArray(value.definitions) &&
    Array.isArray(value.runs) &&
    Array.isArray(value.aggregates) &&
    value.definitions.length <= 500 &&
    value.runs.length <= 5_000 &&
    value.aggregates.length <= 250_000 &&
    value.definitions.every(definition) &&
    new Set(value.definitions.map((item) => item.id)).size ===
      value.definitions.length &&
    value.runs.every(validRun) &&
    value.aggregates.every(
      (item) =>
        object(item) &&
        exact(item, [
          'subjectId',
          'scheduled',
          'completed',
          'passed',
          'failed',
          'unknown',
          'passRate',
        ]) &&
        id(item.subjectId) &&
        ['scheduled', 'completed', 'passed', 'failed', 'unknown'].every((key) =>
          count(item[key]),
        ) &&
        (item.passRate === null ||
          (typeof item.passRate === 'number' &&
            Number.isFinite(item.passRate) &&
            item.passRate >= 0 &&
            item.passRate <= 1)),
    )
  );
}
function validRun(value: unknown): value is EvaluationRun {
  if (
    !object(value) ||
    !exact(value, [
      'id',
      'ownerId',
      'definitionId',
      'definitionRevision',
      'definition',
      'status',
      'startedAt',
      'completedAt',
      'attempts',
    ]) ||
    !id(value.id) ||
    !id(value.ownerId) ||
    !id(value.definitionId) ||
    !count(value.definitionRevision) ||
    !definition(value.definition) ||
    value.definition.id !== value.definitionId ||
    value.definition.revision !== value.definitionRevision ||
    !['planned', 'running', 'complete', 'cancelled'].includes(
      String(value.status),
    ) ||
    !(value.startedAt === null || text(value.startedAt, 64)) ||
    !(value.completedAt === null || text(value.completedAt, 64)) ||
    !Array.isArray(value.attempts) ||
    value.attempts.length > 50_000
  )
    return false;
  const frozen = value.definition as EvaluationDefinition;
  return value.attempts.every(
    (attempt) =>
      object(attempt) &&
      exact(attempt, [
        'id',
        'subjectId',
        'caseId',
        'repetition',
        'status',
        'output',
        'failure',
        'usage',
        'score',
        'scoreNote',
      ]) &&
      id(attempt.id) &&
      frozen.subjects.some(
        (subject: EvaluationSubject) => subject.id === attempt.subjectId,
      ) &&
      frozen.cases.some((test: EvaluationCase) => test.id === attempt.caseId) &&
      count(attempt.repetition) &&
      attempt.repetition >= 1 &&
      attempt.repetition <= frozen.repetitions &&
      ['completed', 'failed', 'cancelled'].includes(String(attempt.status)) &&
      (attempt.output === null || text(attempt.output, 1_000_000)) &&
      (attempt.failure === null || text(attempt.failure, 4000)) &&
      usage(attempt.usage) &&
      (attempt.score === null || typeof attempt.score === 'boolean') &&
      (attempt.scoreNote === null || text(attempt.scoreNote, 4000)),
  );
}
export function parseEvaluationCommand(
  value: unknown,
): EvaluationCommand | null {
  if (!object(value) || typeof value.operation !== 'string') return null;
  const operation = value.operation;
  if (operation === 'evaluation.read')
    return exact(value, ['operation']) ||
      (exact(value, ['operation', 'definitionId']) && id(value.definitionId)) ||
      (exact(value, ['operation', 'runId']) && id(value.runId))
      ? (value as EvaluationCommand)
      : null;
  if (operation === 'evaluation.freeze-definition')
    return exact(value, ['operation', 'definitionId', 'revision']) &&
      id(value.definitionId) &&
      count(value.revision) &&
      value.revision > 0
      ? (value as EvaluationCommand)
      : null;
  if (operation === 'evaluation.create-run')
    return exact(value, ['operation', 'definitionId', 'revision']) &&
      id(value.definitionId) &&
      count(value.revision) &&
      value.revision > 0
      ? (value as EvaluationCommand)
      : null;
  if (
    operation === 'evaluation.execute-run' ||
    operation === 'evaluation.cancel-run'
  )
    return exact(value, ['operation', 'runId']) && id(value.runId)
      ? (value as EvaluationCommand)
      : null;
  if (operation === 'evaluation.export-report')
    return (exact(value, ['operation', 'format']) ||
      (exact(value, ['operation', 'format', 'runId']) && id(value.runId))) &&
      (value.format === 'json' || value.format === 'markdown')
      ? (value as EvaluationCommand)
      : null;
  if (operation === 'evaluation.create-definition')
    return exact(value, ['operation', 'input']) &&
      object(value.input) &&
      validDefinitionInput(value.input)
      ? (value as EvaluationCommand)
      : null;
  if (operation === 'evaluation.update-definition')
    return exact(value, ['operation', 'definitionId', 'revision', 'input']) &&
      id(value.definitionId) &&
      count(value.revision) &&
      value.revision > 0 &&
      object(value.input) &&
      validDefinitionInput(value.input)
      ? (value as EvaluationCommand)
      : null;
  if (operation === 'evaluation.import-attempts')
    return exact(value, ['operation', 'runId', 'attempts']) &&
      id(value.runId) &&
      Array.isArray(value.attempts) &&
      value.attempts.length <= 50_000
      ? (value as EvaluationCommand)
      : null;
  if (operation === 'evaluation.score-manual')
    return exact(value, ['operation', 'runId', 'scores']) &&
      id(value.runId) &&
      Array.isArray(value.scores) &&
      value.scores.length <= 50_000
      ? (value as EvaluationCommand)
      : null;
  return null;
}
function validDefinitionInput(value: Record<string, unknown>): boolean {
  return (
    exact(value, [
      'name',
      'hypothesis',
      'cases',
      'subjects',
      'metric',
      'repetitions',
      'budget',
    ]) &&
    definition({
      ...value,
      id: 'input',
      ownerId: 'input',
      revision: 1,
      frozenAt: null,
      createdAt: '',
    })
  );
}
