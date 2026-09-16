// Local no-op compatibility layer.
//
// CapyDesign has no Open Design Cloud surface. Every symbol here used to live
// in a Cloud module (the `collab/**` collaboration/workspace layer, the remote
// sign-in/billing/model-provider integrations, the hosted feeds, and the
// telemetry relay). Each is reduced to its local, destination-less behaviour:
// nothing is published, pulled, mirrored, shared, billed, signed in, or sent
// anywhere. No workspace identity exists, so every authority-shaped answer is
// "nothing to scope" rather than a denial.
//
// Consumers keep their historical call-site shapes; this module is the single
// seam they import from.
import path from 'node:path';
import crypto from 'node:crypto';
import type { ProjectSyncState } from '@capydesign/contracts';
import { readCurrentAppVersionInfo, type AppVersionInfo } from '../app-version.js';
import {
  createAnalyticsService,
  newInsertId,
  readAnalyticsContext,
  readRunTelemetrySinkConfig,
  readTaskTelemetrySinkConfig,
  type AnalyticsContext,
  type AnalyticsService,
} from './telemetry-sink.js';
import type { ResourceHubPrincipal } from './resource-principal.js';

export { newInsertId, readAnalyticsContext, readRunTelemetrySinkConfig, readTaskTelemetrySinkConfig };
export type { AnalyticsContext, AnalyticsService };

// ---------------------------------------------------------------------------
// Runtime agent definition (the remote model-provider runtime is gone)
// ---------------------------------------------------------------------------

/** No remote model-provider runtime exists in a CapyDesign build. */
export const amrAgentDef: any = null;

// ---------------------------------------------------------------------------
// Team project materialization / mirror
// ---------------------------------------------------------------------------

export function getTeamProjectMaterialization(..._args: unknown[]): null {
  return null;
}

export function latestTeamProjectMaterializationVersion(..._args: unknown[]): null {
  return null;
}

export function teamProjectMaterializationMatches(..._args: unknown[]): boolean {
  return false;
}

export function teamProjectMaterializationSupersedes(..._args: unknown[]): boolean {
  return false;
}

export async function materializePulledTeamMirror(..._args: unknown[]): Promise<null> {
  return null;
}

export async function recoverAuthorizedTeamProjectPromotions(
  _options?: Record<string, unknown>,
): Promise<void> {
  // Nothing is ever promoted locally.
}

export function recoverPersistedTeamShareOwnership(..._args: unknown[]): void {
  // No persisted team shares exist locally.
}

export function resolveProjectShareDir(projectsRoot: string, projectId: string): string {
  return path.join(projectsRoot, projectId);
}

export function isUnmaterializedSharedPlaceholder(..._args: unknown[]): boolean {
  return false;
}

export const SHARED_PROJECT_PLACEHOLDER_METADATA_KEY = 'od.sharedProjectPlaceholder';

// ---------------------------------------------------------------------------
// Run failure classification helpers
// ---------------------------------------------------------------------------

export function accountFailureDetails(_failure: unknown): Record<string, unknown> {
  return {};
}

export function classifyAccountFailureSignal(..._args: unknown[]): null {
  return null;
}

export function classifyAccountFailure(..._args: unknown[]): any {
  return null;
}

export function reportsPlatformProviderCredentialFault(..._args: unknown[]): boolean {
  return false;
}

// ---------------------------------------------------------------------------
// Model catalogue
// ---------------------------------------------------------------------------

export const modelLoadingCache = {
  async get(): Promise<{ models: unknown[] }> {
    return { models: [] };
  },
  invalidate(..._args: unknown[]): void {
    // Nothing is cached locally.
  },
  clear(..._args: unknown[]): void {
    // Nothing is cached locally.
  },
  resetForTests(): void {
    // Nothing is cached locally.
  },
};

export function fetchPresetModels(..._args: unknown[]): Promise<unknown[]> {
  return Promise.resolve([]);
}

