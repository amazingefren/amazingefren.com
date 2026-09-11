import type { Asset } from '../../contracts/writing/index.ts';
import {
  maximumOfflineBundleAssetBytes,
  type PublicationAssetPort,
} from '../../publishing/domain/offline-bundle/index.ts';
import { boundedBytes } from '../adapters/http/body.ts';
import type { WritingGateway } from './writing.ts';

const imageTypes: readonly Asset['mime'][] = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
];

export function createPublicationAssetPort(
  gateway: Pick<WritingGateway, 'publicAsset'>,
): PublicationAssetPort {
  return {
    async read(releaseId, assetId) {
      if (
        ![releaseId, assetId].every((id) => /^[a-zA-Z0-9_-]{1,120}$/.test(id))
      )
        return {
          ok: false,
          error: { code: 'invalid', message: 'Invalid publication asset.' },
        };
      try {
        const response = await gateway.publicAsset(
          new Request(
            `https://amazingefren.com/api/publications/assets/${releaseId}/${assetId}`,
          ),
        );
        const mime = response.headers.get('content-type')?.split(';')[0];
        if (!response.ok || !imageTypes.some((type) => type === mime)) {
          await response.body?.cancel();
          return unavailable();
        }
        const body = await boundedBytes(
          response,
          maximumOfflineBundleAssetBytes,
        );
        if (!body.ok) return unavailable();
        return {
          ok: true,
          value: { body: body.value, mime: mime as Asset['mime'] },
        };
      } catch {
        return unavailable();
      }
    },
  };
}

function unavailable() {
  return {
    ok: false as const,
    error: {
      code: 'unavailable' as const,
      message: 'Publication asset is unavailable.',
    },
  };
}
