import type { Operation } from "../manifests/schema/operation.schema.ts";
import type { SystemManifest } from "../manifests/schema/system.schema.ts";

const commandContract = "workspace/operations/contracts/workspace-command.schema.json";
const ownerCommandContract = "workspace/operations/contracts/workspace-owner-command.schema.json";
const stateContract = "workspace/operations/contracts/workspace-state.schema.json";
const errorContract = "workspace/operations/contracts/workspace-error.schema.json";
const operationTests = ["workspace/tests/operations/workspace.test.ts"];
const transportTests = ["workspace/tests/adapters/transports.test.ts"];

const operations = [
  ["read", "GET", "Read the synthetic guest workspace."],
  ["reset", "POST", "Reset the synthetic guest workspace."],
  ["create-document", "POST", "Create a synthetic workspace document."],
  ["save-document", "POST", "Save a synthetic workspace document revision."],
  ["restore-document", "POST", "Restore a synthetic workspace document revision."],
  ["create-task", "POST", "Create a synthetic workspace task."],
  ["complete-task", "POST", "Complete a synthetic workspace task."],
  ["create-experiment", "POST", "Create a synthetic workspace experiment."],
  ["update-experiment", "POST", "Update a synthetic workspace experiment."],
  ["link-documents", "POST", "Link synthetic workspace documents."],
  ["unlink-documents", "POST", "Unlink synthetic workspace documents."],
  ["publish", "POST", "Publish a synthetic workspace snapshot."],
  ["withdraw", "POST", "Withdraw a synthetic workspace snapshot."]
] as const;

function operation(name: typeof operations[number][0], method: "GET" | "POST", description: string): Operation {
  const id = `workspace.${name}`;
  return {
    id,
    access: { kind: "public" },
    dataScope: "synthetic",
    bindings: [
      {
        id: `${id}.http`,
        surface: { kind: "http", method: "POST", path: `/api/guest/workspace/${name}` },
        scope: "required",
        status: "declared",
        directory: "workspace/adapters/http",
        testsDirectory: "workspace/tests/adapters",
        implementation: "workspace/adapters/http/index.ts",
        tests: transportTests
      },
      {
        id: `${id}.mcp-tool`,
        surface: { kind: "mcp-tool", name: `workspace_${name.replaceAll("-", "_")}`, description, readOnly: name === "read" },
        scope: "required",
        status: "declared",
        directory: "workspace/adapters/mcp",
        testsDirectory: "workspace/tests/adapters",
        implementation: "workspace/adapters/mcp/index.ts",
        tests: transportTests
      },
      {
        id: `${id}.cli`,
        surface: { kind: "cli", command: `ae guest-workspace ${name}`, output: "json" },
        scope: "required",
        status: "declared",
        directory: "workspace/adapters/cli",
        testsDirectory: "workspace/tests/adapters",
        implementation: "workspace/adapters/cli/index.ts",
        tests: transportTests
      }
    ],
    status: "declared",
    input: commandContract,
    output: stateContract,
    errors: errorContract,
    directory: "workspace/operations",
    testsDirectory: "workspace/tests/operations",
    implementation: "workspace/operations/index.ts",
    verification: [
      { id: `${id}.contract`, category: "contract", expectation: "The command parser rejects unknown fields, unsupported operations, and invalid bounded values.", tests: operationTests },
      { id: `${id}.behavior`, category: "behavior", expectation: "The command returns a bounded synthetic state and keeps published snapshots separate from later drafts.", tests: operationTests },
      { id: `${id}.failure`, category: "failure", expectation: "Missing records, revision conflicts, and unavailable dependencies return typed errors without partial writes.", tests: operationTests },
      { id: `${id}.integration`, category: "integration", expectation: "HTTP, MCP, and CLI delegate to the same injected workspace operation boundary.", tests: transportTests }
    ]
  };
}

const syntheticOperations = operations.map(([name, method, description]) => operation(name, method, description));
const ownerExecuteOperation = {
  id: 'workspace.owner-execute',
  access: { kind: 'authenticated', permissions: ['workspace.read', 'workspace.write', 'workspace.publish'], ownership: 'caller' },
  dataScope: 'owner',
  allowedCommands: [
    { operation: 'workspace.read', permission: 'workspace.read' },
    { operation: 'workspace.create-document', permission: 'workspace.write' },
    { operation: 'workspace.save-document', permission: 'workspace.write' },
    { operation: 'workspace.restore-document', permission: 'workspace.write' },
    { operation: 'workspace.create-task', permission: 'workspace.write' },
    { operation: 'workspace.complete-task', permission: 'workspace.write' },
    { operation: 'workspace.create-experiment', permission: 'workspace.write' },
    { operation: 'workspace.update-experiment', permission: 'workspace.write' },
    { operation: 'workspace.link-documents', permission: 'workspace.write' },
    { operation: 'workspace.unlink-documents', permission: 'workspace.write' },
    { operation: 'workspace.publish', permission: 'workspace.publish' },
    { operation: 'workspace.withdraw', permission: 'workspace.publish' }
  ],
  bindings: [{
    id: 'workspace.owner-execute.http',
    surface: { kind: 'http', method: 'POST', path: '/api/workspace/operation' },
    scope: 'required',
    status: 'declared',
    directory: 'workspace/adapters/http',
    testsDirectory: 'workspace/tests/adapters',
    implementation: null,
    tests: ['workspace/tests/adapters/owner-gateway.test.ts']
  }],
  status: 'declared',
  input: ownerCommandContract,
  output: stateContract,
  errors: errorContract,
  directory: 'workspace/operations',
  testsDirectory: 'workspace/tests/operations',
  implementation: null,
  verification: [{ id: 'workspace.owner-execute.access', category: 'access', expectation: 'The public gateway forwards an passkey session only to a configured private service. The service authorizes each declared command before storage reads.', tests: ['workspace/tests/adapters/owner-gateway.test.ts'] }]
} as const satisfies Operation & { allowedCommands: readonly { operation: string; permission: 'workspace.read' | 'workspace.write' | 'workspace.publish' }[] };
const pageNames = ["dashboard", "documents", "tasks", "experiments", "relationships", "publishing", "systems", "connections", "access"] as const;