export function fetchRemoteModelsWithRetry(..._args: unknown[]): Promise<unknown[]> {
  return Promise.resolve([]);
}

export async function resolveModelProbe(_options?: Record<string, unknown>): Promise<{
  cacheKey: string;
  launchPath: string | null;
  env: Record<string, string | undefined>;
}> {
  return { cacheKey: 'local', launchPath: null, env: {} };
}

export function buildModelCacheKey(...args: unknown[]): string {
  return `local:${args.length}`;
}

// ---------------------------------------------------------------------------
// Attachment staging / stderr visibility
// ---------------------------------------------------------------------------

export async function stageImagePaths(
  _cwd: string,
  images: string[],
  _uploadDir?: string,
): Promise<string[]> {
  return images;
}

export function createStderrVisibilityFilter(_agentId?: unknown): {
  write(chunk: unknown): unknown;
  flush(): unknown;
} {
  return {
    write: (chunk) => chunk,
    flush: () => undefined,
  };
}

// ---------------------------------------------------------------------------
// Terminal report outbox
// ---------------------------------------------------------------------------

export interface TerminalReportOutboxDiagnostics {
  pending: number;
  delivered: number;
  unsupported: number;
  terminalFailed: number;
  oldestPendingAgeMs: number;
}

export interface TerminalReportOutboxStore {
  enqueue(...args: unknown[]): void;
  diagnostics(): TerminalReportOutboxDiagnostics;
  stop(): void;
}

export function createTerminalReportOutboxStore(..._args: unknown[]): TerminalReportOutboxStore {
  return {
    enqueue: () => undefined,
    diagnostics: () => ({
      pending: 0,
      delivered: 0,
      unsupported: 0,
      terminalFailed: 0,
      oldestPendingAgeMs: 0,
    }),
    stop: () => undefined,
  };
}

export interface TerminalReportDeliveryService {
  start(): void;
  stop(): void;
}

export function createTerminalReportDeliveryService(
  _options?: Record<string, unknown>,
): TerminalReportDeliveryService {
  return { start: () => undefined, stop: () => undefined };
}

export function createTerminalReportFinalizer(..._args: unknown[]): (...args: unknown[]) => void {
  return () => undefined;
}

export function startTerminalReportDeliveryAfterBind(
  _service: TerminalReportDeliveryService,
  _port?: number,
): void {
  // No remote delivery exists locally.
}

// ---------------------------------------------------------------------------
// Removed route registrars (kept as inert callables for legacy call sites)
// ---------------------------------------------------------------------------

function removedRouteRegistrar(..._args: unknown[]): Record<string, never> {
  return {};
}

// Distinct names per removed Cloud route family: each used to register a route
// group that no longer exists. They are inert callables so legacy wiring keeps
// executing without mounting anything.
export const registerRemovedAttributionRoutes = removedRouteRegistrar;
export const registerRemovedIntegrationRoutes = removedRouteRegistrar;
export const registerRemovedMetadataRoutes = removedRouteRegistrar;
export const registerRemovedFeedRoutes = removedRouteRegistrar;
/**
 * Presence wiring kept for call-shape compatibility. Nothing is tracked locally,
 * but callers still hand the returned object around as a cache-invalidation
 * handle, so the members must exist.
 */
function removedPresenceRegistrar(..._args: unknown[]): {
  invalidatePresence: (_projectId?: string) => void;
  markPresenceStale: (_projectId?: string) => void;
} {
  return { invalidatePresence: () => {}, markPresenceStale: () => {} };
}

/**
 * Sync wiring kept for call-shape compatibility. There is no remote to pull
 * from, so a pull always reports the terminal 'pulled' state.
 */
function removedSyncRegistrar(..._args: unknown[]): {
  pullSharedProject: (..._args: unknown[]) => Promise<{ status: 'pulled'; version: null }>;
} {
  return { pullSharedProject: async () => ({ status: 'pulled' as const, version: null }) };
}

