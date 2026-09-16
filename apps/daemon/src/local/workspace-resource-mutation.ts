// Local (no-scope) replacements for the deleted Cloud/workspace authority
// layer. CapyDesign has no workspace identity: projects and other local
// resources live in a single implicit local scope owned by the local user.
//
// These helpers keep the *call-site shapes* the surviving local routes already
// use (so local functionality keeps working untouched) while removing every
// authorization decision: there is no workspace to scope to, so nothing is
// ever denied. `x-od-workspace-*` headers are still parsed for compatibility
// (accept-and-ignore) but never influence an access decision.
import type { WorkspaceCollabContext } from '@capydesign/contracts';
import type { Response } from 'express';

export type WorkspaceResourceContext = {
  workspaceId: string;
  workspaceType: 'personal' | 'team';
  workspaceTypeAsserted: 'personal' | 'team' | null;
  appUserId: string;
  workspaceMemberId: string;
  role: 'owner' | 'admin' | 'member';
  memberStatus: 'active' | 'removed';
  lifecycleState: 'active' | 'billing_past_due' | 'locked' | 'deleting' | 'deleted';
  canShareProjects: boolean;
  canWriteSyncedFiles: boolean;
};

export type WorkspaceResourceMutationCapability =
  | 'rename'
  | 'delete'
  | 'duplicate'
  | 'writeFiles'
  | 'comment';

export type WorkspaceRequestAuthorityResult =
  | { ok: true; context: WorkspaceCollabContext }
  | {
      ok: false;
      status: 400 | 401 | 403 | 503;
      code: string;
      message: string;
      retryable?: true;
    };

export type VerifyWorkspaceRequestAuthority = (
  req: unknown,
) => Promise<WorkspaceRequestAuthorityResult>;

export type ResolveWorkspaceResourceReadAuthority = (
  resourceId: string,
) => Promise<WorkspaceRequestAuthorityResult>;

/**
 * Browser navigation transports (EventSource / iframe src) cannot attach
 * headers. Headers are accepted-and-ignored now, so a navigation scope is
 * simply the request itself.
 */
export function requestWithWorkspaceNavigationScope(req: any): any {
  return req;
}

export type OptionalWorkspaceRequestAuthorityResult =
  | { ok: true; context: WorkspaceCollabContext | null }
  | Exclude<WorkspaceRequestAuthorityResult, { ok: true }>;

/** No workspace identity exists locally, so there is never authority to resolve. */
export function resolveOptionalLocalWorkspaceRequestAuthority(
  _req: any,
): OptionalWorkspaceRequestAuthorityResult {
  return { ok: true, context: null };
}

export async function resolveOptionalWorkspaceRequestAuthority(
  _req: any,
  _verifyWorkspaceRequestAuthority?: VerifyWorkspaceRequestAuthority,
): Promise<OptionalWorkspaceRequestAuthorityResult> {
  return { ok: true, context: null };
}

export type WorkspaceMembershipSnapshot = {
  workspaceId: string;
  memberStatus: 'active' | 'removed';
};

export type GetLastKnownWorkspaceMembership = () => WorkspaceMembershipSnapshot | null;

export type AmbientWorkspaceSnapshot = {
  workspaceId: string;
  workspaceType: 'personal' | 'team';
  workspaceMemberId: string;
  role: WorkspaceResourceContext['role'];
  memberStatus: WorkspaceResourceContext['memberStatus'];
  lifecycleState: WorkspaceResourceContext['lifecycleState'];
  permissions: { canShareProjects: boolean; canWriteSyncedFiles: boolean };
};

export type GetAmbientWorkspace = () => AmbientWorkspaceSnapshot | null | undefined;

export function ambientWorkspaceResourceContext(
  _getAmbientWorkspace: GetAmbientWorkspace | undefined,
): WorkspaceResourceContext | null {
  return null;
}

export function withLastKnownMembership(
  ctx: WorkspaceResourceContext,
  _getLastKnownMembership: GetLastKnownWorkspaceMembership | undefined,
): WorkspaceResourceContext {
  return ctx;
}

export type WorkspaceResourceAccessInput = {
  workspaceId?: string | null;
  visibility?: string | null;
  resourceState?: string | null;
  createdByWorkspaceMemberId?: string | null;
  resourceHubResourceId?: string | null;
  syncState?: string | null;
};

