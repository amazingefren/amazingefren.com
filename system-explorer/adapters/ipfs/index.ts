import type { CatalogList } from '../../contracts.ts';
export function createIpfsMirrorManifest(catalog: CatalogList) {
  return {
    network: 'ipfs' as const,
    publication: 'not-published' as const,
    catalogRevision: catalog.catalogRevision,
    publicOnly: true,
    localAssets: true,
    paths: ['/exports/systems/index.json', '/exports/systems.zip'],
  };
}