export const registerRemovedPresenceRoutes = removedPresenceRegistrar;
export const registerRemovedSyncRoutes = removedSyncRegistrar;
export const registerRemovedContextRoutes = removedRouteRegistrar;
export const registerRemovedResourceRoutes = removedRouteRegistrar;
export const registerRemovedResourceShareRoutes = removedRouteRegistrar;

export function createCollabPresenceClient(..._args: unknown[]): null {
  return null;
}

export function emitWorkspaceEventToScope(..._args: unknown[]): boolean {
  return false;
}

export function emitWorkspaceEventToAllScopes(..._args: unknown[]): boolean {
  return false;
}

// ---------------------------------------------------------------------------
// Collaboration runtime
// ---------------------------------------------------------------------------

export interface LocalCollabRuntime {
  readonly workspaceContext: unknown;
  readonly teamResources: unknown;
  readonly scheduler: { notifyChanged: (...args: unknown[]) => void };
  rememberTeamShare(...args: unknown[]): void;
  requestTeamShare(...args: unknown[]): Promise<{ version: number } | null>;
  requestTeamUnshare(...args: unknown[]): Promise<boolean>;
  refreshTeamProjectMetadata(...args: unknown[]): Promise<void>;
  publishedHead(...args: unknown[]): Promise<null>;
  stop(): void;
}

export function createLocalCollabRuntime(_options?: Record<string, unknown>): LocalCollabRuntime {
  return {
    workspaceContext: null,
    teamResources: null,
    scheduler: { notifyChanged: () => undefined },
    rememberTeamShare: () => undefined,
    requestTeamShare: async () => null,
    requestTeamUnshare: async () => false,
    refreshTeamProjectMetadata: async () => undefined,
    publishedHead: async () => null,
    stop: () => undefined,
  };
}

export function createSqlitePublicFilePublicationStore(..._args: unknown[]): null {
  return null;
}

export function createCollabPublishWatcher(..._args: unknown[]): {
  start(): void;
  stop(): void;
  dispose(): void;
} {
  return { start: () => undefined, stop: () => undefined, dispose: () => undefined };
}

export function createLocalCollabClientFromEnv(..._args: unknown[]): null {
  return null;
}

export function createLocalCollabService(..._args: unknown[]): null {
  return null;
}

export function createCommentRelayOutboxStore(..._args: unknown[]): {
  enqueue(...args: unknown[]): Promise<void>;
  stop(): void;
} {
  return { enqueue: async () => undefined, stop: () => undefined };
}

export function commentRelayLocalBindingMatches(..._args: unknown[]): boolean {
  return false;
}

// ---------------------------------------------------------------------------
// Team project catalogue
// ---------------------------------------------------------------------------

export interface TeamProjectCatalogClient {
  list(principal: ResourceHubPrincipal): Promise<TeamProjectRecord[]>;
}

export interface TeamProjectRecordAccess {
  frozen?: boolean;
  canWriteSyncedFiles?: boolean;
  [key: string]: unknown;
}

export interface TeamProjectRecord {
  id: string;
  resourceId: string;
  displayName: string;
  ownerMemberId: string;
  access: TeamProjectRecordAccess;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  name?: string;
  syncState?: string;
  workspaceId?: string;
  [key: string]: unknown;
}

export function createTeamProjectsLister(_options?: Record<string, unknown>): {
  list(...args: unknown[]): Promise<unknown[]>;
  invalidate(...args: unknown[]): void;
} {
  return { list: async () => [], invalidate: () => undefined };
}

export function createLocalTeamProjectCatalog(..._args: unknown[]): null {
  return null;
}

export function createLocalTeamProjectCatalogClient(..._args: unknown[]): null {
  return null;
}

export function createScopedTeamProjectCatalogClientCache(..._args: unknown[]): null {
  return null;
}

