import { isEvaluationState, type EvaluationResult } from './index.ts';

export function isEvaluationResult(value: unknown): value is EvaluationResult {
  if (!record(value) || typeof value.ok !== 'boolean') return false;
  if (!value.ok)
    return (
      record(value.error) &&
      ['invalid', 'denied', 'missing', 'conflict', 'unavailable'].includes(
        String(value.error.code),
      ) &&
      typeof value.error.message === 'string'
    );
  if ('value' in value)
    return isEvaluationState(value.value) && !value.value.synthetic;
  return (
    record(value.report) &&
    ['json', 'markdown'].includes(String(value.report.format)) &&
    Array.isArray(value.report.definitions) &&
    Array.isArray(value.report.runs) &&
    Array.isArray(value.report.observations) &&
    value.report.observations.every((item) => typeof item === 'string')
  );
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
