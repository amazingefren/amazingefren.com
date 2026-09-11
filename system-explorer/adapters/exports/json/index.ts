import type {
  CatalogList,
  CatalogRead,
  CatalogResult,
  SystemExplorerPort,
} from '../../../contracts.ts';
import { readFullSystemCatalog } from '../../../operations/index.ts';

export function exportSystemCatalog(
  port: SystemExplorerPort,
): CatalogResult<CatalogList> {
  return readFullSystemCatalog(port);
}
export function exportSystem(
  port: SystemExplorerPort,
  id: string,
): CatalogResult<CatalogRead> {
  return port.read({ id });
}
