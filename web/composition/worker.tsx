import { AuthDocument, createAuthRoute } from './auth.tsx';
import { defineApp } from 'rwsdk/worker';
import { render, route } from 'rwsdk/router';
import manifest from '../web.manifest.ts';
import dashboard from '../../dashboard/dashboard.manifest.ts';
import {
  createGuestSummaryHttpHandler,
  createOwnerSummaryHttpHandler,
} from '../../dashboard/adapters/http/summary.ts';
import { createSyntheticGuestTelemetry } from '../../dashboard/ports/telemetry/synthetic.ts';
import { PublicRoute } from '../adapters/http/public.tsx';
import { Document } from '../adapters/http/document.tsx';
import { GuestDashboardRoute } from './dashboard.tsx';
import {
  GuestWorkspaceRoute,
  createOwnerWorkspaceRoute,
  WorkspaceDocument,
} from './workspace.tsx';
import { workspacePages } from '../../workspace/contracts/index.ts';
import {
  createOwnerWorkspaceGateway,
  OWNER_WORKSPACE_OPERATION_PATH,
  type OwnerWorkspaceService,
} from './owner-workspace.ts';
import { createWorkGateway } from '../../work/adapters/owner.ts';
import { createWritingGateway } from './writing.ts';
import { createPublicationRoutes } from '../adapters/http/publications.tsx';
import { createPortablePublicationHttpHandler } from '../../publishing/adapters/http/portable-publications.ts';
import { createPublicationAssetPort } from './publication-assets.ts';
import { createPublicMcpHttpHandler } from '../../mcp/composition/index.ts';
import { createEvaluationGateway } from '../../evaluation/adapters/owner.ts';
import {
  createSystemExplorer,
  createSystemExplorerHttpHandler,
} from '../../system-explorer/composition/index.ts';
import {
  handleAuthRequest,
  type AuthEnvironment,
} from '../../auth/composition/index.ts';
import { readOwnerSession } from '../../auth/adapters/d1/session.ts';
import {
  canonicalPath,
  guardLaunchRequest,
  protectedPath,
  secureResponse,
} from '../domain/access/index.ts';

const pages = { 'web/adapters/http/public.tsx': PublicRoute } as const;
const guestDashboard = dashboard.views.find((view) => view.id === 'guest');
if (!guestDashboard) throw new Error('Dashboard guest view is not declared');
const publicPages = manifest.pages.filter((page) => page.path !== '*');
const dashboardSummaryPath = httpPath('dashboard.read-summary');
const guestDashboardSummaryPath = httpPath('dashboard.read-guest-summary');
const guestSummaryHandler = createGuestSummaryHttpHandler(
  { telemetry: createSyntheticGuestTelemetry(), now: Date.now },
  'public-guest-preview',
);
const ownerSummaryHandler = createOwnerSummaryHttpHandler(
  {
    auth: {
      async authorize() {
        return {
          allowed: false as const,
          error: {
            code: 'unauthenticated' as const,
            message: 'An authenticated owner is required',
          },
        };
      },
    },
    telemetry: {
      async read() {
        return {
          kind: 'unavailable' as const,
          source: 'owner-telemetry-unavailable',
          observedAt: null,
        };
      },
    },
    now: Date.now,
  },
  () => null,
);

function httpPath(operationId: string) {
  const operation = dashboard.operations.find(
    (item) => item.id === operationId,
  );
  const binding = operation?.bindings.find(
    (item) => item.surface.kind === 'http',
  );
  if (!binding || binding.surface.kind !== 'http')
    throw new Error(`No HTTP binding for ${operationId}`);
  return binding.surface.path;
}

type PublicWorkerEnv = Env &
  AuthEnvironment & { WORKSPACE_OWNER_SERVICE?: OwnerWorkspaceService };

