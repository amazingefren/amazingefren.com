import type {
  Asset,
  Result,
  Snapshot,
} from '../../../contracts/writing/index.ts';

export type ActivePublicationPort = {
  list(): Promise<Result<Snapshot[]>>;
};

export type PublicationAssetPort = {
  read(
    releaseId: string,
    assetId: string,
  ): Promise<Result<{ body: Uint8Array; mime: Asset['mime'] }>>;
};

export type OfflineBundle = {
  body: Uint8Array;
  contentType: 'application/zip';
  filename: string;
  revision: readonly {
    id: string;
    projectVersion: number;
    publishedAt: string;
  }[];
};

type Entry = { name: string; body: Uint8Array; date: Date };
export const maximumOfflineBundleAssetBytes = 4 * 1024 * 1024;
export const maximumOfflineBundleBytes = 16 * 1024 * 1024;

export function createOfflineBundle(
  publications: ActivePublicationPort,
  assets: PublicationAssetPort,
) {
  return {
    async build(): Promise<Result<OfflineBundle>> {
      try {
        const active = await publications.list();
        if (!active.ok) return active;
        const entries = await bundleEntries(active.value, assets);
        if (!entries.ok) return entries;
        const current = await publications.list();
        if (!current.ok) return current;
        if (!sameReleases(active.value, current.value)) return changedRelease();
        if (zipSize(entries.value) > maximumOfflineBundleBytes)
          return unavailableBundle();
        return {
          ok: true,
          value: {
            body: zip(entries.value),
            contentType: 'application/zip',
            filename: 'ae-publications.zip',
            revision: active.value.map((snapshot) => ({
              id: snapshot.id,
              projectVersion: snapshot.projectVersion,
              publishedAt: snapshot.publishedAt,
            })),
          },
        };
      } catch {
        return unavailableBundle('Publication bundle unavailable.');
      }
    },
  };
}

async function bundleEntries(
  snapshots: Snapshot[],
  assets: PublicationAssetPort,
): Promise<Result<Entry[]>> {
  const entries: Entry[] = [];
  const releaseIds = new Set<string>();
  const slugs = new Set<string>();
  for (const snapshot of snapshots) {
    if (
      !safeId(snapshot.id) ||
      !safeSlug(snapshot.slug) ||
      releaseIds.has(snapshot.id) ||
      slugs.has(snapshot.slug)
    )
      return invalidRelease();
    releaseIds.add(snapshot.id);
    slugs.add(snapshot.slug);
    const date = new Date(snapshot.publishedAt);
    if (Number.isNaN(date.valueOf())) return invalidRelease();
    const paths = assetPaths(snapshot);
    if (!paths.ok) return paths;
    if (
      (snapshot.coverAssetId !== null &&
        !paths.value.has(snapshot.coverAssetId)) ||
      !allAssetReferencesResolve(snapshot, paths.value)
    )
      return unavailableAsset();
    for (const asset of snapshot.assets) {
      const output = await assets.read(snapshot.id, asset.id);
      if (!output.ok) return output;
      if (
        output.value.mime !== asset.mime ||
        output.value.body.byteLength > maximumOfflineBundleAssetBytes
      )
        return unavailableAsset();
      entries.push({
        name: paths.value.get(asset.id)!,
        body: output.value.body,
        date,
      });
      if (zipSize(entries) > maximumOfflineBundleBytes)
        return unavailableBundle();
    }
    entries.push({
      name: `publications/${snapshot.slug}/publication.md`,
      body: encode(markdown(snapshot, paths.value)),
      date,
    });
    if (zipSize(entries) > maximumOfflineBundleBytes)
      return unavailableBundle();
    entries.push({
      name: `publications/${snapshot.slug}/index.html`,
      body: encode(publicationHtml(snapshot, paths.value)),
      date,
    });
  }
  const metadata = JSON.stringify({
    format: 'ae-publication-bundle/v1',
    publications: snapshots.map((snapshot) => ({
      id: snapshot.id,
      slug: snapshot.slug,
      kind: snapshot.kind,
      title: snapshot.title,
      projectVersion: snapshot.projectVersion,
      publishedAt: snapshot.publishedAt,
      canonicalUrl: `https://amazingefren.com/readings/${snapshot.slug}`,
      assets: snapshot.assets.map((asset) => ({
        id: asset.id,
        path: pathsFor(snapshot).get(asset.id),
        mime: asset.mime,
        alt: asset.alt,
        caption: asset.caption,
        rights: asset.rights,
      })),
    })),
  });
  entries.push({
    name: 'metadata.json',
    body: encode(metadata),
    date: newestDate(snapshots),
  });
  entries.push({
    name: 'index.html',
    body: encode(indexHtml(snapshots)),
    date: newestDate(snapshots),
  });
  if (zipSize(entries) > maximumOfflineBundleBytes) return unavailableBundle();
  return { ok: true, value: entries };
}

