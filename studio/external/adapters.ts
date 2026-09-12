import type {
  ExternalClient,
  ExternalClientCreateInput,
  ExternalCreateInput,
  ExternalDraft,
  ExternalEnvelope,
  ExternalList,
  ExternalListInput,
  ExternalSaveInput,
  ExternalUploadInput,
} from '../../contracts/writing/external.ts';

export type ExternalDraftPort = {
  list(input?: ExternalListInput): Promise<ExternalEnvelope<ExternalList>>;
  read(projectId: string): Promise<ExternalEnvelope<ExternalDraft>>;
  create(input: ExternalCreateInput): Promise<ExternalEnvelope<ExternalDraft>>;
  save(
    projectId: string,
    input: ExternalSaveInput,
  ): Promise<ExternalEnvelope<ExternalDraft>>;
  upload(
    projectId: string,
    input: ExternalUploadInput,
  ): Promise<ExternalEnvelope<{ assetId: string; readPath: string }>>;
  asset(projectId: string, assetId: string): Promise<Response>;
};

export type ExternalClientPort = {
  listClients(): Promise<ExternalEnvelope<{ clients: ExternalClient[] }>>;
  issueClient(
    input: ExternalClientCreateInput,
  ): Promise<ExternalEnvelope<{ client: ExternalClient; token: string }>>;
  revokeClient(id: string): Promise<ExternalEnvelope<{ id: string }>>;
};

export const createExternalDraftMcpTools = (port: ExternalDraftPort) => ({
  studio_external_drafts_list: (input?: ExternalListInput) => port.list(input),
  studio_external_drafts_read: (projectId: string) => port.read(projectId),
  studio_external_drafts_create: (input: ExternalCreateInput) =>
    port.create(input),
  studio_external_drafts_save: (projectId: string, input: ExternalSaveInput) =>
    port.save(projectId, input),
  studio_external_drafts_upload_asset: (
    projectId: string,
    input: ExternalUploadInput,
  ) => port.upload(projectId, input),
  studio_external_drafts_read_asset: (projectId: string, assetId: string) =>
    port.asset(projectId, assetId),
});

export const createExternalDraftCliAdapter = (port: ExternalDraftPort) => ({
  list: (input?: ExternalListInput) => port.list(input),
  read: (projectId: string) => port.read(projectId),
  create: (input: ExternalCreateInput) => port.create(input),
  save: (projectId: string, input: ExternalSaveInput) =>
    port.save(projectId, input),
  upload: (projectId: string, input: ExternalUploadInput) =>
    port.upload(projectId, input),
  asset: (projectId: string, assetId: string) => port.asset(projectId, assetId),
});

export const createExternalDraftHttpAdapter = (port: ExternalDraftPort) => ({
  list: (input?: ExternalListInput) => port.list(input),
  read: (projectId: string) => port.read(projectId),
  create: (input: ExternalCreateInput) => port.create(input),
  save: (projectId: string, input: ExternalSaveInput) =>
    port.save(projectId, input),
  upload: (projectId: string, input: ExternalUploadInput) =>
    port.upload(projectId, input),
  asset: (projectId: string, assetId: string) => port.asset(projectId, assetId),
});

export const createExternalClientHttpAdapter = (port: ExternalClientPort) => ({
  list: () => port.listClients(),
  issue: (input: ExternalClientCreateInput) => port.issueClient(input),
  revoke: (id: string) => port.revokeClient(id),
});
