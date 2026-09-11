import type { Result } from '../../../contracts/writing/index.ts';
import { executePortablePublicationCli } from '../cli/portable-publications.ts';
import type {
  PortablePublicationDependencies,
  PortablePublicationOutput,
} from '../cli/portable-publications.ts';

export async function readPortablePublicationResource(
  dependencies: PortablePublicationDependencies,
  uri: string,
): Promise<Result<PortablePublicationOutput>> {
  if (uri === 'ae://publications/offline-bundle')
    return executePortablePublicationCli(dependencies, ['download']);
  if (uri === 'ae://publications/subscriptions.opml')
    return executePortablePublicationCli(dependencies, ['subscriptions']);
  return {
    ok: false,
    error: {
      code: 'missing',
      message: 'Publication resource is not declared.',
    },
  };
}
