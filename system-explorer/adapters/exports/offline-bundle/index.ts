import type { CatalogList } from '../../../contracts.ts';

export function createOfflineBundle(catalog: CatalogList): Uint8Array {
  return zip([
    { name: 'systems/index.json', text: JSON.stringify(catalog, null, 2) },
  ]);
}

function zip(files: readonly { name: string; text: string }[]): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const directory: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.text);
    const crc = crc32(data);
    const local = bytes(
      [
        0x04034b50,
        20,
        0,
        0,
        0,
        0,
        crc,
        data.length,
        data.length,
        name.length,
        0,
      ],
      [4, 2, 2, 2, 2, 2, 4, 4, 4, 2, 2],
      name,
      data,
    );
    parts.push(local);
    const central = bytes(
      [
        0x02014b50,
        20,
        20,
        0,
        0,
        0,
        0,
        crc,
        data.length,
        data.length,
        name.length,
        0,
        0,
        0,
        0,
        0,
        offset,
      ],
      [4, 2, 2, 2, 2, 2, 2, 4, 4, 4, 2, 2, 2, 2, 2, 4, 4],
      name,
    );
    directory.push(central);
    offset += local.length;
  }
  const directorySize = directory.reduce((size, part) => size + part.length, 0);
  return concat([
    ...parts,
    ...directory,
    bytes(
      [0x06054b50, 0, 0, files.length, files.length, directorySize, offset, 0],
      [4, 2, 2, 2, 2, 4, 4, 2],
    ),
  ]);
}
function bytes(values: number[], widths: number[], ...tail: Uint8Array[]) {
  const head = new Uint8Array(widths.reduce((sum, width) => sum + width, 0));
  const view = new DataView(head.buffer);
  let offset = 0;
  values.forEach((value, index) => {
    if (widths[index] === 2) view.setUint16(offset, value, true);
    else view.setUint32(offset, value >>> 0, true);
    offset += widths[index];
  });
  return concat([head, ...tail]);
}
function concat(parts: Uint8Array[]) {
  const result = new Uint8Array(
    parts.reduce((size, part) => size + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
