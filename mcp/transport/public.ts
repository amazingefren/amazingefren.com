import publishingManifest from '../../publishing/publishing.manifest.ts';
import { readPortablePublicationResource } from '../../publishing/adapters/mcp/portable-publications.ts';
import type { PortablePublicationDependencies } from '../../publishing/adapters/cli/portable-publications.ts';
import explorerManifest from '../../system-explorer/system-explorer.manifest.ts';
import { createSystemExplorerMcp } from '../../system-explorer/adapters/mcp/index.ts';
import type { SystemExplorerPort } from '../../system-explorer/contracts.ts';
import type { DeliveryBinding } from '../../manifests/schema/binding.schema.ts';

const LEGACY_PROTOCOL = '2025-11-25';
const MAX_BODY_BYTES = 65_536;
const operations = explorerManifest.operations;
const listTool = tool('system-explorer.list');
const readTool = tool('system-explorer.read');
const resource = resourceBinding('system-explorer.read');

type Id = string | number;
type Rpc = { jsonrpc: '2.0'; id?: Id; method?: string; params?: unknown };
type HandlerOptions = {
  allowedOrigins: readonly string[];
  maxBodyBytes?: number;
  publications?: PortablePublicationDependencies;
};
type McpToolBinding = DeliveryBinding & {
  surface: {
    kind: 'mcp-tool';
    name: string;
    description: string;
    readOnly: boolean;
  };
};
type McpResourceBinding = DeliveryBinding & {
  surface: { kind: 'mcp-resource'; uriTemplate: string; mimeType: string };
};

export function createPublicMcpHttpHandler(
  explorer: SystemExplorerPort,
  options: HandlerOptions,
): (request: Request) => Promise<Response> {
  const mcp = createSystemExplorerMcp(explorer);
  const maxBodyBytes = options.maxBodyBytes ?? MAX_BODY_BYTES;
  return async (request) => {
    if (!originAllowed(request.headers.get('origin'), options.allowedOrigins))
      return new Response('Forbidden', { status: 403 });
    if (request.method === 'GET')
      return new Response(null, { status: 405, headers: { allow: 'POST' } });
    if (request.method !== 'POST')
      return new Response(null, { status: 405, headers: { allow: 'POST' } });
    if (!acceptsJson(request.headers.get('accept')))
      return new Response('Accept application/json', { status: 406 });
    if (!isJson(request.headers.get('content-type')))
      return new Response('Content-Type must be application/json', {
        status: 415,
      });
    const version = request.headers.get('mcp-protocol-version');
    if (version && version !== LEGACY_PROTOCOL)
      return new Response('Unsupported MCP protocol version', { status: 400 });
    const declaredLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes)
      return new Response('Request body too large', { status: 413 });
    let body: string;
    try {
      body = new TextDecoder().decode(
        await boundedBytes(request, maxBodyBytes),
      );
    } catch (error) {
      if (error instanceof RangeError)
        return new Response('Request body too large', { status: 413 });
      return rpcError(null, -32700, 'Parse error');
    }
    let message: unknown;
    try {
      message = JSON.parse(body);
    } catch {
      return rpcError(null, -32700, 'Parse error');
    }
    if (!isRpc(message)) return rpcError(null, -32600, 'Invalid Request');
    if (!('id' in message)) return new Response(null, { status: 202 });
    try {
      return await dispatch(message, mcp, options.publications);
    } catch {
      return rpcError(id(message), -32603, 'Internal error');
    }
  };
}

async function dispatch(
  message: Rpc,
  mcp: ReturnType<typeof createSystemExplorerMcp>,
  publications?: PortablePublicationDependencies,
): Promise<Response> {
  const requestId = id(message);
  if (message.method === 'initialize') {
    if (
      !record(message.params) ||
      message.params.protocolVersion !== LEGACY_PROTOCOL
    )
      return rpcError(
        requestId,
        -32602,
        'Unsupported initialize protocol version',
      );
    return rpcResult(requestId, {
      protocolVersion: LEGACY_PROTOCOL,
      capabilities: { tools: {}, resources: {} },
      serverInfo: { name: 'AE MCP', version: '1' },
    });
  }
  if (message.method === 'ping') return rpcResult(requestId, {});
  if (message.method === 'tools/list')
    return rpcResult(requestId, {
      tools: [
        toolDescription(listTool, 'list'),
        toolDescription(readTool, 'read'),
      ],
    });
  if (message.method === 'tools/call')
    return toolCall(requestId, message.params, mcp);
  if (message.method === 'resources/list')
    return rpcResult(requestId, {
      resources: publications
        ? publicationResourceBindings.map((binding) => ({
            uri: binding.surface.uriTemplate,
            name: binding.surface.uriTemplate,
            mimeType: binding.surface.mimeType,
          }))
        : [],
    });
  if (message.method === 'resources/templates/list')
    return rpcResult(requestId, {
      resourceTemplates: [
        {
          uriTemplate: resource.surface.uriTemplate,
          name: resource.surface.uriTemplate,
          description: 'Read an approved public system.',
          mimeType: resource.surface.mimeType,
        },
      ],
    });
  if (message.method === 'resources/read') {
    const params = message.params;
    if (
      publications &&
      record(params) &&
      typeof params.uri === 'string' &&
      only(params, ['uri']) &&
      publicationResourceBindings.some(
        (binding) => binding.surface.uriTemplate === params.uri,
      )
    ) {
      const result = await readPortablePublicationResource(
        publications,
        params.uri,
      );
      if (!result.ok) return rpcError(requestId, -32002, result.error.message);
      const artifact = result.value;
      if (
        typeof artifact.body !== 'string' &&
        artifact.body.byteLength > 4 * 1024 * 1024
      )
        return rpcError(
          requestId,
          -32002,
          'Use the HTTP download for bundles larger than 4 MiB.',
        );
      return rpcResult(requestId, {
        contents: [
          {
            uri: params.uri,
            mimeType: artifact.contentType.split(';')[0],
            ...(typeof artifact.body === 'string'
              ? { text: artifact.body }
              : { blob: encodeBase64(artifact.body) }),
          },
        ],
      });
    }
    return resourceRead(requestId, params, mcp);
  }
  return rpcError(requestId, -32601, 'Method not found');
}

