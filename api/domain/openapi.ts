import type { Operation } from '../../manifests/schema/operation.schema.ts';
import type { SystemManifest } from '../../manifests/schema/system.schema.ts';

export type OpenApiDocument = {
  openapi: '3.1.0';
  info: { title: string; version: string; description: string };
  paths: Record<string, Record<string, OpenApiOperation>>;
  'x-ae': { source: 'public-manifests'; access: 'public'; excluded: string };
};

type OpenApiOperation = {
  operationId: string;
  summary: string;
  responses: Record<
    string,
    {
      description: string;
      content?: Record<string, { schema: Record<string, unknown> }>;
    }
  >;
  parameters?: readonly {
    name: string;
    in: 'path' | 'query';
    required: boolean;
    schema: { type: 'string' | 'integer'; minimum?: number; maximum?: number };
  }[];
  requestBody?: {
    required: false;
    content: { 'application/json': { schema: Record<string, unknown> } };
  };
  'x-ae': {
    system: string;
    operation: string;
    binding: string;
    input: string;
    output: string;
    access: 'public';
  };
};
type OpenApiParameter = NonNullable<OpenApiOperation['parameters']>[number];

export function generateOpenApiDocument(
  systems: readonly SystemManifest[],
  version = '0.0.0',
): OpenApiDocument {
  const paths: Record<string, Record<string, OpenApiOperation>> = {};
  const operationIds = new Set<string>();
  const templates = new Map<string, string>();
  for (const system of [...systems].sort((left, right) =>
    left.id.localeCompare(right.id),
  )) {
    if (system.visibility !== 'public') continue;
    for (const operation of [...system.operations].sort((left, right) =>
      left.id.localeCompare(right.id),
    )) {
      if (
        operation.status !== 'implemented' ||
        operation.access.kind !== 'public' ||
        (operation.dataScope !== undefined &&
          operation.dataScope !== 'published')
      )
        continue;
      for (const binding of [...operation.bindings].sort((left, right) =>
        left.id.localeCompare(right.id),
      )) {
        if (binding.status !== 'implemented' || binding.surface.kind !== 'http')
          continue;
        const path = normalizePath(binding.surface.path);
        const template = path.replace(/\{[^}]+\}/g, '{}');
        const existing = templates.get(template);
        if (existing && existing !== path)
          throw new Error(`Duplicate OpenAPI path template: ${path}`);
        templates.set(template, path);
        const method = binding.surface.method.toLowerCase();
        const operationId = stableOperationId(
          system.id,
          operation.id,
          binding.id,
        );
        if (operationIds.has(operationId))
          throw new Error(`Duplicate OpenAPI operation ID: ${operationId}`);
        if (paths[path]?.[method])
          throw new Error(
            `Duplicate OpenAPI route: ${binding.surface.method} ${path}`,
          );
        operationIds.add(operationId);
        const item = createOperation(
          system,
          operation,
          binding.id,
          operationId,
          path,
          method,
        );
        paths[path] = { ...(paths[path] ?? {}), [method]: item };
      }
    }
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'AE Public API',
      version,
      description: 'Public HTTP operations derived from approved AE manifests.',
    },
    paths,
    'x-ae': {
      source: 'public-manifests',
      access: 'public',
      excluded:
        'private systems, protected operations, and undeclared bindings',
    },
  };
}

function stableOperationId(
  systemId: string,
  operationId: string,
  bindingId: string,
): string {
  return [systemId, operationId, bindingId]
    .join('.')
    .replace(/[^A-Za-z0-9_.-]/g, '_');
}

function createOperation(
  system: SystemManifest,
  operation: Operation,
  bindingId: string,
  operationId: string,
  path: string,
  method: string,
): OpenApiOperation {
  const parameters: OpenApiParameter[] = [...path.matchAll(/\{([^}]+)\}/g)].map(
    (match) => ({
      name: match[1]!,
      in: 'path' as const,
      required: true,
      schema: { type: 'string' as const },
    }),
  );
  if (operation.input.endsWith('list-input.schema.json')) {
    parameters.push({
      name: 'cursor',
      in: 'query',
      required: false,
      schema: { type: 'string' },
    });
    parameters.push({
      name: 'limit',
      in: 'query',
      required: false,
      schema: { type: 'integer', minimum: 1, maximum: 100 },
    });
  }
  const item: OpenApiOperation = {
    operationId,
    summary: `${operation.id} (${system.name})`,
    responses: { '200': response(operation.output) },
    'x-ae': {
      system: system.id,
      operation: operation.id,
      binding: bindingId,
      input: publicContract(operation.input),
      output: publicContract(operation.output),
      access: 'public',
    },
  };
  if (parameters.length) item.parameters = parameters;
  if (
    ['post', 'put', 'patch'].includes(method) &&
    operation.input &&
    !operation.input.endsWith('.json')
  )
    item.requestBody = {
      required: false,
      content: {
        'application/json': { schema: genericSchema(operation.input) },
      },
    };
  return item;
}

function genericSchema(contract: string): Record<string, unknown> {
  return { 'x-ae-contract': publicContract(contract) };
}

function response(contract: string): OpenApiOperation['responses']['200'] {
  return contract.endsWith('.json')
    ? {
        description: 'Successful public response',
        content: { 'application/json': { schema: genericSchema(contract) } },
      }
    : { description: 'Successful public response' };
}

function publicContract(contract: string): string {
  return contract.includes('ae-workbench') || contract.includes('ae-')
    ? 'private-contract'
    : contract;
}

function normalizePath(path: string): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}
