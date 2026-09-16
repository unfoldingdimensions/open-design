// Local replacement for the deleted Vela-backed workspace directory. CapyDesign
// has no Cloud workspace directory; the type survives only so local route
// signatures that still accept an optional directory fetcher keep compiling.
import type { WorkspaceDirectoryItem } from '@capydesign/contracts';

export type { WorkspaceDirectoryItem };

export interface WorkspaceDirectoryFetchResult {
  ok: boolean;
  items: WorkspaceDirectoryItem[];
  reason?: 'unauthorized' | 'upstream' | 'network';
  status?: number;
}

/** No Cloud directory exists locally: always a successful, empty directory. */
export async function fetchWorkspaceDirectory(): Promise<WorkspaceDirectoryFetchResult> {
  return { ok: true, items: [] };
}

/** Alias kept for the legacy provider wiring in server.ts. */
export async function fetchLocalWorkspaceDirectory(
  _options?: unknown,
): Promise<WorkspaceDirectoryFetchResult> {
  return { ok: true, items: [] };
}

export function mapWorkspaceDirectory(input: unknown): WorkspaceDirectoryItem[] {
  if (!input || typeof input !== 'object') return [];
  const items = (input as { items?: unknown }).items;
  return Array.isArray(items) ? (items as WorkspaceDirectoryItem[]) : [];
}

/** No Vela session exists locally, so there is no directory identity. */
export function workspaceDirectoryIdentity(..._args: unknown[]): string {
  return '';
}

/** No Cloud hub endpoint exists locally. */
export function resolveWorkspaceHubEventsEndpoint(..._args: unknown[]): string | null {
  return null;
}

/**
 * Build the (always-empty) local directory authority. Callers keep their
 * shapes; every read answers a successful empty directory so no caller blocks.
 */
export function createWorkspaceDirectoryAuthorityBroker(_options?: unknown): {
  cached: () => Promise<WorkspaceDirectoryFetchResult>;
  read: () => Promise<WorkspaceDirectoryFetchResult>;
  fresh: () => Promise<WorkspaceDirectoryFetchResult>;
  backgroundFresh: () => Promise<WorkspaceDirectoryFetchResult>;
  refreshAfterMutation: () => Promise<WorkspaceDirectoryFetchResult>;
  setRealtimeHealthy: (healthy: boolean) => void;
  resetIdentity: () => void;
  invalidate: (reason?: string) => void;
} {
  const empty: WorkspaceDirectoryFetchResult = { ok: true, items: [] };
  const read = async () => empty;
  return {
    cached: read,
    read,
    fresh: read,
    backgroundFresh: read,
    refreshAfterMutation: read,
    setRealtimeHealthy: () => {},
    resetIdentity: () => {},
    invalidate: () => {},
  };
}

/**
 * A directory item as the workspace context every local caller expects. There
 * is no Cloud membership, so the resolved role is the local owner.
 */
export function workspaceContextFromDirectoryItem(
  item: {
    workspaceId?: string | null;
    workspaceName?: string | null;
    workspaceType?: string | null;
    workspaceMemberId?: string | null;
    role?: string | null;
    memberStatus?: string | null;
    lifecycleState?: string | null;
  },
  _configuredEnv?: Record<string, string>,
): Record<string, unknown> {
  return {
    workspaceId: item?.workspaceId ?? 'local',
    workspaceName: item?.workspaceName ?? 'Local',
    workspaceType: item?.workspaceType === 'team' ? 'team' : 'personal',
    workspaceMemberId: item?.workspaceMemberId ?? 'local-user',
    role: item?.role ?? 'owner',
    memberStatus: item?.memberStatus ?? 'active',
    lifecycleState: item?.lifecycleState ?? 'active',
  };
}

/**
 * Legacy observation API retained for tests/dev tooling. Local mode has no
 * signed membership directory, so it resolves to the one implicit local scope.
 */
export function createWorkspaceContextProviderFromEnv(
  _env?: NodeJS.ProcessEnv,
  _options?: unknown,
): {
  current: () => Promise<unknown>;
  lastKnown: () => unknown;
  resolveCurrent: (req: unknown) => Promise<unknown>;
} {
  const local = {
    workspaceId: 'local',
    workspaceType: 'personal',
    workspaceMemberId: 'local-user',
    role: 'owner',
    memberStatus: 'active',
    lifecycleState: 'active',
  };
  return {
    current: async () => local,
    lastKnown: () => local,
    resolveCurrent: async () => local,
  };
}
