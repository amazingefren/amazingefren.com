type MarkdownFile = Pick<File, 'name' | 'type' | 'size' | 'arrayBuffer'>;
export type MarkdownImport =
  { ok: true; body: string } | { ok: false; message: string };
export async function readMarkdownImport(
  file: MarkdownFile,
): Promise<MarkdownImport> {
  if (
    file.size <= 0 ||
    file.size > 524_288 ||
    (!/\.(md|markdown)$/i.test(file.name) &&
      !['text/markdown', 'text/plain'].includes(file.type))
  )
    return { ok: false, message: 'Choose a Markdown file up to 512 KB.' };
  try {
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > 524_288)
      return { ok: false, message: 'Markdown file exceeds 512 KB.' };
    const body = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (!body.trim()) return { ok: false, message: 'Markdown file is empty.' };
    if (body.length > 200_000 || body.includes('\0'))
      return {
        ok: false,
        message: 'Markdown must contain valid text up to 200,000 characters.',
      };
    return { ok: true, body };
  } catch {
    return {
      ok: false,
      message: 'Markdown file could not be read as UTF-8 text.',
    };
  }
}