export type WorkspaceMutationAuthorityLease = {
  verify: VerifyWorkspaceRequestAuthority;
  allow: (
    row: WorkspaceResourceAccessInput,
    context: WorkspaceCollabContext,
  ) => boolean;
};

export function headerValue(req: any, name: string): string | null {
  const value = req?.get?.(name);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function headerBool(req: any, name: string, fallback: boolean): boolean {
  const value = headerValue(req, name);
  if (value === null) return fallback;
  if (value === 'false') return false;
  if (value === 'true') return true;
  return fallback;
}

/** Parse the (now advisory) `x-od-workspace-*` headers off a request. */
export function workspaceResourceContext(req: any, workspaceId: string): WorkspaceResourceContext | null {
  const workspaceMemberId = headerValue(req, 'x-od-workspace-member-id');
  if (!workspaceMemberId) return localResourceContext(workspaceId);
  const workspaceTypeHeader = headerValue(req, 'x-od-workspace-type');
  const lifecycleState = headerValue(req, 'x-od-workspace-lifecycle-state') ?? 'active';
  const role = headerValue(req, 'x-od-workspace-role') ?? 'member';
  const legacyWriteEnabled = headerBool(req, 'x-od-workspace-write-enabled', true);
  const canWriteSyncedFiles = headerBool(req, 'x-od-workspace-can-write-synced-files', legacyWriteEnabled);
  return {
    workspaceId,
    workspaceType: workspaceTypeHeader === 'team' ? 'team' : 'personal',
    workspaceTypeAsserted:
      workspaceTypeHeader === 'team' || workspaceTypeHeader === 'personal' ? workspaceTypeHeader : null,
    appUserId: headerValue(req, 'x-od-app-user-id') ?? 'local-user',
    workspaceMemberId,
    role: role === 'owner' || role === 'admin' ? role : 'member',
    memberStatus: headerValue(req, 'x-od-workspace-member-status') === 'removed' ? 'removed' : 'active',
    lifecycleState: lifecycleState === 'billing_past_due' || lifecycleState === 'locked' || lifecycleState === 'deleting' || lifecycleState === 'deleted'
      ? lifecycleState
      : 'active',
    canShareProjects: headerBool(req, 'x-od-workspace-can-share-projects', canWriteSyncedFiles),
    canWriteSyncedFiles,
  };
}

/**
 * The single implicit local scope.
 *
 * CapyDesign has no workspace identity and no sign-in, so there is nothing to
 * resolve: every request already belongs to this one local scope, owned by the
 * local user. It is always present, always active, and every affordance is
 * available — which is why no caller can be refused for lacking a workspace.
 */
export function localResourceContext(workspaceId = 'local'): WorkspaceResourceContext {
  return {
    workspaceId,
    workspaceType: 'personal',
    workspaceTypeAsserted: null,
    appUserId: 'local-user',
    workspaceMemberId: 'local-user',
    role: 'owner',
    memberStatus: 'active',
    lifecycleState: 'active',
    canShareProjects: true,
    canWriteSyncedFiles: true,
  };
}

export function workspaceResourceContextFromRequest(req: any): WorkspaceResourceContext | 'missing' | null {
  const workspaceId = headerValue(req, 'x-od-workspace-id');
  const workspaceMemberId = headerValue(req, 'x-od-workspace-member-id');
  if (!workspaceId && !workspaceMemberId) return null;
  if (!workspaceId || !workspaceMemberId) return 'missing';
  return workspaceResourceContext(req, workspaceId) ?? 'missing';
}

export function workspaceResourceContextFromVerified(
  context: WorkspaceCollabContext,
): WorkspaceResourceContext {
  return {
    workspaceId: context.workspaceId,
    workspaceType: context.workspaceType,
    workspaceTypeAsserted: context.workspaceType,
    appUserId: '',
    workspaceMemberId: context.workspaceMemberId,
    role: context.role,
    memberStatus: context.memberStatus,
    lifecycleState: context.lifecycleState,
    canShareProjects: context.permissions.canShareProjects,
    canWriteSyncedFiles: context.permissions.canWriteSyncedFiles,
  };
}

export function isWorkspaceResourceLocked(_ctx: WorkspaceResourceContext): boolean {
  return false;
}

/**
 * Local access is unconditional: one implicit local scope, owned by the local
 * user, with every affordance (move, share, mutate) available.
 */
export function workspaceResourceAccess(
  _wp: WorkspaceResourceAccessInput,
  _ctx: WorkspaceResourceContext,
): {
  frozen: boolean;
  selfCreated: boolean;
  privileged: boolean;
  canMutate: boolean;
  unattributed: boolean;
  canShareLocal: boolean;
  disabledReason?: 'workspace_deleted' | 'workspace_locked' | 'permission_denied';
} {
  return {
    frozen: false,
    selfCreated: true,
    privileged: true,
    canMutate: true,
    unattributed: false,
    canShareLocal: true,
  };
}

export type BoundWorkspaceResourceMutationGate = (
  req: any,
  res: Response,
  sendApiError: (
    res: Response,
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) => unknown,
  getWorkspaceResource: (db: unknown, workspaceId: string, resourceId: string) => WorkspaceResourceAccessInput | null | undefined,
  getWorkspaceResourceByResourceId: (db: unknown, resourceId: string) => WorkspaceResourceAccessInput | null | undefined,
  db: unknown,
  resourceId: string,
  capability: WorkspaceResourceMutationCapability,
) => Promise<boolean>;

export function requestCanMutateWorkspaceResource(
  _req: any,
  _getWorkspaceResource: (db: unknown, workspaceId: string, resourceId: string) => WorkspaceResourceAccessInput | null | undefined,
  _db: unknown,
  _resourceId: string,
  _getLastKnownMembership?: GetLastKnownWorkspaceMembership,
): boolean {
  return true;
}

export async function requestCanMutateVerifiedWorkspaceResource(
  _req: any,
  _getWorkspaceResource: (db: unknown, workspaceId: string, resourceId: string) => WorkspaceResourceAccessInput | null | undefined,
  _getWorkspaceResourceByResourceId: (db: unknown, resourceId: string) => WorkspaceResourceAccessInput | null | undefined,
  _db: unknown,
  _resourceId: string,
  _verifyWorkspaceRequestAuthority: VerifyWorkspaceRequestAuthority | undefined,
): Promise<boolean> {
  return true;
}

export async function enforceVerifiedWorkspaceResourceMutation(
  _resourceType: string,
  _req: any,
  _res: Response,
  _sendApiError: (
    res: Response,
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) => unknown,
  _getWorkspaceResource: (db: unknown, workspaceId: string, resourceId: string) => WorkspaceResourceAccessInput | null | undefined,
  _getWorkspaceResourceByResourceId: (db: unknown, resourceId: string) => WorkspaceResourceAccessInput | null | undefined,
  _db: unknown,
  _resourceId: string,
  _capability: WorkspaceResourceMutationCapability,
  _verifyWorkspaceRequestAuthority: VerifyWorkspaceRequestAuthority | undefined,
  _options: { authorityLease?: WorkspaceMutationAuthorityLease } = {},
): Promise<boolean> {
  return true;
}

export async function enforceVerifiedWorkspaceResourceRead(
  _resourceType: string,
  _req: any,
  _res: Response,
  _sendApiError: (
    res: Response,
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) => unknown,
  _getWorkspaceResource: (db: unknown, workspaceId: string, resourceId: string) => WorkspaceResourceAccessInput | null | undefined,
  _getWorkspaceResourceByResourceId: (db: unknown, resourceId: string) => WorkspaceResourceAccessInput | null | undefined,
  _db: unknown,
  _resourceId: string,
  _verifyWorkspaceRequestAuthority: VerifyWorkspaceRequestAuthority | undefined,
  _options: {
    allowNavigationQuery?: boolean;
    resolveAuthority?: ResolveWorkspaceResourceReadAuthority;
  } = {},
): Promise<boolean> {
  return true;
}

export function enforceWorkspaceResourceMutation(
  _resourceType: string,
  _req: any,
  _res: Response,
  _sendApiError: (res: Response, status: number, code: string, message: string) => unknown,
  _getWorkspaceResource: (db: unknown, workspaceId: string, resourceId: string) => WorkspaceResourceAccessInput | null | undefined,
  _getWorkspaceResourceByResourceId: (db: unknown, resourceId: string) => WorkspaceResourceAccessInput | null | undefined,
  _db: unknown,
  _resourceId: string,
  _capability: WorkspaceResourceMutationCapability,
  _getLastKnownMembership?: GetLastKnownWorkspaceMembership,
  _getAmbientWorkspace?: GetAmbientWorkspace,
): boolean {
  return true;
}
