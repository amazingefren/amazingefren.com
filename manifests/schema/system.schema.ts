import type { AccessRule } from './access.schema.ts';
import type { Risk } from './risk.schema.ts';
import type { KeyboardProfile } from './keyboard.schema.ts';
import type { Operation } from './operation.schema.ts';

export interface SystemManifest {
  kind: "system";
  id: string;
  name: string;
  purpose: string;
  owner: string;
  status: "declared" | "prototype" | "implemented";
  scope: "required";
  visibility: "public" | "private";
  context: {
    decisions: readonly string[];
    openQuestions: readonly string[];
  };
  capabilities: readonly string[];
  governance: {
    permissionsDefined: readonly string[];
    dataClassification: "public" | "private" | "mixed";
  };
  risks: readonly Risk[];
  dependencies: readonly string[];
  schemaVersion: 4;
  contracts: readonly string[];
  operations: readonly Operation[];
  events: readonly {
    id: string;
    contract: string;
    direction: "emits" | "consumes";
  }[];
  keyboard?: KeyboardProfile;
  pages?: readonly { path: string; entrypoint: string; access: AccessRule; status: "prototype" | "implemented" }[];
  staticFiles?: readonly { path: string; source: string; status: "placeholder" | "ready" }[];
  capabilityPaths: Readonly<Record<string, string>>;
  structure: Readonly<Record<string, string>>;
  entrypoints: readonly string[];
}