function operationsForPage(page: typeof pageNames[number]): string[] {
  const pageOperations = page === "dashboard" ? ["workspace.complete-task"]
    : page === "documents" ? ["workspace.create-document", "workspace.save-document", "workspace.restore-document"]
    : page === "tasks" ? ["workspace.create-task", "workspace.complete-task"]
    : page === "experiments" ? ["workspace.create-experiment", "workspace.update-experiment"]
    : page === "relationships" ? ["workspace.link-documents", "workspace.unlink-documents"]
    : page === "publishing" ? ["workspace.publish", "workspace.withdraw"]
    : page === "systems" ? ["workspace.reset"]
    : [];
  return ["workspace.read", ...pageOperations];
}

export default {
  kind: "system",
  id: "workspace",
  name: "AE Workspace",
  purpose: "Run the personal workspace and a session-isolated synthetic guest replica.",
  owner: "amazingefren",
  status: "prototype",
  scope: "required",
  visibility: "public",
  context: {
    decisions: [
      "First deployment adds the web launch access boundary to all guest views and HTTP APIs. Public guest operation contracts describe the retained synthetic capability; anonymous hosting is disabled until a later release.",
      "AE Work application build authorized on 2026-09-09. Work routes, operations and storage contracts belong to work/work.manifest.ts; the workspace shell links Work alongside existing sections.",
      "AE Design owns copy and interaction rules. Keep a single 32px page gutter, compact forms, one status label, and no implementation prose. Dark workspace background uses the shared public radial gradient.",
      "Route navigation focuses the main region through the shared ae-focus-target behavior without a content outline. Interactive controls retain visible keyboard focus.",
      "Guest workspace data is synthetic, bounded, stored in sessionStorage, and never falls back to owner records.",
      "The frozen WorkspacePort command contract is the shared boundary for browser, HTTP, MCP, and CLI adapters.",
      "Document saves use optimistic document revisions. Publishing copies the requested stored revision into a separate snapshot.",
      "Owner adapters deny callers before private storage reads and use injected identity, authorization, and compare-version storage ports.",
      "The public owner gateway is implemented with optional service injection and fails closed when the private service binding is unconfigured. Deployment configuration remains unavailable in this public implementation."
    ],
    openQuestions: [
      "Configure the optional Cloudflare Worker service binding before enabling owner routes in a deployment.",
      "Private service deployment, passkey enrollment configuration, and D1 migration remain separate private-engine work."
    ]
  },
  capabilities: ["domain", "operations", "guest-boundary", "owner-boundary", "transports"],
  governance: { permissionsDefined: ["workspace.read", "workspace.write", "workspace.publish"], dataClassification: "mixed" },
  risks: [],
  dependencies: ["design", "auth", "publishing"],
  schemaVersion: 5,
  views: [
    ...pageNames.map((page) => ({
      id: `guest-${page}`,
      directory: "workspace/ui",
      testsDirectory: "workspace/tests",
      implementation: "workspace/ui/app.tsx",
      path: `/guest/${page}`,
      status: "declared" as const,
      audience: "guest" as const,
      access: { kind: "public" as const },
      data: "synthetic" as const,
      replicaOf: `owner-${page}`,
      isolation: "session" as const,
      sideEffects: "sandbox-only" as const,
      productionAccess: "denied" as const,
      fallback: "fail-closed" as const,
      operations: operationsForPage(page),
      verification: [{ expectation: "Guest route reads only its session-isolated synthetic WorkspacePort state and fails closed when storage is unavailable.", tests: ["workspace/tests/adapters/guest-browser.test.ts"] }]
    })),
    ...pageNames.map((page) => ({
      id: `owner-${page}`,
      directory: "workspace/ui",
      testsDirectory: "workspace/tests",
      implementation: "workspace/ui/app.tsx",
      path: `/workspace/${page}`,
      status: "declared" as const,
      audience: "owner" as const,
      access: { kind: "authenticated" as const, permissions: ["workspace.read", "workspace.write", "workspace.publish"], ownership: "caller" as const },
      data: "owner" as const,
      operations: ["workspace.owner-execute"],
      verification: [{ expectation: "Owner route forwards the passkey session to a configured private service and renders only after its authorized workspace read succeeds.", tests: ["workspace/tests/adapters/owner-gateway.test.ts"] }]
    }))
  ],
  contracts: ["workspace/contracts/index.ts", commandContract, ownerCommandContract, stateContract, errorContract],
  operations: [...syntheticOperations, ownerExecuteOperation],
  events: [],
  capabilityPaths: { domain: "workspace/domain", operations: "workspace/operations", "guest-boundary": "workspace/adapters", "owner-boundary": "workspace/ports", transports: "workspace/adapters" },
  structure: { contracts: "workspace/contracts", domain: "workspace/domain", ports: "workspace/ports", operations: "workspace/operations", adapters: "workspace/adapters", tests: "workspace/tests", ui: "workspace/ui" },
  entrypoints: ["workspace/domain/index.ts", "workspace/operations/index.ts", "workspace/ports/index.ts", "workspace/adapters/index.ts", "workspace/adapters/guest-browser.ts", "workspace/adapters/owner-server.ts"]
} as const satisfies SystemManifest;
