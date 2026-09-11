import type { Result } from '../../../contracts/writing/index.ts';

export async function boundedJson(
  message: Request | Response,
  limit: number,
): Promise<Result<unknown>> {
  const result = await boundedBytes(message, limit);
  if (!result.ok) return result;
  try {
    return {
      ok: true,
      value: JSON.parse(new TextDecoder().decode(result.value)),
    };
  } catch {
    return {
      ok: false,
      error: { code: 'invalid', message: 'JSON could not be read.' },
    };
  }
}

export async function boundedBytes(
  message: Request | Response,
  limit: number,
): Promise<Result<Uint8Array<ArrayBuffer>>> {
  if (!Number.isSafeInteger(limit) || limit < 1)
    return {
      ok: false,
      error: { code: 'invalid', message: 'A positive byte limit is required.' },
    };
  if (!message.body)
    return {
      ok: false,
      error: { code: 'invalid', message: 'A body is required.' },
    };
  const reader = message.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > limit) {
        await reader.cancel();
        return {
          ok: false,
          error: {
            code: 'invalid',
            message: 'Request exceeds the supported size.',
          },
        };
      }
      chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { ok: true, value: bytes };
  } catch {
    return {
      ok: false,
      error: { code: 'invalid', message: 'The body could not be read.' },
    };
  } finally {
    reader.releaseLock();
  }
}