function createApplication(environment: PublicWorkerEnv) {
  const ownerService = environment.WORKSPACE_OWNER_SERVICE;
  const AuthRoute = createAuthRoute(environment.AUTH_DB);
  const ownerGateway = createOwnerWorkspaceGateway(ownerService);
  const OwnerWorkspaceRoute = createOwnerWorkspaceRoute(ownerGateway);
  const work = createWorkGateway(ownerService);
  const writing = createWritingGateway(ownerService);
  const publications = createPublicationRoutes(writing, !!ownerService);
  const publicationExports = createPortablePublicationHttpHandler({
    publications: { list: () => writing.read() },
    assets: createPublicationAssetPort(writing),
    origin: 'https://amazingefren.com',
  });
  const systems = createSystemExplorerHttpHandler(createSystemExplorer());
  const evaluation = createEvaluationGateway(ownerService);
  return defineApp([
    render(AuthDocument, [route('/auth/me', AuthRoute)], { rscPayload: true }),
    route('/api/systems', { get: ({ request }) => systems(request) }),
    route('/api/evaluation/operations/:operation', {
      post: ({ request }) => evaluation(request),
    }),
    route('/api/systems/:id', { get: ({ request }) => systems(request) }),
    route('/exports/systems.zip', { get: ({ request }) => systems(request) }),
    route('/exports/systems/:file', { get: ({ request }) => systems(request) }),
    route('/exports/publications.zip', {
      get: ({ request }) => publicationExports(request),
    }),
    route('/readings/subscriptions.opml', {
      get: ({ request }) => publicationExports(request),
    }),
    route('/api/work/operations/:operation', {
      post: ({ request }) => work.operation(request),
    }),
    route('/api/writing/operations/:operation', {
      post: ({ request }) => writing.operation(request),
    }),
    route('/api/writing/assets/:id', {
      get: ({ request }) => writing.privateAsset(request),
    }),
    route('/api/publications/assets/:releaseId/:assetId', {
      get: ({ request }) => writing.publicAsset(request),
    }),
    route('/api/publications', {
      get: ({ request }) => publications.json(request),
    }),
    route('/api/publications/:slug', {
      get: ({ request }) => publications.json(request),
    }),
    route('/readings/feed.xml', {
      get: ({ request }) => publications.feed(request),
    }),
    route('/readings/atom.xml', {
      get: ({ request }) => publications.feed(request),
    }),
    route('/readings/:slug/download.md', {
      get: ({ request }) => publications.markdown(request),
    }),
    route(OWNER_WORKSPACE_OPERATION_PATH, {
      post: ({ request }) => ownerGateway.operation(request),
    }),
    route(guestDashboardSummaryPath, {
      get: ({ request }) => guestSummaryHandler(request),
    }),
    route(dashboardSummaryPath, {
      get: ({ request }) => ownerSummaryHandler(request),
    }),
    render(
      WorkspaceDocument,
      [
        route('/guest', GuestWorkspaceRoute),
        ...workspacePages.map((page) =>
          route(`/guest/${page}`, GuestWorkspaceRoute),
        ),
        route('/workspace', OwnerWorkspaceRoute),
        ...workspacePages.map((page) =>
          route(`/workspace/${page}`, OwnerWorkspaceRoute),
        ),
      ],
      { rscPayload: true },
    ),
    render(
      Document,
      [
        route('/readings', publications.listing),
        route('/readings/demo', PublicRoute),
        route('/readings/:slug', publications.reading),
        ...publicPages
          .filter(
            (page) =>
              page.path !== '/readings' && page.path !== '/readings/demo',
          )
          .map((page) => {
            if (page.access.kind !== 'public')
              throw new Error('Private pages require an authorization adapter');
            const handler = pages[page.entrypoint as keyof typeof pages];
            if (!handler)
              throw new Error(`No public handler for ${page.entrypoint}`);
            return route(page.path, handler);
          }),
        route(guestDashboard!.path, GuestDashboardRoute),
        route('*', PublicRoute),
      ],
      { rscPayload: true },
    ),
  ]);
}

export default {
  async fetch(
    request: Request,
    env: PublicWorkerEnv,
    context: Parameters<ReturnType<typeof defineApp>['fetch']>[2],
  ) {
    const path = canonicalPath(new URL(request.url));
    const privateResponse =
      path === null ||
      protectedPath(path) ||
      path.startsWith('/auth/') ||
      path.startsWith('/api/auth/');
    try {
      const denied = await guardLaunchRequest(
        request,
        env.AUTH_ORIGIN,
        async () => !!(await readOwnerSession(request, env.AUTH_DB)),
      );
      if (denied) return secureResponse(denied, privateResponse);
      if (path?.startsWith('/api/auth/'))
        return secureResponse(await handleAuthRequest(request, env), true);
      if (path === '/mcp') {
        const writing = createWritingGateway(env.WORKSPACE_OWNER_SERVICE);
        return secureResponse(
          await createPublicMcpHttpHandler(createSystemExplorer(), {
            allowedOrigins: [
              'https://amazingefren.com',
              ...(env.AUTH_ORIGIN ? [env.AUTH_ORIGIN] : []),
            ],
            publications: {
              publications: { list: () => writing.read() },
              assets: createPublicationAssetPort(writing),
              origin: 'https://amazingefren.com',
            },
          })(request),
          false,
        );
      }
      if (
        path?.startsWith('/api/writing/assets/') ||
        path?.startsWith('/api/publications/assets/')
      ) {
        if (request.method !== 'GET')
          return secureResponse(
            new Response(null, { status: 405, headers: { allow: 'GET' } }),
            true,
          );
        const writing = createWritingGateway(env.WORKSPACE_OWNER_SERVICE);
        return secureResponse(
          await (path.startsWith('/api/writing/')
            ? writing.privateAsset(request)
            : writing.publicAsset(request)),
          privateResponse,
        );
      }
      return secureResponse(
        await createApplication(env).fetch(request, env, context),
        privateResponse,
      );
    } catch {
      return secureResponse(
        new Response('Service unavailable.', { status: 503 }),
        true,
      );
    }
  },
};
