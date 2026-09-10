import type { WorkspacePort, WorkspaceResult, WorkspaceState } from "../contracts/index.ts";
import { conflict, denied, missing, parseWorkspaceCommand, unavailable } from "../domain/index.ts";
import { executeWorkspace, workspacePermission } from "../operations/index.ts";
import type { OwnerWorkspaceDependencies } from "../ports/index.ts";

export function createOwnerWorkspacePort(dependencies: OwnerWorkspaceDependencies): WorkspacePort {
  return {
    async execute(command): Promise<WorkspaceResult<WorkspaceState>> {
      const parsed = parseWorkspaceCommand(command);
      if (!parsed.ok) return parsed;
      if (parsed.value.operation === "workspace.reset") return denied("Workspace reset is available only to guest sessions");
      let identity;
      try {
        identity = await dependencies.identity.resolve();
      } catch {
        return unavailable("Workspace identity is unavailable");
      }
      if (!identity || identity.kind !== "owner" || !identity.ownerId || identity.ownerId !== identity.subjectId) return denied("An authenticated owner is required");
      let authorization;
      try {
        authorization = await dependencies.authorization.authorize({ operation: parsed.value.operation, permission: workspacePermission(parsed.value.operation), identity, ownerId: identity.ownerId });
      } catch {
        return unavailable("Workspace authorization is unavailable");
      }
      if (!authorization.allowed || authorization.ownerId !== identity.ownerId) return denied(authorization.allowed ? "Authorized owner does not match caller" : authorization.reason);
      let state;
      try {
        state = await dependencies.storage.read({ ownerId: identity.ownerId });
      } catch {
        return unavailable("Workspace storage is unavailable");
      }
      if (!state) return missing("Owner workspace was not found");
      if (state.synthetic) return unavailable("Owner workspace storage is invalid");
      const result = executeWorkspace(dependencies, state, parsed.value);
      if (!result.ok || parsed.value.operation === "workspace.read") return result;
      try {
        const written = await dependencies.storage.write({ ownerId: identity.ownerId, expectedVersion: state.version, state: result.value });
        if (!written.ok) return written.reason === "conflict" ? conflict("Workspace changed before save") : unavailable("Workspace storage is unavailable");
      } catch {
        return unavailable("Workspace storage is unavailable");
      }
      return result;
    }
  };
}
