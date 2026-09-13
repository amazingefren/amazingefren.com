import type { Operation } from '../../manifests/schema/operation.schema.ts';
import { studioWritingOperations } from '../writing/manifest.ts';
import { publicationProjectOperations } from '../../publishing/projects/manifest.ts';

function authoringExpectation(
  operation: Operation,
  obligation: Operation['verification'][number],
): string {
  if (operation.id === 'studio.writing.reset')
    return obligation.category === 'access'
      ? 'Guest reset never invokes owner storage.'
      : obligation.expectation;
  if (obligation.category === 'access')
    return 'The private service verifies the owner passkey session before each protected read or write.';
  if (obligation.category === 'failure')
    return 'Invalid writing state and revision conflicts return typed failures without exposing or resetting private data.';
  if (obligation.category !== 'behavior') return obligation.expectation;
  if (operation.id === 'studio.writing.read')
    return "Read only the caller's stored writing state without changing it.";
  if (operation.id.startsWith('publishing.'))
    return 'Project transitions use expected versions. Saves and reviews do not change active public releases.';
  return 'Private drafts and referenced assets stay owner-only. Writing commands never publish them.';
}

function authoring(operation: Operation): Operation {
  const reset = operation.id === 'studio.writing.reset';
  const publication = operation.id.startsWith('publishing.');
  const directory = publication ? 'publishing/projects' : 'studio/writing';
  const testsDirectory = publication ? 'publishing/tests' : 'studio/tests';
  const permission =
    operation.id === 'studio.writing.read'
      ? 'studio.read'
      : publication
        ? 'publishing.publish'
        : 'studio.write';
  return {
    ...operation,
    dataScope: reset ? 'synthetic' : 'owner',
    access: reset
      ? { kind: 'public' }
      : {
          kind: 'authenticated',
          permissions: [permission],
          ownership: 'caller',
        },
    status: 'declared',
    directory,
    testsDirectory,
    implementation: null,
    bindings: operation.bindings.map((binding) => ({
      ...binding,
      status: 'declared',
      directory,
      testsDirectory,
      implementation: reset ? null : `${directory}/adapters.ts`,
      surface:
        binding.surface.kind === 'http'
          ? {
              kind: 'http',
              method: 'POST',
              path: reset
                ? '/api/guest/writing/reset'
                : `/api/writing/operations/${operation.id}`,
            }
          : binding.surface,
    })),
    verification: operation.verification.map((item) => ({
      ...item,
      expectation: authoringExpectation(operation, item),
      tests: reset ? item.tests : [],
    })),
  };
}

export const ownerWritingOperations: Operation[] = studioWritingOperations.map(
  (operation): Operation => {
    const declared = authoring(operation);
    if (operation.id !== 'studio.writing.read') return declared;
    return {
      ...declared,
      bindings: [
        ...declared.bindings,
        {
          id: 'studio.writing.read.asset',
          surface: {
            kind: 'http',
            method: 'GET',
            path: '/api/writing/assets/{id}',
          },
          status: 'declared',
          directory: 'studio/writing',
          testsDirectory: 'studio/tests',
          implementation: null,
          tests: [],
        } as const,
      ],
    };
  },
);
export const ownerProjectOperations = publicationProjectOperations
  .filter((operation) => operation.dataScope !== 'published')
  .map(authoring);
export const publicProjectOperations: Operation[] = publicationProjectOperations
  .filter((operation) => operation.dataScope === 'published')
  .map((operation) => ({
    ...operation,
    directory: 'publishing/projects',
    testsDirectory: 'publishing/tests',
    implementation: 'publishing/projects/delivery.ts',
    bindings: operation.bindings
      .filter(
        (binding) =>
          !(
            binding.surface.kind === 'export' &&
            binding.surface.format === 'json'
          ),
      )
      .map((binding) => ({
        ...binding,
        directory: 'publishing/projects',
        testsDirectory: 'publishing/tests',
        implementation: 'publishing/projects/delivery.ts',
        surface:
          binding.surface.kind === 'feed'
            ? {
                ...binding.surface,
                path:
                  binding.surface.format === 'rss'
                    ? '/readings/feed.xml'
                    : '/readings/atom.xml',
                itemId: 'slug',
              }
            : binding.surface.kind === 'export' &&
                binding.surface.format === 'markdown'
              ? { ...binding.surface, path: '/readings/{slug}/download.md' }
              : binding.surface,
      })),
  }));
