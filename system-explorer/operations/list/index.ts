import type {
  CatalogList,
  CatalogResult,
  SystemExplorerPort,
} from '../../contracts.ts';

export function listSystems(
  port: SystemExplorerPort,
  input: unknown,
): CatalogResult<CatalogList> {
  return port.list(input);
}
