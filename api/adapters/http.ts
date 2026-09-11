import { generateOpenApiDocument } from '../domain/openapi.ts';
import type { SystemManifest } from '../../manifests/schema/system.schema.ts';

export function createOpenApiHttpHandler(
  systems: readonly SystemManifest[],
  version = '0.0.0',
): (request: Request) => Response {
  const document = generateOpenApiDocument(systems, version);
  return (request) =>
    request.method === 'GET' &&
    new URL(request.url).pathname === '/api/openapi.json'
      ? new Response(JSON.stringify(document), {
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
          },
        })
      : request.method !== 'GET'
        ? new Response(
            JSON.stringify({
              code: 'invalid_input',
              message: 'Only GET is supported',
            }),
            {
              status: 405,
              headers: {
                allow: 'GET',
                'content-type': 'application/json; charset=utf-8',
                'cache-control': 'no-store',
              },
            },
          )
        : new Response(
            JSON.stringify({
              code: 'not_found',
              message: 'OpenAPI route was not found',
            }),
            {
              status: 404,
              headers: {
                'content-type': 'application/json; charset=utf-8',
                'cache-control': 'no-store',
              },
            },
          );
}