export function projectResourceIdFor(_projectId: string, _principal?: unknown): string {
  return '';
}

export function createTeamProjectsChangeEmitter(..._args: unknown[]): {
  emit(...args: unknown[]): void;
  stop(): void;
} {
  return { emit: () => undefined, stop: () => undefined };
}

/** No remote sync state exists locally: every project is local-only. */
export function projectSyncStateFromRemote(_syncState: unknown): ProjectSyncState {
  return 'local_only' as ProjectSyncState;
}

// ---------------------------------------------------------------------------
// Sync caches / digests / snapshots
// ---------------------------------------------------------------------------

export function createPersistentSyncCache(..._args: unknown[]): {
  read(): Promise<null>;
  write(...args: unknown[]): Promise<void>;
  stop(): void;
} {
  return { read: async () => null, write: async () => undefined, stop: () => undefined };
}

export function createSyncDigestReader(..._args: unknown[]): {
  read(...args: unknown[]): Promise<null>;
} {
  return { read: async () => null };
}

export function createCollabSyncSnapshotStore(..._args: unknown[]): {
  read(...args: unknown[]): unknown;
  write(...args: unknown[]): void;
} {
  return { read: () => null, write: () => undefined };
}

export function parseMemberDirectorySnapshot(..._args: unknown[]): unknown[] {
  return [];
}

export function parseTeamProjectSnapshot(..._args: unknown[]): unknown[] {
  return [];
}

export function createSwrCache<T = unknown>(_options?: Record<string, unknown>): {
  get(): Promise<T | null>;
  read(): T | null;
  peek(): T | null;
  write(...args: unknown[]): void;
  set(...args: unknown[]): void;
  invalidate(...args: unknown[]): void;
  stop(): void;
} {
  return {
    get: async () => null,
    read: () => null,
    peek: () => null,
    write: () => undefined,
    set: () => undefined,
    invalidate: () => undefined,
    stop: () => undefined,
  };
}

export function createEventRefreshCoordinator(..._args: unknown[]): {
  markDirty(...args: unknown[]): void;
  flush(...args: unknown[]): Promise<void>;
  request(...args: unknown[]): Promise<void>;
  dispose(): void;
  stop(): void;
} {
  return {
    markDirty: () => undefined,
    flush: async () => undefined,
    request: async () => undefined,
    dispose: () => undefined,
    stop: () => undefined,
  };
}

export function createProjectContentTransferStateStore(..._args: unknown[]): {
  get(...args: unknown[]): null;
  set(...args: unknown[]): void;
  read(...args: unknown[]): null;
  begin(...args: unknown[]): void;
  finish(...args: unknown[]): void;
} {
  return {
    get: () => null,
    set: () => undefined,
    read: () => null,
    begin: () => undefined,
    finish: () => undefined,
  };
}

// ---------------------------------------------------------------------------
// Concurrency / pull batching / team resources
// ---------------------------------------------------------------------------

export const COLLAB_FANOUT_CONCURRENCY = 1;

export class ConcurrencyGate {
  constructor(_limit?: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    return task();
  }

  get active(): number {
    return 0;
  }
}

export function createResourcePullBatcher(..._args: unknown[]): {
  enqueue(...args: unknown[]): Promise<null>;
  pull(...args: unknown[]): Promise<null>;
  stop(): void;
} {
  return { enqueue: async () => null, pull: async () => null, stop: () => undefined };
}

export interface RememberedTeamResourceScopeLease {
  release(): void;
}

export function createRememberedTeamResourceScopes(): {
  remember(...args: unknown[]): void;
  lease(...args: unknown[]): RememberedTeamResourceScopeLease | null;
  forget(...args: unknown[]): void;
  clear(): void;
  activeWorkspaceLeases(...args: unknown[]): unknown[];
  isLeaseCurrent(...args: unknown[]): boolean;
} {
  return {
    remember: () => undefined,
    lease: () => null,
    forget: () => undefined,
    clear: () => undefined,
    activeWorkspaceLeases: () => [],
    isLeaseCurrent: () => false,
  };
}

