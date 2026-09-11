import type {
  EvaluationDefinition,
  EvaluationState,
} from '../contracts/index.ts';

export const guestDefinition: Omit<
  EvaluationDefinition,
  'id' | 'ownerId' | 'revision' | 'frozenAt' | 'createdAt'
> = {
  name: 'Answer formatting',
  hypothesis: 'A concise instruction may improve exact answers.',
  cases: [{ id: 'capital', input: 'Capital of France?', expected: 'Paris' }],
  subjects: [
    {
      id: 'sample-model',
      label: 'Sample model',
      configuration: { provider: 'synthetic' },
    },
  ],
  metric: { kind: 'exact-match' },
  repetitions: 1,
  budget: { maxRequests: 1, maxTokens: 100 },
};

export const emptyEvaluationState = (): EvaluationState => ({
  schemaVersion: 1,
  version: 0,
  synthetic: true,
  definitions: [],
  runs: [],
  aggregates: [],
});
