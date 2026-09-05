import type { AccessRule } from './access.schema.ts';

interface ViewDeclaration {
  id: string;
  path: string;
  status: "declared" | "implemented";
  directory: string;
  testsDirectory: string;
  implementation: string | null;
  operations: readonly string[];
  verification: readonly { expectation: string; tests: readonly string[] }[];
}

export type SystemView = ViewDeclaration & (
  | {
      audience: "owner";
      access: Extract<AccessRule, { kind: "authenticated" }> & { ownership: "caller" };
      data: "owner";
    }
  | {
      audience: "public";
      access: Extract<AccessRule, { kind: "public" }>;
      data: "published";
    }
  | {
      audience: "guest";
      access: Extract<AccessRule, { kind: "public" }>;
      data: "synthetic";
      replicaOf: string;
      isolation: "session";
      sideEffects: "sandbox-only";
      productionAccess: "denied";
      fallback: "fail-closed";
    }
);
