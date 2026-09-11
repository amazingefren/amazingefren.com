export type CatalogErrorCode = 'not_found' | 'invalid_input' | 'unavailable';

export type CatalogError = { code: CatalogErrorCode; message: string };
export type CatalogResult<T> =
  { ok: true; value: T } | { ok: false; error: CatalogError };

export type CatalogBinding = {
  kind: string;
  target: string;
  status: 'declared' | 'implemented';
};
export type CatalogVerification = {
  id: string;
  category: 'contract' | 'access' | 'behavior' | 'failure' | 'integration';
  expectation: string;
  status: 'declared' | 'not-run';
  testReferenceCount: number;
};
export type CatalogOperation = {
  id: string;
  access: 'public';
  status: 'declared' | 'implemented';
  bindings: CatalogBinding[];
  verification: CatalogVerification[];
};
export type CatalogEntry = {
  id: string;
  name: string;
  purpose: string;
  status: 'declared' | 'prototype' | 'implemented';
  implementationVisibility: 'public' | 'private';
  sourceRevision: string;
  capabilities: string[];
  dependencies: string[];
  contracts: string[];
  operations: CatalogOperation[];
};
export type CatalogList = {
  catalogRevision: string;
  provenance: { scheme: 'catalog-fnv1a32'; sourceRevision: string | null };
  items: CatalogEntry[];
  nextCursor: string | null;
};
export type CatalogRead = CatalogEntry & {
  catalogRevision: string;
  provenance: CatalogList['provenance'];
};
export type ListInput = { cursor?: string; limit?: number };
export type ReadInput = { id: string };
export type SystemExplorerPort = {
  list(input: unknown): CatalogResult<CatalogList>;
  read(input: unknown): CatalogResult<CatalogRead>;
};
