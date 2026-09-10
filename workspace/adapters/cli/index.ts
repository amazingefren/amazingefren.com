import type { WorkspacePort, WorkspaceResult, WorkspaceState } from "../../contracts/index.ts";

export async function executeWorkspaceCli(port: WorkspacePort, args: readonly string[]): Promise<WorkspaceResult<WorkspaceState>> {
  if (args.length !== 1) return { ok: false, error: { code: "invalid", message: "Provide one JSON command" } };
  try {
    return await port.execute(JSON.parse(args[0]) as never);
  } catch {
    return { ok: false, error: { code: "invalid", message: "Command must be JSON" } };
  }
}
