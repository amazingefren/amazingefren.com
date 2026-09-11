export type OpenApiRequest = Record<string, never>;
export type { OpenApiDocument } from '../domain/openapi.ts';
export type OpenApiError = {
  code: 'invalid_input' | 'not_found';
  message: string;
};
