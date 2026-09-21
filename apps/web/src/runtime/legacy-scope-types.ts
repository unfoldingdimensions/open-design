/**
 * Types that used to live in the removed Cloud / collaboration modules but are
 * still referenced by local UI state and tests.
 *
 * CapyDesign has no workspace identity layer, so these describe *local* scope
 * resolution: a project surface resolves to "unbound" (one implicit local
 * scope), and a run retry continuation is plain local run state.
 */
import type { ProjectWorkspaceScope } from '@capydesign/contracts';

/**
 * Workspace-scope resolution state for a project surface. `scope` is null until
 * resolution settles; local-only builds settle on an unbound scope.
 */
export interface ProjectWorkspaceScopeState {
  loading: boolean;
  scope: ProjectWorkspaceScope | null;
  failure?: 'unsupported' | 'forbidden' | 'unavailable';
}

/**
 * What a run needs to resume itself after the user re-authorises the model
 * provider. Captured at the moment the run was armed so a retry can restore the
 * exact conversation, message and mount context.
 */
export interface AmrAuthRetryContinuation {
  projectId: string;
  conversationId: string;
  assistantId: string;
  workspaceIdentityKey: string;
  originMountId: string;
  accountIdAtArm: string | null;
  createdAtMs: number;
}
