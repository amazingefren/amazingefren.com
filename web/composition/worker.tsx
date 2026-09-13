import type { defineApp } from 'rwsdk/worker';
import { createWritingGateway } from './writing.ts';
import { createExternalWritingGateway } from './external-writing.ts';
import { createPublicationAssetPort } from './publication-assets.ts';
import { createPublicMcpHttpHandler } from '../../mcp/composition/index.ts';
import { createSystemExplorer } from '../../system-explorer/composition/index.ts';
import { handleAuthRequest } from '../../auth/composition/index.ts';
import { readOwnerSession } from '../../auth/adapters/d1/session.ts';
import { createApplication, type PublicWorkerEnv } from './application.tsx';
import {
  canonicalPath,
  guardLaunchRequest,
  localWorkspacePreview,
  protectedPath,
  secureResponse,
  workspacePreviewPath,
} from '../domain/access/index.ts';

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
    const preview =
      path !== null &&
      localWorkspacePreview(request, env.LOCAL_WORKSPACE_PREVIEW) &&
      workspacePreviewPath(path);
    try {
      const denied = await guardLaunchRequest(
        request,
        env.AUTH_ORIGIN,
        async () => !!(await readOwnerSession(request, env.AUTH_DB)),
        preview,
      );
      if (denied) return secureResponse(denied, privateResponse);
      if (path?.startsWith('/api/auth/'))
        return secureResponse(await handleAuthRequest(request, env), true);
      if (path?.startsWith('/api/v1/studio/'))
        return secureResponse(
          await createExternalWritingGateway({
            service: env.WORKSPACE_OWNER_SERVICE,
            database: env.AUTH_DB,
            origin: env.AUTH_ORIGIN,
          })(request),
          true,
        );
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
        await createApplication(env, preview).fetch(request, env, context),
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
