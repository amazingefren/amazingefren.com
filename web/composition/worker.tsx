import { defineApp } from 'rwsdk/worker';
import { render, route } from 'rwsdk/router';
import manifest from '../web.manifest.ts';
import dashboard from '../../dashboard/dashboard.manifest.ts';
import { createGuestSummaryHttpHandler, createOwnerSummaryHttpHandler } from '../../dashboard/adapters/http/summary.ts';
import { createSyntheticGuestTelemetry } from '../../dashboard/ports/telemetry/synthetic.ts';
import { PublicRoute } from '../adapters/http/public.tsx';
import { Document } from '../adapters/http/document.tsx';
import { GuestDashboardRoute } from './dashboard.tsx';
import { GuestWorkspaceRoute, createOwnerWorkspaceRoute, WorkspaceDocument } from './workspace.tsx';
import { workspacePages } from '../../workspace/contracts/index.ts';
import { createOwnerWorkspaceGateway, OWNER_WORKSPACE_OPERATION_PATH, type OwnerWorkspaceService } from './owner-workspace.ts';
import { createWritingGateway } from './writing.ts';
import { createPublicationRoutes } from '../adapters/http/publications.tsx';

const pages = { 'web/adapters/http/public.tsx': PublicRoute } as const;
const guestDashboard = dashboard.views.find((view) => view.id === 'guest');
if (!guestDashboard) throw new Error('Dashboard guest view is not declared');
const publicPages = manifest.pages.filter((page) => page.path !== '*');
const dashboardSummaryPath = httpPath('dashboard.read-summary');
const guestDashboardSummaryPath = httpPath('dashboard.read-guest-summary');
const guestSummaryHandler = createGuestSummaryHttpHandler({ telemetry: createSyntheticGuestTelemetry(), now: Date.now }, 'public-guest-preview');
const ownerSummaryHandler = createOwnerSummaryHttpHandler({
  auth: {
    async authorize() {
      return { allowed: false as const, error: { code: 'unauthenticated' as const, message: 'An authenticated owner is required' } };
    },
  },
  telemetry: {
    async read() {
      return { kind: 'unavailable' as const, source: 'owner-telemetry-unavailable', observedAt: null };
    },
  },
  now: Date.now,
}, () => null);

function httpPath(operationId: string) {
  const operation = dashboard.operations.find((item) => item.id === operationId);
  const binding = operation?.bindings.find((item) => item.surface.kind === 'http');
  if (!binding || binding.surface.kind !== 'http') throw new Error(`No HTTP binding for ${operationId}`);
  return binding.surface.path;
}

type PublicWorkerEnv = Env & { WORKSPACE_OWNER_SERVICE?: OwnerWorkspaceService };

function createApplication(ownerService: OwnerWorkspaceService | undefined) {
  const ownerGateway = createOwnerWorkspaceGateway(ownerService);
  const OwnerWorkspaceRoute = createOwnerWorkspaceRoute(ownerGateway);
  const writing = createWritingGateway(ownerService);
  const publications = createPublicationRoutes(writing, !!ownerService);
  return defineApp([
  route('/api/writing/operations/:operation', { post: ({ request }) => writing.operation(request) }),
  route('/api/writing/assets/:id', { get: ({ request }) => writing.privateAsset(request) }),
  route('/api/publications/assets/:releaseId/:assetId', { get: ({ request }) => writing.publicAsset(request) }),
  route('/api/publications', { get: ({ request }) => publications.json(request) }),
  route('/api/publications/:slug', { get: ({ request }) => publications.json(request) }),
  route('/readings/feed.xml', { get: ({ request }) => publications.feed(request) }),
  route('/readings/atom.xml', { get: ({ request }) => publications.feed(request) }),
  route('/readings/:slug/download.md', { get: ({ request }) => publications.markdown(request) }),
  route(OWNER_WORKSPACE_OPERATION_PATH, { post: ({ request }) => ownerGateway.operation(request) }),
  route(guestDashboardSummaryPath, { get: ({ request }) => guestSummaryHandler(request) }),
  route(dashboardSummaryPath, { get: ({ request }) => ownerSummaryHandler(request) }),
  render(WorkspaceDocument, [route('/guest', GuestWorkspaceRoute), ...workspacePages.map(page => route(`/guest/${page}`, GuestWorkspaceRoute)), route('/workspace', OwnerWorkspaceRoute), ...workspacePages.map(page => route(`/workspace/${page}`, OwnerWorkspaceRoute))], { rscPayload: true }),
  render(Document, [route('/readings', publications.listing), route('/readings/demo', PublicRoute), route('/readings/:slug', publications.reading), ...publicPages.filter(page => page.path !== '/readings' && page.path !== '/readings/demo').map((page) => {
    if (page.access.kind !== 'public') throw new Error('Private pages require an authorization adapter');
    const handler = pages[page.entrypoint as keyof typeof pages];
    if (!handler) throw new Error(`No public handler for ${page.entrypoint}`);
    return route(page.path, handler);
  }), route(guestDashboard!.path, GuestDashboardRoute), route('*', PublicRoute)], { rscPayload: true }),
]);
}

export default {
  fetch(request: Request, env: PublicWorkerEnv, context: Parameters<ReturnType<typeof defineApp>["fetch"]>[2]) {
    return createApplication(env.WORKSPACE_OWNER_SERVICE).fetch(request, env, context);
  }
};
