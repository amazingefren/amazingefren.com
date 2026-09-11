import {
  parseEvidenceCommand,
  isEvidenceState,
  type EvidencePort,
  type EvidenceResult,
  type EvidenceState,
} from '../contracts/index.ts';

export function createGuestEvidencePort(initial?: EvidenceState): EvidencePort {
  if (
    initial !== undefined &&
    (!isEvidenceState(initial) || !initial.synthetic)
  )
    throw new Error('Guest evidence state is invalid.');
  let state: EvidenceState = initial
    ? clone(initial)
    : { version: 0, synthetic: true, records: [] };
  let number = 0;
  const change = (patch: Partial<EvidenceState>) =>
    (state = { ...state, ...patch, version: state.version + 1 });
  return {
    async execute(raw): Promise<EvidenceResult> {
      const command = parseEvidenceCommand(raw);
      if (!command) return fail('invalid', 'Evidence command is invalid.');
      if (command.operation === 'evidence.read') return ok(state);
      if (command.operation === 'evidence.export-reviewed')
        return {
          ok: true,
          report: {
            synthetic: true,
            records: clone(
              state.records.filter((item) => item.review === 'reviewed'),
            ),
            revision: state.version,
          },
        };
      if (command.operation === 'evidence.create') {
        if (state.records.length >= 500)
          return fail('invalid', 'Evidence record limit reached.');
        while (
          state.records.some((item) => item.id === `evidence-${number + 1}`)
        )
          number++;
        const item = {
          ...clone(command.input),
          id: `evidence-${++number}`,
          review: 'draft' as const,
          revision: 1,
          createdAt: '1970-01-01T00:00:00.000Z',
          reviewedAt: null,
        };
        state = change({ records: [...state.records, item] });
        return ok(state);
      }
      const item = state.records.find((record) => record.id === command.id);
      if (!item) return fail('missing', 'Evidence record was not found.');
      if (item.revision !== command.revision)
        return fail('conflict', 'Evidence record changed.');
      if (command.operation === 'evidence.update') {
        if (item.review === 'reviewed')
          return fail('conflict', 'Reviewed evidence cannot change.');
        state = change({
          records: state.records.map((record) =>
            record.id === item.id
              ? {
                  ...record,
                  ...clone(command.input),
                  revision: record.revision + 1,
                }
              : record,
          ),
        });
        return ok(state);
      }
      if (command.operation === 'evidence.review') {
        if (item.review === 'reviewed')
          return fail('conflict', 'Evidence record is already reviewed.');
        if (!item.sources.length)
          return fail('invalid', 'Reviewed evidence requires a source.');
        state = change({
          records: state.records.map((record) =>
            record.id === item.id
              ? {
                  ...record,
                  review: 'reviewed',
                  revision: record.revision + 1,
                  reviewedAt: '1970-01-01T00:00:00.000Z',
                }
              : record,
          ),
        });
        return ok(state);
      }
      return fail('invalid', 'Evidence operation is undeclared.');
    },
  };
}
function clone<T>(value: T): T {
  return structuredClone(value);
}
function ok(value: EvidenceState): EvidenceResult {
  return { ok: true, value: clone(value) };
}
function fail(
  code: 'invalid' | 'missing' | 'conflict',
  message: string,
): EvidenceResult {
  return { ok: false, error: { code, message } };
}