export function createTeamResourceListCache(..._args: unknown[]): {
  get(...args: unknown[]): Promise<unknown[]>;
  invalidate(...args: unknown[]): void;
} {
  return { get: async () => [], invalidate: () => undefined };
}

export function invalidateTeamResourceListingCaches(..._args: unknown[]): void {
  // No team resource listings exist locally.
}

export function createTeamResourceVersionStore(..._args: unknown[]): {
  read(...args: unknown[]): unknown;
  write(...args: unknown[]): void;
  get(...args: unknown[]): unknown;
  set(...args: unknown[]): Promise<void>;
} {
  return {
    read: () => null,
    write: () => undefined,
    get: () => null,
    set: async () => undefined,
  };
}

export function teamResourceWorkspaceRoot(projectsRoot: string, ..._rest: unknown[]): string {
  return path.join(projectsRoot);
}

export function teamResourceMaterializationDir(..._args: unknown[]): string {
  return '';
}

export async function materializeWorkspaceScopedTeamResource(
  ..._args: unknown[]
): Promise<any> {
  return { ok: false, reason: 'team_resources_removed' };
}

// ---------------------------------------------------------------------------
// Workspace context / authority caches
// ---------------------------------------------------------------------------

export function createActiveWorkspaceSelectionStore(..._args: unknown[]): {
  get(): null;
  replaceIf(...args: unknown[]): boolean;
  clear(): void;
} {
  return { get: () => null, replaceIf: () => false, clear: () => undefined };
}

export function withLastKnownWorkspaceContext<T = unknown>(provider?: T): T | undefined {
  return provider;
}

export async function verifyWorkspaceRequestContext(
  ..._args: unknown[]
): Promise<{ ok: true; context: null }> {
  return { ok: true, context: null };
}

export function createWorkspaceExactAuthorityCache(..._args: unknown[]): {
  identity(...args: unknown[]): Promise<null>;
  cached(...args: unknown[]): Promise<null>;
  observe(...args: unknown[]): void;
  invalidate(...args: unknown[]): void;
  resetIdentity(...args: unknown[]): void;
  setRealtimeHealthy(...args: unknown[]): void;
  stop(): void;
} {
  return {
    identity: async () => null,
    cached: async () => null,
    observe: () => undefined,
    invalidate: () => undefined,
    resetIdentity: () => undefined,
    setRealtimeHealthy: () => undefined,
    stop: () => undefined,
  };
}

export function createWorkspaceExactContextCache(..._args: unknown[]): {
  provider: unknown;
  get(...args: unknown[]): Promise<null>;
  cached(...args: unknown[]): Promise<null>;
  refresh(...args: unknown[]): Promise<null>;
  invalidate(...args: unknown[]): void;
  resetIdentity(...args: unknown[]): void;
  setRealtimeHealthy(...args: unknown[]): void;
  stop(): void;
} {
  return {
    provider: null,
    get: async () => null,
    cached: async () => null,
    refresh: async () => null,
    invalidate: () => undefined,
    resetIdentity: () => undefined,
    setRealtimeHealthy: () => undefined,
    stop: () => undefined,
  };
}

// ---------------------------------------------------------------------------
// Hub / presence / invalidation plumbing
// ---------------------------------------------------------------------------

export const WORKSPACE_DIRECTORY_EVENTS_CAPABILITY = 'workspace-directory-events';
export const AUTHORITATIVE_PROJECT_PRESENCE_CAPABILITY = 'authoritative-project-presence';

export function startHubEventsSubscriber(..._args: unknown[]): { stop(): void } {
  return { stop: () => undefined };
}

