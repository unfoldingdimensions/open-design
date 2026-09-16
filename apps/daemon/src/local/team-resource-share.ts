// Local replacement for the deleted team-resource share service. CapyDesign has
// no Cloud sharing plane, so nothing is ever shared and no authority can be
// unavailable for it. The interface shapes are preserved so surviving local
// routes (design-system / plugin / skill copy paths) keep compiling.
import type {
  WorkspaceCollabContext,
  WorkspaceDirectoryItem,
} from '@capydesign/contracts';
import type { ResourceHubPrincipal } from './resource-principal.js';

export class TeamResourceShareForbiddenError extends Error {
  constructor() {
    super('workspace_resource_share_denied');
    this.name = 'TeamResourceShareForbiddenError';
  }
}

export class TeamResourceAuthorityUnavailableError extends Error {
  readonly status = 503;
  readonly code = 'WORKSPACE_RESOURCE_AUTHORITY_UNAVAILABLE';
  readonly retryable = true;

  constructor(cause?: unknown) {
    super('team resource authority is temporarily unavailable', { cause });
    this.name = 'TeamResourceAuthorityUnavailableError';
  }
}

export interface TeamResourceShareRecord {
  id: string;
  hubResourceId?: string;
  title?: string;
  description?: string;
  ownerMemberId?: string;
  canUnshare?: boolean;
  versionId?: string;
  version?: number;
}

export interface TeamResourceRequestScope {
  principal: ResourceHubPrincipal;
  canShare: boolean;
}

export function teamResourceRequestScopeFromContext(
  _context: WorkspaceCollabContext,
): TeamResourceRequestScope | null {
  return null;
}

export function teamResourceRequestScopeForWorkspaceId(
  _items: WorkspaceDirectoryItem[],
  _workspaceId: string,
): TeamResourceRequestScope | null {
  return null;
}

export interface TeamResourceShareService {
  share(
    resourceId: string,
    scope: TeamResourceRequestScope,
  ): Promise<{ version: number } | null>;
  unshare(resourceId: string, scope: TeamResourceRequestScope): Promise<boolean>;
  sharedIds(scope: TeamResourceRequestScope): Promise<string[]>;
  sharedResources(
    scope: TeamResourceRequestScope,
    options?: TeamResourceSharedReadOptions,
  ): Promise<TeamResourceShareRecord[]>;
  isShared(resourceId: string, scope: TeamResourceRequestScope): boolean;
  readonly configured: boolean;
}

export interface TeamResourceSharedReadOptions {
  authoritative?: boolean;
}

export interface CreateTeamResourceShareOptions {
  kind: string;
  idPrefix: string;
  resolveDir: (resourceId: string) => string | Promise<string>;
  describeResource?: (resourceId: string) => Record<string, unknown> | null | Promise<Record<string, unknown> | null>;
}

const LOCAL_SHARE_SERVICE: TeamResourceShareService = {
  async share() {
    return null;
  },
  async unshare() {
    return false;
  },
  async sharedIds() {
    return [];
  },
  async sharedResources() {
    return [];
  },
  isShared() {
    return false;
  },
  configured: false,
};

export function createTeamResourceShareService(
  _options?: CreateTeamResourceShareOptions,
): TeamResourceShareService {
  return LOCAL_SHARE_SERVICE;
}

export function unshareIfCurrentlyShared(_resourceId: string): Promise<void> | void {
  // No Cloud sharing exists locally.
}

export function parseSharedResourceIds(_input: unknown): string[] {
  return [];
}

export function parseSharedResourceRecords(_input: unknown): TeamResourceShareRecord[] {
  return [];
}
