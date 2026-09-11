import type {
  CommitError,
  CommitRecord,
  CommitValidationResult,
  ParsedCommit,
} from './contracts.ts';

export interface CommitCatalogItem {
  id: string;
  operations?: readonly { id: string; bindings?: readonly { id: string }[] }[];
  events?: readonly { id: string }[];
  risks?: readonly { id: string }[];
}

export interface CommitParseOptions {
  catalog?: readonly CommitCatalogItem[];
}

const recordKeys = new Set([
  'Added',
  'Changed',
  'Removed',
  'Fixed',
  'Renamed',
  'Replacement',
  'Access-Changed',
  'Contract-Changed',
  'Risk-Changed',
  'Cause',
  'Suspected-Cause',
  'Resolution',
  'Reason',
  'Verification',
  'Migration',
  'Reverts',
]);
const bindingDetails = new Set([
  'http',
  'mcp-tool',
  'mcp-resource',
  'cli',
  'feed',
  'export',
  'mirror',
]);
const targetPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

function fail(message: string, code: string, line?: number): never {
  throw { code, message, ...(line ? { line } : {}) } satisfies CommitError;
}

function validatePath(value: string, line?: number): string {
  if (
    !value ||
    value.startsWith('/') ||
    /^[A-Za-z]:[\\/]/.test(value) ||
    /[\s|]/.test(value) ||
    value.includes('\\')
  )
    fail(`Unsafe manifest path: ${value}`, 'invalid-manifest-path', line);
  const normalized = value
    .split('/')
    .reduce<string[]>((parts, part) => {
      if (part === '..') parts.pop();
      else if (part !== '.') parts.push(part);
      return parts;
    }, [])
    .join('/');
  if (
    normalized !== value ||
    normalized === '.' ||
    normalized.startsWith('../') ||
    value.includes('//')
  )
    fail(`Unsafe manifest path: ${value}`, 'invalid-manifest-path', line);
  if (
    value
      .split('/')
      .some((part) => part === '' || part === '.' || part === '..')
  )
    fail(`Unsafe manifest path: ${value}`, 'invalid-manifest-path', line);
  return value;
}

function validateTarget(value: string, line?: number): string {
  if (!targetPattern.test(value) || /[|\s]/.test(value))
    fail(`Invalid stable target: ${value}`, 'invalid-target', line);
  return value;
}

function parseSubject(line: string): ParsedCommit['subject'] {
  const match =
    /^(?<type>[a-z0-9-]+)(?:\((?<scope>[^()\n]+)\))?(?<breaking>!)?: (?<description>[^\n]+)$/.exec(
      line,
    );
  if (!match?.groups || !match.groups.description.trim())
    fail('Invalid Conventional Commit subject', 'invalid-subject', 1);
  const groups = match.groups;
  return {
    type: groups.type,
    scope: groups.scope ?? null,
    breaking: Boolean(groups.breaking),
    description: groups.description,
  };
}

function parseRecord(line: string, lineNumber: number): CommitRecord {
  const separator = line.indexOf(': ');
  if (separator < 1 || line.endsWith(': '))
    fail('Record must use `Key: value` syntax', 'invalid-record', lineNumber);
  const key = line.slice(0, separator);
  const value = line.slice(separator + 2);
  if (!/^(?:[A-Z][A-Za-z0-9-]*|X-[A-Za-z0-9-]+)$/.test(key))
    fail(`Invalid record key: ${key}`, 'invalid-key', lineNumber);
  if (!value.trim() || value.includes('\n'))
    fail(`Empty record: ${key}`, 'empty-record', lineNumber);
  if (key === 'Manifest-Commit') {
    if (!/^\d+$/.test(value))
      fail(
        'Manifest-Commit must be a version number',
        'invalid-version',
        lineNumber,
      );
    return { key, value, line: lineNumber };
  }
  if (key === 'Manifest') {
    validatePath(value, lineNumber);
    return { key, value, line: lineNumber };
  }
  if (!value.includes(' | '))
    fail(
      `Record needs target and detail: ${key}`,
      'invalid-record',
      lineNumber,
    );
  const split = value.indexOf(' | ');
  const target = validateTarget(value.slice(0, split), lineNumber);
  const detail = value.slice(split + 3);
  if (!detail.trim()) fail(`Empty detail: ${key}`, 'empty-detail', lineNumber);
  return { key, target, detail, line: lineNumber };
}

function catalogIds(catalog: readonly CommitCatalogItem[]): Set<string> {
  const ids = new Set<string>();
  for (const item of catalog ?? []) {
    ids.add(item.id);
    for (const operation of item.operations ?? []) {
      ids.add(operation.id);
      for (const binding of operation.bindings ?? []) ids.add(binding.id);
    }
    for (const event of item.events ?? []) ids.add(event.id);
    for (const risk of item.risks ?? []) ids.add(risk.id);
  }
  return ids;
}

function validateKnownReferences(
  records: readonly CommitRecord[],
  catalog: readonly CommitCatalogItem[] | undefined,
  line: number,
): void {
  if (!catalog) return;
  const ids = catalogIds(catalog);
  for (const record of records) {
    if (!record.target || record.key.startsWith('X-')) continue;
    if (record.key === 'Contract-Changed' || record.key === 'Migration') {
      validatePath(record.target, record.line);
      continue;
    }
    if (!ids.has(record.target))
      fail(
        `Unknown stable target: ${record.target}`,
        'unknown-target',
        record.line ?? line,
      );
  }
}