export interface WorkspaceHubSubscriptionManager {
  ensureSubscribed(...args: unknown[]): void;
  release(...args: unknown[]): void;
  refreshEndpoints(): void;
  setBillingInterests(...args: unknown[]): void;
  retainEventInterest(...args: unknown[]): void;
  activeWorkspaceIds(): string[];
  dispose(): void;
  stop(): void;
}

export function createWorkspaceHubSubscriptionManager(
  ..._args: unknown[]
): WorkspaceHubSubscriptionManager {
  return {
    ensureSubscribed: () => undefined,
    release: () => undefined,
    refreshEndpoints: () => undefined,
    setBillingInterests: () => undefined,
    retainEventInterest: () => undefined,
    activeWorkspaceIds: () => [],
    dispose: () => undefined,
    stop: () => undefined,
  };
}

export interface ProactiveContentPullTarget {
  workspaceId?: string;
  projectId?: string;
  resourceId?: string;
}

export function createProactiveContentPull(..._args: unknown[]): {
  request(...args: unknown[]): Promise<void>;
  observeMaterialized(...args: unknown[]): void;
  advanceRecoveryFloor(...args: unknown[]): void;
  catchUpPublishedHeads(...args: unknown[]): Promise<void>;
  materializeMissingProjects(...args: unknown[]): Promise<void>;
  handleContentChanged(...args: unknown[]): Promise<void>;
  dispose(): void;
  stop(): void;
} {
  return {
    request: async () => undefined,
    observeMaterialized: () => undefined,
    advanceRecoveryFloor: () => undefined,
    catchUpPublishedHeads: async () => undefined,
    materializeMissingProjects: async () => undefined,
    handleContentChanged: async () => undefined,
    dispose: () => undefined,
    stop: () => undefined,
  };
}

export function activeTeamWorkspaceIdentity(..._args: unknown[]): null {
  return null;
}

export function createWorkspaceInvalidationPoller(..._args: unknown[]): {
  poll(...args: unknown[]): Promise<void>;
  stop(): void;
} {
  return { poll: async () => undefined, stop: () => undefined };
}

export function backgroundPullMaxEntriesFromEnv(..._args: unknown[]): number {
  return 0;
}

export function backgroundPullMaxCumulativeEntriesFromEnv(..._args: unknown[]): number {
  return 0;
}

export function createBackgroundPullSizeGuard(..._args: unknown[]): {
  allow(...args: unknown[]): boolean;
  assess(...args: unknown[]): boolean;
  volume(...args: unknown[]): number;
  reset(...args: unknown[]): void;
  stop(): void;
} {
  return {
    allow: () => false,
    assess: () => false,
    volume: () => 0,
    reset: () => undefined,
    stop: () => undefined,
  };
}

export function inspectAuthorizedTeamProjectPull(..._args: unknown[]): null {
  return null;
}

export function emitSharedProjectPullTiming(..._args: unknown[]): void {
  // No shared pull timing exists locally.
}

export function sharedProjectPullProfileEnabled(..._args: unknown[]): boolean {
  return false;
}

// ---------------------------------------------------------------------------
// Workspace reconcilers
// ---------------------------------------------------------------------------

export interface WorkspaceProjectsReconcilerDeps {
  [key: string]: unknown;
}

export interface LocalTeamProjectBinding {
  projectId?: string;
  workspaceId?: string;
}

export interface LocalTeamResourceBinding {
  resourceId?: string;
  workspaceId?: string;
  kind?: string;
}

export interface MaterializedTeamResourceRef {
  resourceId?: string;
  workspaceId?: string;
  kind?: string;
}

export type WorkspaceTeamResourceRefreshReason = string;

export async function reconcileWorkspaceProjectsWithRemote(..._args: unknown[]): Promise<void> {
  // Nothing is reconciled locally.
}

export async function reconcileWorkspaceProjectMetadataWithRemote(
  ..._args: unknown[]
): Promise<void> {
  // Nothing is reconciled locally.
}

