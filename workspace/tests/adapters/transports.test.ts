import assert from "node:assert/strict";
import test from "node:test";
import { executeWorkspaceCli } from "../../adapters/cli/index.ts";
import { createWorkspaceHttpHandler } from "../../adapters/http/index.ts";
import { executeWorkspaceMcp } from "../../adapters/mcp/index.ts";
import type { WorkspacePort } from "../../contracts/index.ts";

test("HTTP MCP and CLI transports delegate the same command to their injected port", async () => {
  const commands: unknown[] = [];
  const port: WorkspacePort = { execute: async (command) => { commands.push(command); return { ok: false, error: { code: "denied", message: "boundary" } }; } };
  const http = createWorkspaceHttpHandler(port);
  const httpResponse = await http(new Request("https://example.test/api/guest/workspace", { method: "POST", body: JSON.stringify({ operation: "workspace.read", input: {} }) }));
  assert.equal(httpResponse.status, 403);
  const mcp = await executeWorkspaceMcp(port, { operation: "workspace.read", input: {} });
  const cli = await executeWorkspaceCli(port, [JSON.stringify({ operation: "workspace.read", input: {} })]);
  assert.equal(mcp.ok, false);
  assert.equal(cli.ok, false);
  assert.equal(commands.length, 3);
});
