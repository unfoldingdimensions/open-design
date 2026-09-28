/**
 * Types that used to live in the removed Cloud / collaboration modules but are
 * still referenced by local UI state and tests.
 *
 * CapyDesign has no workspace identity layer, so these describe *local* scope
 * resolution: a project surface resolves to "unbound" (one implicit local
 * scope), and a run retry continuation is plain local run state.
 */
import type { AgentModelOption } from '@capydesign/contracts';
import type { ProjectWorkspaceScope, WorkspaceCollabContext } from './collab-contract';

/**
 * Whether a project is currently shared into the team. CapyDesign has no
 * workspace identity layer, so nothing is ever shared.
 */
export type SharedProjectPredicate = (projectId: string) => boolean;

/**
 * Authority a resource read resolved to. CapyDesign is single-scope, so reads are
 * either local or still pending; `workspace`/`denied` are retained because
 * surviving call sites still branch on them.
 */
export type ProjectResourceAuthority = 'local' | 'workspace' | 'pending' | 'denied';

/**
 * Workspace-context resolution state for a surface. Local-only builds are
 * context-less, so `context` is always null and nothing is ever loading.
 */
export interface WorkspaceContextState {
  context: WorkspaceCollabContext | null;
  loading: boolean;
  identityChangePending?: boolean;
  failure?: 'unsupported' | 'unavailable' | 'reauth-required';
}

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
/**
 * Witness that a retry continuation was adopted by the personal scope. Local
 * builds never adopt one, so the shape stays open.
 */
export type AmrAuthRetryPersonalAdoptionWitness = Record<string, unknown>;

export interface AmrAuthRetryContinuation {
  projectId: string;
  conversationId: string;
  assistantId: string;
  workspaceIdentityKey: string;
  originMountId: string;
  accountIdAtArm: string | null;
  createdAtMs: number;
}

// ---------------------------------------------------------------------------
// Stand-ins for the removed Cloud / AMR schema modules
//
// These names used to be exported by contracts modules that went with the Cloud
// surface (`analytics/events/amr-auth`, the workspace invalidation schema, the
// collaboration SSE payloads). Surviving call sites still annotate local UI
// state with them, so they are declared here rather than deleted — the shapes
// stay deliberately open because nothing cross-process consumes them any more.
// ---------------------------------------------------------------------------

/** AMR sign-in session state as the local vela-status projection reports it. */
export type AmrSessionState = string;

/** Network route an AMR sign-in attempt took. */
export type AmrAuthNetworkPath = string;

/** One step of an AMR sign-in attempt. */
export type AmrAuthStage = string;

/** Outcome of one AMR sign-in step. */
export type AmrAuthStageResult = string;

/** Where an AMR sign-in step's signal came from. */
export type AmrAuthStageSource = string;

/** Error kind reported by an AMR sign-in step. */
export type AmrAuthErrorKind = string;

/** A signed-in AMR profile as the wallet projection reports it. */
export interface AmrWalletSnapshotUser {
  [key: string]: unknown;
}

/** AMR wallet projection. No wallet exists locally, so the status stays inert. */
export interface AmrWalletSnapshot {
  status: string;
  profile?: string;
  user?: AmrWalletSnapshotUser | null;
  balanceUsd?: string | null;
  updatedAt?: string | null;
  fetchedAt?: string;
  stale?: boolean;
  source?: string;
  error?: { code: string; message: string };
}

/** A comment was added / edited / status-changed / deleted for this project. */
export interface CommentChangedSsePayload {
  type: 'comment-changed';
  projectId: string;
  at?: number;
}

/** A member joined / left this project's presence set. */
export interface PresenceChangedSsePayload {
  type: 'presence-changed';
  projectId: string;
  at?: number;
}

/** The project's name / settings / share metadata changed. */
export interface ProjectMetadataChangedSsePayload {
  type: 'project-metadata-changed';
  projectId: string;
  at?: number;
}

/**
 * Project-scoped thin collaboration invalidations. Kept as three separate arms
 * (not one merged shape) because the consumer narrows on the discriminant.
 */
export type CollabProjectInvalidationSsePayload =
  | CommentChangedSsePayload
  | PresenceChangedSsePayload
  | ProjectMetadataChangedSsePayload;

/** Thin invalidation for daemon-local inbound project content. */
export interface ProjectContentTransferStateSsePayload {
  type: 'project-content-transfer-state';
  projectId: string;
  at?: number;
}

/** A project was shared / unshared / created / deleted in the team. */
export interface TeamProjectsChangedSsePayload {
  type: 'team-projects-changed';
  projectId?: string;
  kind?: 'catalog' | 'metadata';
  at?: number;
}

/**
 * Workspace-scoped invalidation frames. Nothing is ever published locally, so
 * only the arm the consumer narrows on is retained.
 */
export type WorkspaceInvalidationSsePayload = TeamProjectsChangedSsePayload;

/**
 * AMR (vela) model-catalogue response. The endpoint that served it is gone with
 * the Cloud surface, so the local fetch path always resolves to null; the shape
 * is kept so the surviving call sites stay type-safe.
 */
export type AmrModelsSource = 'preset' | 'remote';

export interface AmrModelsResponse {
  source: AmrModelsSource;
  models: AgentModelOption[];
  refreshing: boolean;
  stale?: boolean;
  remoteError?: string;
}