export async function handleHubProjectMetadataChanged(..._args: unknown[]): Promise<void> {
  // No hub exists locally.
}

export async function handleHubTeamProjectsChanged(..._args: unknown[]): Promise<void> {
  // No hub exists locally.
}

export async function handlePolledWorkspaceInvalidation(..._args: unknown[]): Promise<void> {
  // No invalidation poll exists locally.
}

export function reconcilerRemoteTeamProjects(..._args: unknown[]): unknown[] {
  return [];
}

export function createWorkspaceTeamResourceEventCoordinator(..._args: unknown[]): {
  notify(...args: unknown[]): void;
  refresh(...args: unknown[]): Promise<void>;
  stop(): void;
} {
  return { notify: () => undefined, refresh: async () => undefined, stop: () => undefined };
}

export async function reconcileWorkspaceResourcesWithRemote(..._args: unknown[]): Promise<void> {
  // Nothing is reconciled locally.
}

export type TeamMirrorPullScope = string;

// ---------------------------------------------------------------------------
// Billing (no wallet, no plans, no checkout locally)
// ---------------------------------------------------------------------------

export class WorkspaceBillingAccessRevokedError extends Error {
  readonly status = 403;
  readonly code = 'WORKSPACE_BILLING_ACCESS_REVOKED';
  readonly retryable = false;

  constructor(message = 'workspace billing access is revoked') {
    super(message);
    this.name = 'WorkspaceBillingAccessRevokedError';
  }
}

export async function fetchBillingCatalog(..._args: unknown[]): Promise<null> {
  return null;
}

export async function fetchBillingSummary(..._args: unknown[]): Promise<null> {
  return null;
}

export async function fetchWorkspaceBillingProjection(..._args: unknown[]): Promise<null> {
  return null;
}

export async function fetchBillingCheckoutUrl(..._args: unknown[]): Promise<null> {
  return null;
}

export function isWorkspaceAuthorizationError(_error: unknown): boolean {
  return false;
}

export function createWorkspaceBillingRuntimeCoordinator(..._args: unknown[]): {
  start(): void;
  stop(): void;
  dispose(): void;
  revoke(...args: unknown[]): void;
  revokeWorkspace(...args: unknown[]): void;
  catchUp(...args: unknown[]): void;
  reconnect(...args: unknown[]): void;
  invalidate(...args: unknown[]): void;
  setRealtimeHealthy(...args: unknown[]): void;
  interestedKeys(): Array<{ workspaceId?: string }>;
} {
  return {
    start: () => undefined,
    stop: () => undefined,
    dispose: () => undefined,
    revoke: () => undefined,
    revokeWorkspace: () => undefined,
    catchUp: () => undefined,
    reconnect: () => undefined,
    invalidate: () => undefined,
    setRealtimeHealthy: () => undefined,
    interestedKeys: () => [],
  };
}

export function shouldEmitWorkspaceBillingRuntimeNudge(..._args: unknown[]): boolean {
  return false;
}

export function createAccountBillingSummaryCache(..._args: unknown[]): {
  read(...args: unknown[]): Promise<null>;
  invalidate(...args: unknown[]): void;
  stop(): void;
} {
  return { read: async () => null, invalidate: () => undefined, stop: () => undefined };
}

// ---------------------------------------------------------------------------
// Telemetry service (destination-less)
// ---------------------------------------------------------------------------

export interface LocalTelemetryService {
  resolveAppVersion(): Promise<AppVersionInfo | null>;
  getCachedAppVersion(): AppVersionInfo | null;
  analyticsService: AnalyticsService;
}

let cachedAppVersion: AppVersionInfo | null = null;

export function createLocalTelemetryService(_options?: Record<string, unknown>): LocalTelemetryService {
  const service: LocalTelemetryService = {
    resolveAppVersion: async () => {
      const info = await readCurrentAppVersionInfo().catch(() => null);
      cachedAppVersion = info;
      return info;
    },
    getCachedAppVersion: () => cachedAppVersion,
    analyticsService: createAnalyticsService({ dataDir: '' }),
  };
  return service;
}