function assetPaths(snapshot: Snapshot): Result<Map<string, string>> {
  const paths = new Map<string, string>();
  for (const asset of snapshot.assets) {
    if (!safeId(asset.id)) return invalidRelease();
    const extension = extensions[asset.mime];
    if (!extension || paths.has(asset.id)) return invalidRelease();
    paths.set(asset.id, `assets/${snapshot.id}/${asset.id}.${extension}`);
  }
  return { ok: true, value: paths };
}

function pathsFor(snapshot: Snapshot) {
  const paths = new Map<string, string>();
  for (const asset of snapshot.assets)
    paths.set(
      asset.id,
      `assets/${snapshot.id}/${asset.id}.${extensions[asset.mime]}`,
    );
  return paths;
}

function allAssetReferencesResolve(
  snapshot: Snapshot,
  paths: Map<string, string>,
) {
  return snapshot.chapters.every((chapter) =>
    [...chapter.body.matchAll(/asset:([a-zA-Z0-9_-]+)/g)].every((match) =>
      paths.has(match[1]!),
    ),
  );
}

function markdown(snapshot: Snapshot, paths: Map<string, string>) {
  return `# ${snapshot.title}\n\n${snapshot.chapters
    .map(
      (chapter) =>
        `${snapshot.kind === 'book' ? `## ${chapter.title}\n\n` : ''}${replaceAssets(chapter.body, paths, '../../')}`,
    )
    .join('\n\n')}`;
}

function publicationHtml(snapshot: Snapshot, paths: Map<string, string>) {
  const cover = snapshot.coverAssetId
    ? paths.get(snapshot.coverAssetId)
    : undefined;
  const chapters = snapshot.chapters
    .map(
      (chapter) =>
        `<section><h2>${escape(chapter.title)}</h2><pre>${escape(replaceAssets(chapter.body, paths, '../../'))}</pre></section>`,
    )
    .join('');
  const images = snapshot.assets
    .map(
      (asset) =>
        `<figure><img src="../../${paths.get(asset.id)}" alt="${escapeAttribute(asset.alt)}"><figcaption>${escape(asset.caption)}</figcaption></figure>`,
    )
    .join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(snapshot.title)}</title><body><main><p><a href="../../index.html">All publications</a></p><article><h1>${escape(snapshot.title)}</h1><p>${escape(snapshot.summary)}</p><p>Published ${escape(snapshot.publishedAt)}</p>${cover ? `<img src="../../${cover}" alt="${escapeAttribute(snapshot.assets.find((asset) => asset.id === snapshot.coverAssetId)?.alt ?? '')}">` : ''}${chapters}${images}<p><a href="publication.md">Download Markdown</a></p></article></main></body></html>`;
}

function indexHtml(snapshots: Snapshot[]) {
  const publications = snapshots
    .map(
      (snapshot) =>
        `<li><a href="publications/${snapshot.slug}/index.html">${escape(snapshot.title)}</a><p>${escape(snapshot.summary)}</p></li>`,
    )
    .join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>AE publications</title><body><main><h1>AE publications</h1><ul>${publications}</ul></main></body></html>`;
}

function replaceAssets(
  value: string,
  paths: Map<string, string>,
  prefix: string,
) {
  return value.replace(/asset:([a-zA-Z0-9_-]+)/g, (_, id: string) => {
    const path = paths.get(id);
    return path ? `${prefix}${path}` : '';
  });
}