function toolCall(
  requestId: Id | null,
  params: unknown,
  mcp: ReturnType<typeof createSystemExplorerMcp>,
): Response {
  if (
    !record(params) ||
    typeof params.name !== 'string' ||
    !only(params, ['name', 'arguments'])
  )
    return rpcError(requestId, -32602, 'Invalid tool call');
  const result =
    params.name === listTool.surface.name
      ? mcp.list_systems(params.arguments ?? {})
      : params.name === readTool.surface.name
        ? mcp.read_systems(params.arguments)
        : null;
  if (!result) return rpcError(requestId, -32602, 'Unknown tool');
  const value = result.ok ? result.value : result.error;
  return rpcResult(requestId, {
    content: [{ type: 'text', text: JSON.stringify(value) }],
    structuredContent: value,
    isError: !result.ok,
  });
}

function resourceRead(
  requestId: Id | null,
  params: unknown,
  mcp: ReturnType<typeof createSystemExplorerMcp>,
): Response {
  if (
    !record(params) ||
    typeof params.uri !== 'string' ||
    !only(params, ['uri'])
  )
    return rpcError(requestId, -32602, 'Invalid resource request');
  const result = mcp.readResource(params.uri);
  if (!result.ok) return rpcError(requestId, -32002, result.error.message);
  return rpcResult(requestId, {
    contents: [
      {
        uri: params.uri,
        mimeType: resource.surface.mimeType,
        text: JSON.stringify(result.value),
      },
    ],
  });
}

function toolDescription(binding: McpToolBinding, operation: 'list' | 'read') {
  return {
    name: binding.surface.name,
    description: binding.surface.description,
    inputSchema:
      operation === 'list'
        ? {
            type: 'object',
            additionalProperties: false,
            properties: {
              cursor: { type: 'string' },
              limit: { type: 'integer', minimum: 1, maximum: 100 },
            },
          }
        : {
            type: 'object',
            additionalProperties: false,
            properties: { id: { type: 'string', minLength: 1 } },
            required: ['id'],
          },
    annotations: { readOnlyHint: binding.surface.readOnly },
  };
}
function tool(id: string): McpToolBinding {
  const binding = operations
    .find((operation) => operation.id === id)
    ?.bindings.find((binding) => binding.surface.kind === 'mcp-tool');
  if (!binding || binding.surface.kind !== 'mcp-tool')
    throw new Error(`Catalog tool binding is undeclared: ${id}`);
  return binding as McpToolBinding;
}
function resourceBinding(id: string): McpResourceBinding {
  const binding = operations
    .find((operation) => operation.id === id)
    ?.bindings.find((binding) => binding.surface.kind === 'mcp-resource');
  if (!binding || binding.surface.kind !== 'mcp-resource')
    throw new Error(`Catalog resource binding is undeclared: ${id}`);
  return binding as McpResourceBinding;
}
function originAllowed(origin: string | null, allowed: readonly string[]) {
  return origin === null || allowed.includes(origin);
}
function acceptsJson(value: string | null) {
  return (
    value !== null &&
    value
      .split(',')
      .some((type) => type.trim().split(';')[0] === 'application/json')
  );
}
function isJson(value: string | null) {
  return value?.split(';')[0].trim() === 'application/json';
}
async function boundedBytes(
  request: Request,
  maximum: number,
): Promise<Uint8Array> {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > maximum) {
        await reader.cancel();
        throw new RangeError('body too large');
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
function isRpc(value: unknown): value is Rpc {
  return (
    record(value) &&
    value.jsonrpc === '2.0' &&
    typeof value.method === 'string' &&
    (!('id' in value) ||
      typeof value.id === 'string' ||
      typeof value.id === 'number')
  );
}
function id(value: Rpc): Id | null {
  return typeof value.id === 'string' || typeof value.id === 'number'
    ? value.id
    : null;
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function only(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).every((key) => keys.includes(key));
}
function rpcResult(id: Id | null, result: unknown) {
  return json({ jsonrpc: '2.0', id, result });
}
function rpcError(id: Id | null, code: number, message: string) {
  return json({ jsonrpc: '2.0', id, error: { code, message } });
}
function json(value: unknown) {
  return new Response(JSON.stringify(value), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

const publicationResourceBindings = publishingManifest.operations
  .filter((operation) => operation.access.kind === 'public')
  .flatMap((operation) => operation.bindings)
  .filter(
    (binding): binding is McpResourceBinding =>
      binding.surface.kind === 'mcp-resource' &&
      [
        'ae://publications/offline-bundle',
        'ae://publications/subscriptions.opml',
      ].includes(binding.surface.uriTemplate),
  );

function encodeBase64(bytes: Uint8Array) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}