export function createPublicMetadataService(): {
  read(...args: unknown[]): Promise<null>;
} {
  return { read: async () => null };
}

export function createWhatsNewFeedService(): {
  read(...args: unknown[]): Promise<null>;
  list(...args: unknown[]): Promise<unknown[]>;
} {
  return { read: async () => null, list: async () => [] };
}

export interface PluginShareTask {
  id: string;
  status: string;
  startedAt: number;
  [key: string]: unknown;
}

export function createPluginShareTaskStore(_options?: Record<string, unknown>): {
  createAndStart(projectId: string, input: Record<string, unknown>, folder?: unknown): PluginShareTask;
  get(taskId: string): PluginShareTask | null;
  snapshot(task: PluginShareTask, since?: unknown): PluginShareTask | null;
  stop(): void;
} {
  return {
    createAndStart: () => ({
      id: crypto.randomUUID(),
      // There is no hosted share destination in a CapyDesign build.
      status: 'unsupported',
      startedAt: Date.now(),
    }),
    get: () => null,
    snapshot: () => null,
    stop: () => undefined,
  };
}

// ---------------------------------------------------------------------------
// MCP workspace context (headerless local calls)
// ---------------------------------------------------------------------------

export interface McpWorkspaceContext {
  workspaceId: string;
  workspaceMemberId: string;
  headers: Record<string, string>;
}

export async function resolveMcpWorkspaceContext(
  _baseUrl?: string,
): Promise<McpWorkspaceContext | null> {
  return null;
}

export function _resetMcpWorkspaceContextCacheForTests(): void {
  // no cache to reset
}

// ---------------------------------------------------------------------------
// Misc leftovers
// ---------------------------------------------------------------------------

export function projectDeliverableSyntaxTelemetry(..._args: unknown[]): Record<string, unknown> {
  return {};
}

export function createCreatedProjectWorkspaceResolver(
  ..._args: unknown[]
): (req: unknown) => Promise<null> {
  return async () => null;
}

export function createAuthorizeProjectRequest(..._args: unknown[]): (() => Promise<boolean>) {
  return async () => true;
}

export function buildSafeRunQualityProjectionV1(..._args: unknown[]): any {
  return null;
}

export async function runResource(..._args: unknown[]): Promise<void> {
  // Resource-hub CLI is gone; nothing to run.
}

export async function runResourceCommand(..._args: unknown[]): Promise<void> {
  // Resource-hub CLI is gone; nothing to run.
}

/** No remote media transport exists locally. */
export class MediaTransportError extends Error {
  readonly code?: string;
  readonly status?: number;

  constructor(message = 'remote media transport is unavailable', details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'MediaTransportError';
    const code = details.code;
    if (typeof code === 'string') this.code = code;
    const status = details.status;
    if (typeof status === 'number') this.status = status;
  }
}

export function readSessionCredentialRevision(..._args: unknown[]): null {
  return null;
}

export { resolveWorkspaceScope } from './workspace-scope.js';
export type { WorkspaceScope } from './workspace-scope.js';

// Removed telemetry route group: inert registrar with the shape its legacy
// call site destructures. Nothing is recorded or delivered locally.
export function registerTelemetryRoutes(..._args: unknown[]): {
  disposeFatalHandlers(): void;
  getCachedAppVersion(): AppVersionInfo | null;
  resolveAppVersion(): Promise<AppVersionInfo | null>;
  reportFeedback(...args: unknown[]): Promise<void>;
  analyticsService: AnalyticsService;
} {
  return {
    disposeFatalHandlers: () => undefined,
    getCachedAppVersion: () => null,
    resolveAppVersion: async () => null,
    reportFeedback: async () => undefined,
    analyticsService: createAnalyticsService({ dataDir: '' }),
  };
}
