import { maxWorkCommandBytes } from '../../contracts/work/index.ts';
import type { Result, WorkPort } from '../../contracts/work/index.ts';
import { parseCommand } from '../operations/validation.ts';
const invalid = (): Result => ({
  ok: false,
  error: 'invalid',
  message: 'Invalid work command.',
});
const limit = maxWorkCommandBytes;
async function dispatch(port: WorkPort, value: unknown): Promise<Result> {
  const command = parseCommand(value);
  if (!command) return invalid();
  try {
    return await port.execute(command);
  } catch {
    return {
      ok: false,
      error: 'unavailable',
      message: 'Work is unavailable. Retry.',
    };
  }
}
export function createWorkHttp(port: WorkPort) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST')
      return Response.json(invalid(), {
        status: 405,
        headers: { Allow: 'POST', 'Cache-Control': 'no-store' },
      });
    let result: Result;
    try {
      const reader = request.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader) {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > limit) {
            await reader.cancel();
            throw Error('limit');
          }
          chunks.push(part.value);
        }
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      result = await dispatch(
        port,
        JSON.parse(new TextDecoder().decode(bytes)),
      );
    } catch {
      result = invalid();
    }
    const status = result.ok
      ? 200
      : { invalid: 400, denied: 403, conflict: 409, unavailable: 503 }[
          result.error
        ];
    return Response.json(result, {
      status,
      headers: { 'Cache-Control': 'no-store' },
    });
  };
}
export function createWorkMcp(port: WorkPort) {
  return (input: unknown): Promise<Result> => dispatch(port, input);
}
export function createWorkCli(port: WorkPort) {
  return (input: string): Promise<Result> => {
    if (input.length > limit) return Promise.resolve(invalid());
    try {
      return dispatch(port, JSON.parse(input));
    } catch {
      return Promise.resolve(invalid());
    }
  };
}
