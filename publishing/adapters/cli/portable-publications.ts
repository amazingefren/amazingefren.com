import type { Result } from '../../../contracts/writing/index.ts';
import {
  createOfflineBundle,
  type ActivePublicationPort,
  type PublicationAssetPort,
} from '../../domain/offline-bundle/index.ts';
import { createSubscriptionOpml } from '../../domain/subscriptions/index.ts';

export type PortablePublicationDependencies = {
  publications: ActivePublicationPort;
  assets: PublicationAssetPort;
  origin: string;
};

export type PortablePublicationOutput = {
  body: Uint8Array | string;
  contentType: 'application/zip' | 'text/x-opml; charset=utf-8';
  filename: string;
};

export async function executePortablePublicationCli(
  dependencies: PortablePublicationDependencies,
  args: readonly string[],
): Promise<Result<PortablePublicationOutput>> {
  const [command, extra] = args;
  if (extra !== undefined) return invalidCommand();
  if (command === 'download') {
    const result = await createOfflineBundle(
      dependencies.publications,
      dependencies.assets,
    ).build();
    return result;
  }
  if (command === 'subscriptions')
    return createSubscriptionOpml(dependencies.origin);
  return invalidCommand();
}

const invalidCommand = (): Result<never> => ({
  ok: false,
  error: {
    code: 'invalid',
    message: 'Use `publications download` or `publications subscriptions`.',
  },
});
