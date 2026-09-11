import type {
  CatalogResult,
  CatalogRead,
  CatalogList,
  SystemExplorerPort,
} from '../../contracts.ts';

export function createSystemExplorerMcp(port: SystemExplorerPort) {
  return {
    list_systems(input: unknown = {}): CatalogResult<CatalogList> {
      return port.list(input);
    },
    read_systems(input: unknown): CatalogResult<CatalogRead> {
      return port.read(input);
    },
    readResource(uri: string): CatalogResult<CatalogRead> {
      const prefix = 'ae://systems/';
      if (!uri.startsWith(prefix))
        return {
          ok: false,
          error: { code: 'not_found', message: 'Resource is not declared' },
        };
      try {
        return port.read({ id: decodeURIComponent(uri.slice(prefix.length)) });
      } catch {
        return {
          ok: false,
          error: {
            code: 'invalid_input',
            message: 'Resource identifier is invalid',
          },
        };
      }
    },
  };
}
