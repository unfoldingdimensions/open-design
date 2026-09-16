// Local replacement for the deleted created-project-workspace binder.
//
// CapyDesign creates local projects only: there is no workspace to bind them
// to, so creation never consults a directory, never gates, and never writes a
// workspace binding row. `x-od-workspace-*` headers are accepted and ignored.
import { sendApiError } from '../http/api-errors.js';
import type { ApiErrorResponse } from '@capydesign/contracts';
import type { Response } from 'express';
import {
  workspaceResourceContextFromRequest,
  type WorkspaceResourceContext,
} from './workspace-resource-mutation.js';
import type { WorkspaceDirectoryFetchResult } from './workspace-directory.js';

export type CreatedProjectWorkspaceResolution =
  | { ok: true; context: WorkspaceResourceContext | null }
  | {
      ok: false;
      status: 400 | 401 | 403 | 503;
      code: string;
      message: string;
      retryable?: true;
    };

export type CreatedProjectWorkspaceError = Extract<
  CreatedProjectWorkspaceResolution,
  { ok: false }
>;

export function sendCreatedProjectWorkspaceError(
  res: Response,
  error: CreatedProjectWorkspaceError,
): Response<ApiErrorResponse> {
  return sendApiError(
    res,
    error.status,
    error.code as Parameters<typeof sendApiError>[2],
    error.message,
    error.retryable ? { retryable: true } : {},
  );
}

/** Local creation never binds to a workspace. */
export function localProjectWorkspaceAttribution(
  _req: unknown,
): WorkspaceResourceContext | null {
  return null;
}

export async function authorizeCreatedProjectWorkspace(
  _req: unknown,
  _fetchWorkspaceDirectory?: () => Promise<WorkspaceDirectoryFetchResult>,
  _configuredEnv?: Record<string, string>,
): Promise<CreatedProjectWorkspaceResolution> {
  return { ok: true, context: null };
}

export class CreatedProjectWorkspaceResolutionError extends Error {
  readonly status: CreatedProjectWorkspaceError['status'];
  readonly code: CreatedProjectWorkspaceError['code'];
  readonly retryable?: true;

  constructor(error: CreatedProjectWorkspaceError) {
    super(error.message);
    this.name = 'CreatedProjectWorkspaceResolutionError';
    this.status = error.status;
    this.code = error.code;
    if (error.retryable) this.retryable = true;
  }
}

export async function createdProjectWorkspaceHome(
  req: unknown,
  fetchWorkspaceDirectory?: () => Promise<WorkspaceDirectoryFetchResult>,
  configuredEnv?: Record<string, string>,
): Promise<WorkspaceResourceContext | null> {
  const authorized = await authorizeCreatedProjectWorkspace(
    req,
    fetchWorkspaceDirectory,
    configuredEnv,
  );
  if (!authorized.ok) throw new CreatedProjectWorkspaceResolutionError(authorized);
  return authorized.context;
}

export type CreatedProjectWorkspaceResolver = (
  req: unknown,
) => Promise<WorkspaceResourceContext | null>;

export function createCreatedProjectWorkspaceResolver(_deps: {
  fetchWorkspaceDirectory?: () => Promise<WorkspaceDirectoryFetchResult>;
  configuredEnv?: () => Record<string, string>;
}): CreatedProjectWorkspaceResolver {
  return async () => null;
}

/** No-op: local projects have no workspace binding row. */
export function bindCreatedProjectToWorkspace(
  _ensureWorkspaceProject: (input: unknown) => unknown,
  _context: WorkspaceResourceContext | null,
  _projectId: string,
  _now: number,
): void {
  // Local-only: nothing to bind.
}

/** Parsed (and ignored) `x-od-workspace-*` attribution for logging only. */
export function readLocalWorkspaceAttribution(req: unknown): WorkspaceResourceContext | null {
  const context = workspaceResourceContextFromRequest(req);
  return context === null || context === 'missing' ? null : context;
}
