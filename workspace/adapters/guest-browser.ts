import type { WorkspacePort, WorkspaceResult, WorkspaceState } from "../contracts/index.ts";
import { createSyntheticWorkspaceState, executeWorkspaceCommand, isWorkspaceState, parseWorkspaceCommand, type WorkspaceDependencies } from "../domain/index.ts";

export const GUEST_WORKSPACE_STORAGE_KEY = "ae.workspace.guest.v1";

export interface BrowserGuestDependencies extends Partial<WorkspaceDependencies> {}

export function createBrowserGuestPort(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  dependencies: BrowserGuestDependencies = {}
): WorkspacePort {
  const resolved = resolveDependencies(dependencies);
  return {
    async execute(command) {
      const parsed = parseWorkspaceCommand(command);
      if (!parsed.ok) return parsed;
      if (parsed.value.operation === "workspace.reset") return reset(storage, resolved);
      const state = load(storage, resolved);
      if (!state.ok) return state;
      const result = executeWorkspaceCommand(state.value, parsed.value, resolved);
      if (!result.ok || parsed.value.operation === "workspace.read") return result;
      try {
        storage.setItem(GUEST_WORKSPACE_STORAGE_KEY, JSON.stringify(result.value));
      } catch {
        return unavailable();
      }
      return result;
    }
  };
}

function load(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">, dependencies: WorkspaceDependencies): WorkspaceResult<WorkspaceState> {
  let raw: string | null;
  try {
    raw = storage.getItem(GUEST_WORKSPACE_STORAGE_KEY);
  } catch {
    return unavailable();
  }
  if (raw === null) return reset(storage, dependencies);
  try {
    const state: unknown = JSON.parse(raw);
    return isWorkspaceState(state) && state.synthetic ? { ok: true, value: state } : unavailable();
  } catch {
    return unavailable();
  }
}

function reset(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">, dependencies: WorkspaceDependencies): WorkspaceResult<WorkspaceState> {
  const result = createSyntheticWorkspaceState(dependencies);
  if (!result.ok) return result;
  try {
    storage.removeItem(GUEST_WORKSPACE_STORAGE_KEY);
    storage.setItem(GUEST_WORKSPACE_STORAGE_KEY, JSON.stringify(result.value));
    return result;
  } catch {
    return unavailable();
  }
}

function unavailable(): WorkspaceResult<never> {
  return { ok: false, error: { code: "unavailable", message: "Guest workspace storage is unavailable" } };
}

function resolveDependencies(dependencies: BrowserGuestDependencies): WorkspaceDependencies {
  return {
    now: dependencies.now ?? (() => Date.now()),
    nextId: dependencies.nextId ?? randomGuestId
  };
}

function randomGuestId(): string {
  const id = globalThis.crypto?.randomUUID?.();
  return id ? `guest-${id}` : "";
}
