import type {
  Asset,
  Command,
  Result,
  StudioState,
} from '../../../contracts/writing/index.ts';
import {
  invalid,
  missing,
  success,
  type GuestMutationContext,
} from './state.ts';
import { invalidatePublication } from './documents.ts';

type AddInput = Extract<Command, { operation: 'studio.assets.add' }>['input'];
type UpdateInput = Extract<
  Command,
  { operation: 'studio.assets.update' }
>['input'];

export function addAsset(
  state: StudioState,
  input: AddInput,
  context: GuestMutationContext,
): Result<void> {
  if (!input.name.trim() || !input.dataUrl.startsWith('data:'))
    return invalid('Asset name and data URL are required.');
  const asset: Asset = { id: context.createId('asset'), ...input };
  state.assets.push(asset);
  return success<void>(undefined);
}

export function updateAsset(
  state: StudioState,
  input: UpdateInput,
  changedAt: string,
): Result<void> {
  const asset = state.assets.find((item) => item.id === input.id);
  if (!asset) return missing('Asset does not exist.');
  if (
    asset.alt === input.alt &&
    asset.caption === input.caption &&
    asset.rights === input.rights
  )
    return success<void>(undefined);

  state.publications.forEach((publication) => {
    if (usesAsset(state, publication, asset.id))
      invalidatePublication(publication, changedAt);
  });
  Object.assign(asset, input);
  return success<void>(undefined);
}

function usesAsset(
  state: StudioState,
  publication: StudioState['publications'][number],
  assetId: string,
): boolean {
  return (
    publication.coverAssetId === assetId ||
    publication.chapterIds.some((chapterId) =>
      state.documents
        .find((document) => document.id === chapterId)
        ?.body.includes(`asset:${assetId}`),
    )
  );
}
