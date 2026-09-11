import type {
  DashboardError,
  DashboardSummaryInput,
} from '../contracts/summary.ts';

export type InputResult =
  | { ok: true; value: DashboardSummaryInput }
  | { ok: false; error: DashboardError };

export function parseSummaryInput(input: unknown): InputResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return invalidInput('from and to must be date-time strings');
  }
  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.some(([key]) => key !== 'from' && key !== 'to')) {
    return invalidInput('only from and to are accepted');
  }
  const candidate = input as Record<string, unknown>;
  if (typeof candidate.from !== 'string' || typeof candidate.to !== 'string') {
    return invalidInput('from and to must be date-time strings');
  }
  return {
    ok: true,
    value: { from: utcInput(candidate.from), to: utcInput(candidate.to) },
  };
}

export function parseSummaryQuery(url: string): InputResult {
  try {
    const query = new URL(url).searchParams;
    const counts = new Map<string, number>();
    for (const key of query.keys()) counts.set(key, (counts.get(key) ?? 0) + 1);
    for (const [key, count] of counts) {
      if (key !== 'from' && key !== 'to')
        return invalidInput(`unexpected query parameter: ${key}`);
      if (count !== 1) return invalidInput(`${key} must be provided once`);
    }
    return parseSummaryInput({ from: query.get('from'), to: query.get('to') });
  } catch {
    return invalidInput('the request URL is invalid');
  }
}

export function utcInput(value: string): string {
  const normalized = value.replace(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?=$|Z|[+-])/i,
    '$1:00',
  );
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized)
    ? normalized
    : `${normalized}Z`;
}

export function errorStatus(code: DashboardError['code']): number {
  if (code === 'invalid_input') return 400;
  if (code === 'unauthenticated') return 401;
  if (code === 'forbidden') return 403;
  if (code === 'not_found') return 404;
  if (code === 'conflict') return 409;
  return 503;
}

function invalidInput(message: string): InputResult {
  return { ok: false, error: { code: 'invalid_input', message } };
}
