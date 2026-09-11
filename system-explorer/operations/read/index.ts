import type {
  CatalogRead,
  CatalogResult,
  SystemExplorerPort,
} from '../../contracts.ts';

export function readSystem(
  port: SystemExplorerPort,
  input: unknown,
): CatalogResult<CatalogRead> {
  return port.read(input);
}
