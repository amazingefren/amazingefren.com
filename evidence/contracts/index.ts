export type EvidenceKind = 'claim' | 'observation';
export type EvidenceReview = 'draft' | 'reviewed';
export type EvidenceSource = { id: string; label: string; reference: string };
export type EvidenceRecord = {
  id: string;
  kind: EvidenceKind;
  text: string;
  sources: EvidenceSource[];
  review: EvidenceReview;
  revision: number;
  createdAt: string;
  reviewedAt: string | null;
};
export type EvidenceState = {
  version: number;
  synthetic: boolean;
  records: EvidenceRecord[];
};
export type EvidenceReport = {
  synthetic: boolean;
  records: EvidenceRecord[];
  revision: number;
};
export type EvidenceError = {
  code: 'invalid' | 'missing' | 'conflict' | 'denied' | 'unavailable';
  message: string;
};
export type EvidenceResult =
  | { ok: true; value: EvidenceState }
  | { ok: true; report: EvidenceReport }
  | { ok: false; error: EvidenceError };
export type EvidenceCommand =
  | { operation: 'evidence.read' }
  | {
      operation: 'evidence.create';
      input: { kind: EvidenceKind; text: string; sources: EvidenceSource[] };
    }
  | {
      operation: 'evidence.update';
      id: string;
      revision: number;
      input: { text: string; sources: EvidenceSource[] };
    }
  | { operation: 'evidence.review'; id: string; revision: number }
  | { operation: 'evidence.export-reviewed' };
export type EvidencePort = {
  execute(command: EvidenceCommand): Promise<EvidenceResult>;
};
export const maxEvidenceCommandBytes = 524_288;
export const maxEvidenceStateBytes = 8_000_000;
export function parseEvidenceCommand(value: unknown): EvidenceCommand | null {
  if (!record(value) || typeof value.operation !== 'string') return null;
  if (
    value.operation === 'evidence.read' ||
    value.operation === 'evidence.export-reviewed'
  )
    return exact(value, ['operation']) ? (value as EvidenceCommand) : null;
  if (value.operation === 'evidence.review')
    return exact(value, ['operation', 'id', 'revision']) &&
      id(value.id) &&
      revision(value.revision)
      ? (value as EvidenceCommand)
      : null;
  if (value.operation === 'evidence.create')
    return exact(value, ['operation', 'input']) && create(value.input)
      ? (value as EvidenceCommand)
      : null;
  if (value.operation === 'evidence.update')
    return exact(value, ['operation', 'id', 'revision', 'input']) &&
      id(value.id) &&
      revision(value.revision) &&
      update(value.input)
      ? (value as EvidenceCommand)
      : null;
  return null;
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));
const id = (value: unknown) =>
  typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,99}$/.test(value);
const revision = (value: unknown) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const source = (value: unknown) =>
  record(value) &&
  exact(value, ['id', 'label', 'reference']) &&
  id(value.id) &&
  [value.label, value.reference].every(
    (item) =>
      typeof item === 'string' && item.trim().length > 0 && item.length <= 4000,
  );
const update = (value: unknown) =>
  record(value) &&
  exact(value, ['text', 'sources']) &&
  typeof value.text === 'string' &&
  value.text.trim().length > 0 &&
  value.text.length <= 20_000 &&
  Array.isArray(value.sources) &&
  value.sources.length <= 32 &&
  value.sources.every(source) &&
  new Set(value.sources.map((item) => (item as EvidenceSource).id)).size ===
    value.sources.length;
const create = (value: unknown) =>
  record(value) &&
  exact(value, ['kind', 'text', 'sources']) &&
  ['claim', 'observation'].includes(String(value.kind)) &&
  update({ text: value.text, sources: value.sources });

export function isEvidenceRecord(value: unknown): value is EvidenceRecord {
  return (
    record(value) &&
    exact(value, [
      'id',
      'kind',
      'text',
      'sources',
      'review',
      'revision',
      'createdAt',
      'reviewedAt',
    ]) &&
    id(value.id) &&
    revision(value.revision) &&
    create({ kind: value.kind, text: value.text, sources: value.sources }) &&
    date(value.createdAt) &&
    (value.review === 'draft'
      ? value.reviewedAt === null
      : value.review === 'reviewed' &&
        date(value.reviewedAt) &&
        Array.isArray(value.sources) &&
        value.sources.length > 0)
  );
}
export function isEvidenceState(value: unknown): value is EvidenceState {
  return (
    record(value) &&
    exact(value, ['version', 'synthetic', 'records']) &&
    count(value.version) &&
    typeof value.synthetic === 'boolean' &&
    records(value.records)
  );
}
export function isEvidenceResult(value: unknown): value is EvidenceResult {
  if (!record(value)) return false;
  if (value.ok === false)
    return (
      exact(value, ['ok', 'error']) &&
      record(value.error) &&
      exact(value.error, ['code', 'message']) &&
      ['invalid', 'missing', 'conflict', 'denied', 'unavailable'].includes(
        String(value.error.code),
      ) &&
      typeof value.error.message === 'string'
    );
  if (value.ok !== true) return false;
  if ('value' in value)
    return exact(value, ['ok', 'value']) && isEvidenceState(value.value);
  return (
    exact(value, ['ok', 'report']) &&
    record(value.report) &&
    exact(value.report, ['records', 'revision', 'synthetic']) &&
    count(value.report.revision) &&
    typeof value.report.synthetic === 'boolean' &&
    records(value.report.records) &&
    value.report.records.every((item) => item.review === 'reviewed')
  );
}
const count = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const date = (value: unknown) =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));
const records = (value: unknown): value is EvidenceRecord[] =>
  Array.isArray(value) &&
  value.length <= 500 &&
  value.every(isEvidenceRecord) &&
  new Set(value.map((item) => item.id)).size === value.length;
