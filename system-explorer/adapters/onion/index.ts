import type { CatalogList } from '../../contracts.ts';
export function createOnionMirrorManifest(catalog: CatalogList) {
  return {
    network: 'onion' as const,
    publication: 'not-published' as const,
    catalogRevision: catalog.catalogRevision,
    publicOnly: true,
    localAssets: true,
    paths: ['/exports/systems/index.json', '/exports/systems.zip'],
  };
}
