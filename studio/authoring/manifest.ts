import type { Operation } from '../../manifests/schema/operation.schema.ts';
import { studioWritingOperations } from '../writing/manifest.ts';
import { publicationProjectOperations } from '../../publishing/projects/manifest.ts';

function authoring(operation: Operation): Operation {
  const reset = operation.id === 'studio.writing.reset';
  const publication = operation.id.startsWith('publishing.');
  const directory = publication ? 'publishing/projects' : 'studio/writing';
  const testsDirectory = publication ? 'publishing/tests' : 'studio/tests';
  const permission = operation.id === 'studio.writing.read' ? 'studio.read' : publication ? 'publishing.publish' : 'studio.write';
  return {
    ...operation, dataScope: reset ? 'synthetic' : 'owner',
    access: reset ? { kind: 'public' } : { kind: 'authenticated', permissions: [permission], ownership: 'caller' },
    status: 'declared', directory, testsDirectory, implementation: null,
    bindings: operation.bindings.map(binding => ({ ...binding, status: 'declared', directory, testsDirectory, implementation: reset ? null : `${directory}/adapters.ts`, surface: binding.surface.kind === 'http' ? { kind: 'http', method: 'POST', path: reset ? '/api/guest/writing/reset' : `/api/writing/operations/${operation.id}` } : binding.surface })),
    verification: operation.verification.map(item => ({ ...item, expectation: item.category === 'access' ? reset ? 'Guest reset never invokes owner storage.' : 'The private service verifies the configured owner Access identity before each protected read or write.' : item.expectation }))
  };
}

export const ownerWritingOperations = studioWritingOperations.map(authoring);
export const ownerProjectOperations = publicationProjectOperations.filter(operation => operation.dataScope !== 'published').map(authoring);
export const publicProjectOperations: Operation[] = publicationProjectOperations.filter(operation => operation.dataScope === 'published').map(operation => ({
  ...operation, directory: 'publishing/projects', testsDirectory: 'publishing/tests', implementation: 'publishing/projects/delivery.ts',
  bindings: operation.bindings.filter(binding => !(binding.surface.kind === 'export' && binding.surface.format === 'json')).map(binding => ({ ...binding, directory: 'publishing/projects', testsDirectory: 'publishing/tests', implementation: 'publishing/projects/delivery.ts', surface: binding.surface.kind === 'feed' ? { ...binding.surface, path: binding.surface.format === 'rss' ? '/readings/feed.xml' : '/readings/atom.xml', itemId: 'slug' } : binding.surface.kind === 'export' ? { ...binding.surface, path: '/readings/{slug}/download.md' } : binding.surface }))
}));
