import {
  maxEvaluationCommandBytes,
  parseEvaluationCommand,
  type EvaluationPort,
  type EvaluationResult,
} from '../contracts/index.ts';

const invalid = (): EvaluationResult => ({
  ok: false,
  error: { code: 'invalid', message: 'Evaluation command is invalid.' },
});

async function dispatch(
  port: EvaluationPort,
  value: unknown,
): Promise<EvaluationResult> {
  const command = parseEvaluationCommand(value);
  if (!command) return invalid();
  try {
    return await port.execute(command);
  } catch {
    return {
      ok: false,
      error: { code: 'unavailable', message: 'Evaluation is unavailable.' },
    };
  }
}

export function createEvaluationMcp(port: EvaluationPort) {
  return (input: unknown): Promise<EvaluationResult> => dispatch(port, input);
}

export function createEvaluationCli(port: EvaluationPort) {
  return (input: string): Promise<EvaluationResult> => {
    if (new TextEncoder().encode(input).byteLength > maxEvaluationCommandBytes)
      return Promise.resolve(invalid());
    try {
      return dispatch(port, JSON.parse(input));
    } catch {
      return Promise.resolve(invalid());
    }
  };
}
