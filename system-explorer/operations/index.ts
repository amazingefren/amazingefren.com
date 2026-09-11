import type {
  CatalogEntry,
  CatalogList,
  CatalogRead,
  CatalogResult,
  ListInput,
  ReadInput,
  SystemExplorerPort,
} from '../contracts.ts';
import {
  createPublicCatalogSource,
  revision,
  type CatalogSource,
} from '../domain/catalog/source.ts';

export function createSystemExplorer(
  options: { source?: CatalogSource; sourceRevision?: string } = {},
): SystemExplorerPort {
  const source =
    options.source ?? createPublicCatalogSource(options.sourceRevision);
  const entries = source.entries
    .map(copy)
    .sort((left, right) => left.id.localeCompare(right.id));
  const catalogRevision = revision(entries);
  const provenance = {
    scheme: 'catalog-fnv1a32' as const,
    sourceRevision: source.sourceRevision ?? null,
  };
  return {
    list(input) {
      const parsed = parseListInput(input);
      if (!parsed.ok) return parsed;
      const start = parsed.value.cursor
        ? entries.findIndex((entry) => entry.id === parsed.value.cursor) + 1
        : 0;
      if (parsed.value.cursor && start === 0)
        return invalid('Cursor does not identify an approved system');
      const items = entries.slice(start, start + parsed.value.limit).map(copy);
      const next = entries[start + items.length];
      return {
        ok: true,
        value: {
          catalogRevision,
          provenance,
          items,
          nextCursor: next ? (items.at(-1)?.id ?? null) : null,
        },
      };
    },
    read(input) {
      const parsed = parseReadInput(input);
      if (!parsed.ok) return parsed;
      const entry = entries.find((item) => item.id === parsed.value.id);
      if (!entry)
        return {
          ok: false,
          error: {
            code: 'not_found',
            message: 'System is not approved for public catalog access',
          },
        };
      return {
        ok: true,
        value: { ...copy(entry), catalogRevision, provenance },
      };
    },
  };
}

export function readFullSystemCatalog(
  port: SystemExplorerPort,
): CatalogResult<CatalogList> {
  const first = port.list({ limit: 100 });
  if (!first.ok) return first;
  const items = [...first.value.items];
  const seen = new Set<string>();
  let cursor = first.value.nextCursor;
  while (cursor) {
    if (seen.has(cursor))
      return {
        ok: false,
        error: {
          code: 'unavailable',
          message: 'Catalog cursor repeated while export was generated',
        },
      };
    seen.add(cursor);
    const page = port.list({ cursor, limit: 100 });
    if (!page.ok) return page;
    if (page.value.catalogRevision !== first.value.catalogRevision)
      return {
        ok: false,
        error: {
          code: 'unavailable',
          message: 'Catalog changed while export was generated',
        },
      };
    items.push(...page.value.items);
    cursor = page.value.nextCursor;
  }
  return { ok: true, value: { ...first.value, items, nextCursor: null } };
}

export function parseListInput(
  input: unknown,
): CatalogResult<Required<ListInput>> {
  if (input === undefined || input === null)
    return { ok: true, value: { limit: 100, cursor: '' } };
  if (!record(input) || !only(input, ['cursor', 'limit']))
    return invalid('List input is invalid');
  if (
    input.cursor !== undefined &&
    (typeof input.cursor !== 'string' || !input.cursor.length)
  )
    return invalid('Cursor is invalid');
  if (
    input.limit !== undefined &&
    (typeof input.limit !== 'number' ||
      !Number.isInteger(input.limit) ||
      input.limit < 1 ||
      input.limit > 100)
  )
    return invalid('Limit must be an integer from 1 through 100');
  return {
    ok: true,
    value: {
      cursor: input.cursor ?? '',
      limit: typeof input.limit === 'number' ? input.limit : 100,
    },
  };
}

export function parseReadInput(input: unknown): CatalogResult<ReadInput> {
  if (
    !record(input) ||
    !only(input, ['id']) ||
    typeof input.id !== 'string' ||
    !input.id.trim()
  )
    return invalid('Read input requires an approved system id');
  return { ok: true, value: { id: input.id } };
}

function invalid(message: string): CatalogResult<never> {
  return { ok: false, error: { code: 'invalid_input', message } };
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function only(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).every((key) => keys.includes(key));
}
function copy(entry: CatalogEntry): CatalogEntry {
  return JSON.parse(JSON.stringify(entry)) as CatalogEntry;
}