function validateBindingDetail(record: CommitRecord): void {
  if (!record.target || !record.detail) return;
  const suffix = record.target.split('.').at(-1);
  const detail = record.detail;
  const patterns: Record<string, RegExp> = {
    http: /^http (GET|POST|PUT|PATCH|DELETE) \S+(?: -> http (GET|POST|PUT|PATCH|DELETE) \S+)?$/,
    'mcp-tool': /^mcp-tool \S+(?: -> mcp-tool \S+)?$/,
    'mcp-resource': /^mcp-resource \S+(?: -> mcp-resource \S+)?$/,
    cli: /^cli \S+(?: -> cli \S+)?$/,
    feed: /^feed (rss|atom) \S+(?: -> feed (rss|atom) \S+)?$/,
    export:
      /^export (markdown|json|offline-bundle) \S+(?: -> export (markdown|json|offline-bundle) \S+)?$/,
    mirror: /^mirror (onion|ipfs)(?: -> mirror (onion|ipfs))?$/,
  };
  if (suffix && patterns[suffix] && !patterns[suffix].test(detail))
    fail(
      `Invalid ${suffix} binding detail`,
      'invalid-binding-detail',
      record.line,
    );
}

export function parseCommitMessage(
  message: string,
  options: CommitParseOptions = {},
): ParsedCommit {
  if (typeof message !== 'string' || !message.trim())
    fail('Commit message is empty', 'empty-message');
  if (message.includes('\r'))
    fail('Commit message must use LF line endings', 'invalid-line-ending');
  const lines = message.split('\n');
  while (lines.at(-1) === '') lines.pop();
  const subject = parseSubject(lines[0]);
  const records: CommitRecord[] = [];
  let sawBlank = false;
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === '') {
      sawBlank = true;
      continue;
    }
    if (index === 1 || !sawBlank)
      fail(
        'Subject must be followed by a blank line',
        'missing-separator',
        index + 1,
      );
    if (/^BREAKING CHANGE: /.test(line)) {
      records.push({
        key: 'BREAKING CHANGE',
        value: line.slice(17),
        line: index + 1,
      });
      continue;
    }
    records.push(parseRecord(line, index + 1));
    sawBlank = false;
  }
  const versions = records.filter((record) => record.key === 'Manifest-Commit');
  const hasManifestRecords = records.some(
    (record) => !['BREAKING CHANGE', 'Manifest-Commit'].includes(record.key),
  );
  if (
    hasManifestRecords &&
    (versions.length !== 1 || versions[0].value !== '0')
  )
    fail(
      'Exactly one `Manifest-Commit: 0` record is required',
      'invalid-version',
    );
  if (!hasManifestRecords && versions.length > 0)
    fail('Manifest-Commit requires manifest records', 'invalid-version');
  const manifests = records.filter((record) => record.key === 'Manifest');
  if (
    new Set(manifests.map((record) => record.value)).size !== manifests.length
  )
    fail('Manifest paths must be unique', 'duplicate-manifest');
  if (
    !manifests.length &&
    records.some(
      (record) =>
        record.key !== 'Manifest-Commit' && record.key !== 'BREAKING CHANGE',
    )
  )
    fail(
      'Manifest records are required for manifest records',
      'missing-manifest',
    );
  if (versions.length > 0 && !manifests.length)
    fail('Manifest-Commit requires a Manifest record', 'missing-manifest');
  if (
    subject.breaking &&
    !records.some((record) => record.key === 'BREAKING CHANGE')
  )
    fail(
      'Breaking subjects require a BREAKING CHANGE footer',
      'missing-breaking-footer',
    );
  validateKnownReferences(records, options.catalog, lines.length);
  for (const record of records) {
    if (
      record.key === 'BREAKING CHANGE' ||
      record.key === 'Manifest-Commit' ||
      record.key === 'Manifest' ||
      record.key.startsWith('X-')
    )
      continue;
    if (!recordKeys.has(record.key))
      fail(
        `Unknown core record key: ${record.key}`,
        'unknown-key',
        record.line,
      );
    if (!record.target || !record.detail)
      fail(
        `Record needs target and detail: ${record.key}`,
        'invalid-record',
        record.line,
      );
    if (record.detail.includes('|'))
      fail(
        'Pipes are not allowed in record details',
        'invalid-detail',
        record.line,
      );
    if (record.key === 'Contract-Changed')
      validatePath(record.target, record.line);
    validateBindingDetail(record);
    if (
      bindingDetails.has(record.detail.split(' ')[0]) &&
      !record.detail.includes(' -> ') &&
      record.key === 'Changed'
    )
      fail(
        'Changed binding records must include old -> new',
        'missing-transition',
        record.line,
      );
  }
  return { subject, records };
}

export function validateCommitMessage(
  message: string,
  options: CommitParseOptions = {},
): CommitValidationResult {
  try {
    return {
      valid: true,
      commit: parseCommitMessage(message, options),
      errors: [],
    };
  } catch (error: unknown) {
    if (
      !error ||
      typeof error !== 'object' ||
      !('code' in error) ||
      typeof error.code !== 'string'
    )
      throw error;
    const failure = error as CommitError;
    return { valid: false, commit: null, errors: [failure] };
  }
}
