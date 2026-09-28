// Local replacement for the deleted workspace-authority health coordinator.
// There is no remote workspace authority to be healthy or unhealthy.
export type WorkspaceAuthorityCacheMode = 'legacy' | 'observe' | 'adaptive';

export function resolveWorkspaceAuthorityCacheMode(
  _input?: unknown,
): WorkspaceAuthorityCacheMode {
  return 'legacy';
}

export interface WorkspaceAuthorityHealthCoordinatorOptions {
  [key: string]: unknown;
}

export interface WorkspaceAuthorityHealthCoordinator {
  stop(): void;
}

export function createWorkspaceAuthorityHealthCoordinator(
  _options?: WorkspaceAuthorityHealthCoordinatorOptions,
): WorkspaceAuthorityHealthCoordinator {
  return {
    stop() {},
  };
}
