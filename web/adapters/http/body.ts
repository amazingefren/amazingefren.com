import type { Result } from '../../../contracts/writing/index.ts';

export async function boundedJson(message: Request | Response, limit: number): Promise<Result<unknown>> {
  if (!message.body) return { ok: false, error: { code: 'invalid', message: 'JSON body is required.' } };
  const reader = message.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > limit) { await reader.cancel(); return { ok: false, error: { code: 'invalid', message: 'Request exceeds the supported size.' } }; }
      chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch { return { ok: false, error: { code: 'invalid', message: 'JSON could not be read.' } }; }
  finally { reader.releaseLock(); }
}

