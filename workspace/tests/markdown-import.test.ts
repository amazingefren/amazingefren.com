import assert from 'node:assert/strict';
import test from 'node:test';
import { readMarkdownImport } from '../ui/writing/markdown-import.ts';

test('Markdown import preserves Unicode and markup without evaluating it', async () => {
  const body = '# Café\n\n<script>fixture</script>\n';
  assert.deepEqual(await readMarkdownImport(new File([body], 'report.MD')), {
    ok: true,
    body,
  });
});
test('Markdown import rejects unreadable, empty, binary, and oversized content', async () => {
  for (const file of [
    new File([''], 'empty.md'),
    new File(['\n '], 'blank.md'),
    new File(['x'], 'file.exe'),
    new File([new Uint8Array([255])], 'bad.md'),
    new File(['a'.repeat(200001)], 'long.md'),
    new File(['\0'], 'binary.md'),
    new File(['a'.repeat(524289)], 'large.md'),
  ])
    assert.equal((await readMarkdownImport(file)).ok, false);
  assert.equal(
    (
      await readMarkdownImport({
        name: 'broken.md',
        type: 'text/markdown',
        size: 20,
        arrayBuffer: async () => {
          throw new Error('fixture');
        },
      })
    ).ok,
    false,
  );
});
