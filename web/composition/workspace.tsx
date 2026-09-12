import type { RequestInfo } from 'rwsdk/worker';
import type { DocumentProps } from 'rwsdk/router';
import { systems } from '../../manifests/registry.ts';
import { WorkspaceApp } from '../../workspace/ui/app.tsx';
import type { OwnerWorkspaceGateway } from './owner-workspace.ts';
import { workspacePages } from '../../workspace/contracts/index.ts';
import type {
  CatalogEntry,
  WorkspacePage,
} from '../../workspace/contracts/index.ts';
import { themeBootstrap } from '../../design/behaviors/theme.ts';
import { BrandMark } from '../../design/ui/BrandMark.tsx';
import designStyles from '../../design/ui/index.css?url';
import workspaceStyles from '../../workspace/ui/workspace.css?url';
import studioStyles from '../../workspace/ui/studio.css?url';
import systemsStyles from '../../workspace/ui/systems.css?url';
import workStyles from '../../work/ui/styles.css?url';
import writingStyles from '../../workspace/ui/writing/styles.css?url';
import publicationStyles from '../../publishing/rendering/styles.css?url';
import previewStyles from '../../workspace/ui/writing/public-preview.css?url';

function publicCatalog(): CatalogEntry[] {
  return systems
    .filter((system) => system.visibility === 'public')
    .map((system) => ({
      id: system.id,
      name: system.name,
      purpose: system.purpose,
      status: system.status,
      capabilities: [...system.capabilities],
      dependencies: [...system.dependencies],
      contracts: [...system.contracts],
      operations: system.operations.map((operation) => ({
        id: operation.id,
        access: operation.access.kind,
        permissions:
          operation.access.kind === 'public'
            ? []
            : [...operation.access.permissions],
        bindings: operation.bindings.map((binding) => {
          const surface = binding.surface;
          const label =
            surface.kind === 'http'
              ? `${surface.method} ${surface.path}`
              : surface.kind === 'mcp-tool'
                ? surface.name
                : surface.kind === 'mcp-resource'
                  ? surface.uriTemplate
                  : surface.kind === 'cli'
                    ? surface.command
                    : surface.kind === 'mirror'
                      ? surface.network
                      : surface.path;
          return { kind: surface.kind, label };
        }),
      })),
    }));
}

export function WorkspaceDocument({ children }: DocumentProps) {
  return (
    <html lang="en">
      <head>
        <meta name="publication-preview-styles" content={previewStyles} />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <title>AE Workspace</title>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap() }} />
        <link rel="stylesheet" href={designStyles} />
        <link rel="stylesheet" href={workspaceStyles} />
        <link rel="stylesheet" href={studioStyles} />
        <link rel="stylesheet" href={systemsStyles} />
        <link rel="stylesheet" href={writingStyles} />
        <link rel="stylesheet" href={publicationStyles} />
        <link rel="stylesheet" href={workStyles} />
        <style>{'body{margin:0;background:var(--ae-background)}'}</style>
      </head>
      <body>
        {children}
        <script>{"import('/src/client.tsx')"}</script>
      </body>
    </html>
  );
}

export function GuestWorkspaceRoute({ request, response }: RequestInfo) {
  response.headers.set('Cache-Control', 'private, no-store');
  const path = new URL(request.url).pathname;
  if (path === '/guest')
    return Response.redirect(new URL('/guest/dashboard', request.url), 302);
  const requested = path.split('/')[2] || 'dashboard';
  if (!workspacePages.includes(requested as WorkspacePage)) {
    response.status = 404;
    return (
      <main className="ae-workspace ws-main">
        <h1>Page not found</h1>
        <a href="/guest/dashboard">Open Dashboard</a>
      </main>
    );
  }
  return (
    <WorkspaceApp
      initialPage={requested as WorkspacePage}
      catalog={publicCatalog()}
    />
  );
}

export function createOwnerWorkspaceRoute(gateway: OwnerWorkspaceGateway) {
  return async function OwnerWorkspaceRoute({
    request,
    response,
  }: RequestInfo) {
    const result = await gateway.read(request);
    response.headers.set('Cache-Control', 'private, no-store');
    if (!result.ok) {
      response.status = result.error.code === 'denied' ? 401 : 503;
      return (
        <main className="ae-workspace ws-main">
          <BrandMark variant="theme" />
          <h1>Owner workspace unavailable</h1>
          <p>
            {result.error.code === 'denied'
              ? 'Owner sign-in is required.'
              : 'Private workspace storage is unavailable.'}
          </p>
          <a href="/">Back home</a>
        </main>
      );
    }
    const path = new URL(request.url).pathname;
    if (path === '/workspace')
      return Response.redirect(
        new URL('/workspace/dashboard', request.url),
        302,
      );
    const requested = path.split('/')[2] || 'dashboard';
    if (!workspacePages.includes(requested as WorkspacePage)) {
      response.status = 404;
      return (
        <main className="ae-workspace ws-main">
          <h1>Page not found</h1>
          <a href="/workspace/dashboard">Open Dashboard</a>
        </main>
      );
    }
    return (
      <WorkspaceApp
        initialPage={requested as WorkspacePage}
        catalog={publicCatalog()}
        audience="owner"
        initialState={result.value}
      />
    );
  };
}
