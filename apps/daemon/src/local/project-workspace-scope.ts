// Local replacement for the deleted project workspace-scope resolver.
//
// CapyDesign projects live in one implicit local scope: they are never bound to
// a workspace, so the browser/runtime scope is always `unbound`.
import type { ProjectWorkspaceScope, WorkspaceType } from './collab-contract.js';

interface ProjectWorkspaceBinding {
  workspaceId?: unknown;
  visibility?: unknown;
  workspaceVisibility?: unknown;
  resourceState?: unknown;
  createdByWorkspaceMemberId?: unknown;
}

export function resolveLocalProjectWorkspaceScope(input: {
  projectId: string;
  binding?: ProjectWorkspaceBinding | null | undefined;
  requestWorkspaceMemberId?: string | null;
  requestWorkspaceType?: WorkspaceType | null;
  knownWorkspaceType?: WorkspaceType | null;
  configuredEnv?: Record<string, string>;
}): ProjectWorkspaceScope {
  return {
    kind: 'unbound',
    projectId: input.projectId.trim(),
    workspaceId: null,
    context: null,
  };
}
