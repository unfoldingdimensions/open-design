// Local (no-scope) project data-plane authority.
//
// CapyDesign has no workspace identity and no sign-in: every project lives in
// the single implicit local scope owned by the local user. There is nothing to
// scope a request to, so the data-plane authority is unconditionally granted.
// `x-od-workspace-*` headers are still accepted (and ignored).
import type { Response } from 'express';

export type AuthorizeProjectRequestOptions =
  | {
      mode: 'read';
      /** EventSource, iframe, and direct asset navigation cannot set headers. */
      allowNavigationQuery?: boolean;
    }
  | {
      mode: 'write';
      capability: string;
    };

export type AuthorizeProjectRequest = (
  req: any,
  res: Response,
  projectId: string,
  options: AuthorizeProjectRequestOptions,
) => Promise<boolean>;

export type AuthorizedProjectToolRequest = {
  readonly workspace: {
    readonly workspaceId: string;
    readonly workspaceMemberId: string;
  } | null;
};

export type AuthorizeProjectToolRequest = (
  res: Response,
  projectId: string,
  options: AuthorizeProjectRequestOptions,
) => Promise<AuthorizedProjectToolRequest | null>;

export async function enforceLocalProjectDataPlaneRequest(_input: {
  req: any;
  projectId: string;
  options: AuthorizeProjectRequestOptions;
  db: unknown;
  getWorkspaceProject: (db: unknown, workspaceId: string, projectId: string) => unknown;
  getWorkspaceProjectByProjectId: (db: unknown, projectId: string) => unknown;
  onDenied?: (
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) => unknown;
}): Promise<boolean> {
  return true;
}

/**
 * Build the single local project data-plane authority used by route modules.
 *
 * Every project is local and single-user, so the authority always grants.
 * It never returns `WORKSPACE_CONTEXT_REQUIRED` (that code no longer exists in
 * the daemon).
 */
export function createAuthorizeProjectRequest(_deps?: {
  db?: unknown;
  getWorkspaceProject?: (
    db: unknown,
    workspaceId: string,
    projectId: string,
  ) => unknown;
  getWorkspaceProjectByProjectId?: (
    db: unknown,
    projectId: string,
  ) => unknown;
  verifyWorkspaceReadAuthority?: unknown;
  resolveWorkspaceReadAuthority?: unknown;
  verifyWorkspaceRequestAuthority?: unknown;
  isProjectRevoked?: (db: unknown, projectId: string) => boolean;
  isProjectUnmaterializedPlaceholder?: (db: unknown, projectId: string) => boolean;
  sendApiError?: (
    res: Response,
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) => unknown;
}): AuthorizeProjectRequest {
  return async () => true;
}
