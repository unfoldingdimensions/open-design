// Local replacement for the deleted automation workspace-scope binder.
// CapyDesign automations are local: their projects are never bound to a
// workspace, so nothing is persisted and no scope error can be raised.

export interface PersistedAutomationWorkspaceScope {
  workspaceId: string;
  workspaceMemberId: string;
}

export class AutomationWorkspaceScopeError extends Error {
  constructor(
    readonly code: 'WORKSPACE_ACCESS_DENIED',
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'AutomationWorkspaceScopeError';
  }
}

/** Local automations carry no persisted workspace scope. */
export function normalizePersistedAutomationWorkspaceScope(
  _value: unknown,
): PersistedAutomationWorkspaceScope | null {
  return null;
}

/** No-op: local automation projects have no workspace binding row. */
export function bindProjectToPersistedAutomationWorkspace(
  _ensureWorkspaceProject: (input: unknown) => unknown,
  _scope: PersistedAutomationWorkspaceScope | null,
  _projectId: string,
  _now: number,
): void {
  // Local-only: nothing to bind.
}
