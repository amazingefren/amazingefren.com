import { systems } from '../../../manifests/registry.ts';
import type { CatalogEntry } from '../../contracts.ts';

export type CatalogSource = {
  entries: readonly CatalogEntry[];
  sourceRevision?: string;
};

export function createPublicCatalogSource(
  sourceRevision?: string,
): CatalogSource {
  return {
    entries: systems
      .filter((system) => system.visibility === 'public')
      .map((system) => project(system)),
    sourceRevision,
  };
}

function project(system: (typeof systems)[number]): CatalogEntry {
  const entry = {
    id: system.id,
    name: system.name,
    purpose: system.purpose,
    status: system.status,
    implementationVisibility: system.visibility,
    capabilities: [...system.capabilities],
    dependencies: [...system.dependencies],
    contracts: [...system.contracts],
    operations: system.operations
      .filter((operation) => operation.access.kind === 'public')
      .map((operation) => ({
        id: operation.id,
        access: 'public' as const,
        status: operation.status,
        bindings: operation.bindings.map((binding) => ({
          kind: binding.surface.kind,
          target: bindingTarget(binding.surface),
          status: binding.status,
        })),
        verification: operation.verification.map((verification) => ({
          id: verification.id,
          category: verification.category,
          expectation: verification.expectation,
          status: verification.tests.length
            ? ('not-run' as const)
            : ('declared' as const),
          testReferenceCount: verification.tests.length,
        })),
      })),
  };
  return { ...entry, sourceRevision: revision(entry) };
}

function bindingTarget(
  surface: (typeof systems)[number]['operations'][number]['bindings'][number]['surface'],
) {
  if (surface.kind === 'http') return `${surface.method} ${surface.path}`;
  if (surface.kind === 'mcp-tool') return surface.name;
  if (surface.kind === 'mcp-resource') return surface.uriTemplate;
  if (surface.kind === 'cli') return surface.command;
  if (surface.kind === 'mirror') return surface.network;
  return surface.path;
}

export function revision(value: unknown): string {
  const bytes = new TextEncoder().encode(stableJson(value));
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return `catalog-fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(',')}}`;
}
