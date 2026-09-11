import type {
  CatalogResult,
  CatalogRead,
  CatalogList,
  SystemExplorerPort,
} from '../../contracts.ts';

export function executeSystemExplorerCli(
  port: SystemExplorerPort,
  args: readonly string[],
): CatalogResult<CatalogList | CatalogRead> {
  const [command, value, extra] = args;
  if (command === 'list' && value === undefined) return port.list({});
  if (command === 'read' && typeof value === 'string' && extra === undefined)
    return port.read({ id: value });
  return {
    ok: false,
    error: {
      code: 'invalid_input',
      message: 'Use `systems list` or `systems read <id>`',
    },
  };
}