function zip(entries: Entry[]) {
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = encode(entry.name);
    const checksum = crc32(entry.body);
    const { date, time } = dosTime(entry.date);
    const header = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(time),
      u16(date),
      u32(checksum),
      u32(entry.body.byteLength),
      u32(entry.body.byteLength),
      u16(name.byteLength),
      u16(0),
      name,
      entry.body,
    ]);
    local.push(header);
    central.push(
      concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(time),
        u16(date),
        u32(checksum),
        u32(entry.body.byteLength),
        u32(entry.body.byteLength),
        u16(name.byteLength),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name,
      ]),
    );
    offset += header.byteLength;
  }
  const directory = concat(central);
  return concat([
    ...local,
    directory,
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(directory.byteLength),
    u32(offset),
    u16(0),
  ]);
}

function zipSize(entries: Entry[]) {
  if (entries.length > 65535) return Infinity;
  return entries.reduce((size, entry) => {
    const nameSize = encode(entry.name).byteLength;
    return nameSize > 65535
      ? Infinity
      : size + entry.body.byteLength + nameSize * 2 + 76;
  }, 22);
}

function sameReleases(before: Snapshot[], after: Snapshot[]) {
  return (
    before.length === after.length &&
    before.every((snapshot, index) => {
      const current = after[index];
      return (
        current !== undefined &&
        snapshot.id === current.id &&
        snapshot.projectVersion === current.projectVersion &&
        snapshot.publishedAt === current.publishedAt
      );
    })
  );
}

const extensions: Record<Asset['mime'], string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const encode = (value: string) => new TextEncoder().encode(value);
const safeId = (value: string) => /^[a-zA-Z0-9_-]{1,120}$/.test(value);
const safeSlug = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const invalidRelease = (): Result<never> => ({
  ok: false,
  error: {
    code: 'unavailable',
    message: 'Invalid active publication release.',
  },
});
const unavailableAsset = (): Result<never> => ({
  ok: false,
  error: {
    code: 'unavailable',
    message: 'Approved publication asset unavailable.',
  },
});
const unavailableBundle = (
  message = 'Publication bundle exceeds its size limit.',
): Result<never> => ({
  ok: false,
  error: { code: 'unavailable', message },
});
const changedRelease = (): Result<never> => ({
  ok: false,
  error: {
    code: 'unavailable',
    message: 'Active publications changed during export.',
  },
});
const newestDate = (snapshots: Snapshot[]) =>
  new Date(
    snapshots
      .map((snapshot) => snapshot.publishedAt)
      .sort()
      .at(-1) ?? '1980-01-01T00:00:00.000Z',
  );
const escape = (value: string) =>
  value.replace(
    /[<>&]/g,
    (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[character]!,
  );
const escapeAttribute = (value: string) =>
  escape(value).replace(/"/g, '&quot;');
const u16 = (value: number) =>
  new Uint8Array([value & 255, (value >>> 8) & 255]);
const u32 = (value: number) =>
  new Uint8Array([
    value & 255,
    (value >>> 8) & 255,
    (value >>> 16) & 255,
    (value >>> 24) & 255,
  ]);
const concat = (items: Uint8Array[]) => {
  const result = new Uint8Array(
    items.reduce((size, item) => size + item.byteLength, 0),
  );
  let offset = 0;
  for (const item of items) {
    result.set(item, offset);
    offset += item.byteLength;
  }
  return result;
};
function dosTime(value: Date) {
  const year = Math.max(1980, Math.min(2107, value.getUTCFullYear()));
  return {
    date:
      ((year - 1980) << 9) |
      ((value.getUTCMonth() + 1) << 5) |
      value.getUTCDate(),
    time:
      (value.getUTCHours() << 11) |
      (value.getUTCMinutes() << 5) |
      Math.floor(value.getUTCSeconds() / 2),
  };
}
function crc32(value: Uint8Array) {
  let checksum = 0xffffffff;
  for (const byte of value) {
    checksum ^= byte;
    for (let index = 0; index < 8; index += 1)
      checksum = checksum & 1 ? (checksum >>> 1) ^ 0xedb88320 : checksum >>> 1;
  }
  return (checksum ^ 0xffffffff) >>> 0;
}
