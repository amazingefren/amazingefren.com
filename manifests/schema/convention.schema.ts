export interface ConventionManifest {
  kind: 'convention';
  id: string;
  purpose: string;
  owner: string;
  status: 'experimental' | 'implemented';
  schemaVersion: 1;
  version: number;
  syntax: Readonly<Record<string, string | readonly string[]>>;
  records: Readonly<Record<string, string>>;
  rules: readonly string[];
  examples: readonly string[];
  sources: readonly string[];
  implementations: readonly string[];
  tests: readonly string[];
}
