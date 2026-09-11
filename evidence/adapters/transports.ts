import manifest from '../evidence.manifest.ts';
import {
  maxEvidenceCommandBytes,
  parseEvidenceCommand,
  type EvidencePort,
  type EvidenceResult,
} from '../contracts/index.ts';

const declaredOperations = (kind: 'cli' | 'mcp-tool') =>
  new Set(
    manifest.operations.flatMap((operation) =>
      operation.bindings
        .filter((binding) => binding.surface.kind === kind)
        .map(() => operation.id),
    ),
  );

export const evidenceCliOperations = declaredOperations('cli');
export const evidenceMcpOperations = declaredOperations('mcp-tool');

const invalid = (): EvidenceResult => ({
  ok: false,
  error: { code: 'invalid', message: 'Evidence command is invalid.' },
});

async function dispatch(
  port: EvidencePort,
  value: unknown,
  allowed: ReadonlySet<string>,
): Promise<EvidenceResult> {
  const command = parseEvidenceCommand(value);
  if (!command || !allowed.has(command.operation)) return invalid();
  try {
    return await port.execute(command);
  } catch {
    return {
      ok: false,
      error: { code: 'unavailable', message: 'Evidence is unavailable.' },
    };
  }
}

export function createEvidenceMcp(port: EvidencePort) {
  return (input: unknown): Promise<EvidenceResult> =>
    dispatch(port, input, evidenceMcpOperations);
}

export function createEvidenceCli(port: EvidencePort) {
  return (input: string): Promise<EvidenceResult> => {
    if (new TextEncoder().encode(input).byteLength > maxEvidenceCommandBytes)
      return Promise.resolve(invalid());
    try {
      return dispatch(port, JSON.parse(input), evidenceCliOperations);
    } catch {
      return Promise.resolve(invalid());
    }
  };
}
