// Local, destination-less telemetry surface.
//
// CapyDesign has no Cloud telemetry destination: there is no PostHog key, no
// hosted relay, and no Langfuse ingestion endpoint. The daemon still keeps its
// local delivery *state machine* (see `observability/delivery-state.ts`) so run
// bookkeeping is stable, but nothing is ever sent anywhere and no analytics
// service or sink config is ever produced.
//
// This module is the single local replacement for the deleted `analytics.ts`
// and the telemetry-sink half of `langfuse-trace.ts` / `langfuse-bridge.ts`.
import crypto from 'node:crypto';
import type { Request } from 'express';

export const HARD_BATCH_MAX_BYTES = 1024 * 1024;
export const INPUT_MAX_BYTES = 64 * 1024;

export interface AnalyticsContext {
  deviceId: string;
  sessionId: string;
  clientType: 'web' | 'desktop' | 'external_mcp';
  locale: string;
  requestId: string | null;
  entrySurface?: string;
  hostProduct?: string;
  externalPluginId?: string;
  externalPluginVersion?: string;
  distributionMechanism?: string;
  publisherClass?: string;
  attributionQuality?: string;
  mcpSessionId?: string;
}

/** No analytics destination exists locally, so there is never a context. */
export function readAnalyticsContext(_req: Request): AnalyticsContext | null {
  return null;
}

export interface AnalyticsEndpointConfig {
  key: string;
  host: string;
  env: string;
}

/** No PostHog (or any) analytics endpoint is configured locally. */
export function readAnalyticsEndpointConfig(
  ..._args: unknown[]
): AnalyticsEndpointConfig | null {
  return null;
}

export function readPublicConfigResponse(
  _env: NodeJS.ProcessEnv = process.env,
): { enabled: boolean; env: string; key: string | null; host: string | null } {
  return { enabled: false, env: 'local', key: null, host: null };
}

// Mirrors the surviving contract union (`TrackingRunPosthogErrorType`). Locally
// nothing is ever captured, so the only reachable member is 'not_configured'.
export type AnalyticsCaptureErrorType =
  | 'not_configured'
  | 'metrics_consent_disabled'
  | 'config_read_failed'
  | 'enqueue_failed';

export interface AnalyticsCaptureResult {
  status: 'queued' | 'not_expected' | 'failed';
  acknowledgement: 'local_buffer' | 'none';
  errorType: AnalyticsCaptureErrorType | null;
}

export function normalizeAnalyticsCaptureResult(value: unknown): AnalyticsCaptureResult {
  if (value && typeof value === 'object') {
    const candidate = value as Partial<AnalyticsCaptureResult>;
    if (
      (candidate.status === 'queued'
        || candidate.status === 'not_expected'
        || candidate.status === 'failed')
      && (candidate.acknowledgement === 'local_buffer'
        || candidate.acknowledgement === 'none')
    ) {
      return {
        status: candidate.status,
        acknowledgement: candidate.acknowledgement,
        errorType: candidate.errorType ?? null,
      };
    }
  }
  return { status: 'not_expected', acknowledgement: 'none', errorType: 'not_configured' };
}

export interface AnalyticsService {
  capture(args: {
    eventName: string;
    context: AnalyticsContext;
    appVersion: string;
    properties: Record<string, unknown>;
    insertId: string;
  }): Promise<AnalyticsCaptureResult>;
  captureSafety(args: {
    eventName: string;
    distinctId?: string;
    appVersion: string;
    properties: Record<string, unknown>;
    insertId?: string;
  }): Promise<void>;
  mergeAnonymousPerson(args: {
    anonymousDistinctId: string;
    distinctId: string;
    properties?: Record<string, unknown>;
    insertId?: string;
  }): Promise<void>;
  identifyGroup(args: {
    context: AnalyticsContext;
    groupType: 'workspace';
    groupKey: string;
    properties: Record<string, unknown>;
  }): Promise<void>;
  shutdown(): Promise<void>;
}

const NOOP_ANALYTICS_SERVICE: AnalyticsService = {
  capture: async () => ({
    status: 'not_expected',
    acknowledgement: 'none',
    errorType: 'not_configured',
  }),
  captureSafety: async () => undefined,
  mergeAnonymousPerson: async () => undefined,
  identifyGroup: async () => undefined,
  shutdown: async () => undefined,
};

export function createAnalyticsService(_args: {
  env?: NodeJS.ProcessEnv;
  dataDir: string;
}): AnalyticsService {
  return NOOP_ANALYTICS_SERVICE;
}

export function newInsertId(): string {
  return crypto.randomUUID();
}

export interface TelemetryEndpointConfig {
  authHeader: string;
  baseUrl: string;
  timeoutMs: number;
  retries: number;
}

export type TelemetryDeliveryStatus = 'not_expected' | 'queued' | 'accepted' | 'failed';

export type TelemetryDropReason =
  | 'metrics_consent_off'
  | 'content_consent_off'
  | 'missing_sink_config'
  | 'payload_too_large'
  | 'payload_build_error'
  | 'export_mapping_mismatch'
  | 'task_hierarchy_rollout'
  | 'relay_429'
  | 'relay_413'
  | 'relay_5xx'
  | 'langfuse_4xx'
  | 'langfuse_5xx'
  | 'network_error';

export interface TelemetryDeliveryState {
  langfuse_expected: boolean;
  langfuse_delivery_status: TelemetryDeliveryStatus;
  langfuse_drop_reason?: TelemetryDropReason;
  langfuse_attempt_count?: number;
  langfuse_idempotency_key?: string;
}

// NOTE: no reader below ever *constructs* one of these shapes — CapyDesign has
// no telemetry destination. They are retained purely as the declared shape of
// the local delivery state machine so existing sink-aware code stays type-safe.
export type TelemetrySinkConfig =
  | {
      kind: 'relay';
      relayUrl: string;
      timeoutMs: number;
      retries: number;
    }
  | ({
      kind: 'telemetry-endpoint';
    } & TelemetryEndpointConfig);

/** The local build has exactly one sink shape (and configures neither). */
export type RunTelemetrySinkConfig = TelemetrySinkConfig;

export interface EffectiveRunTelemetrySinkDiagnostic {
  kind: string;
  host: string | null;
  protocol: string | null;
}

/** No sink is ever configured locally. */
export function readTelemetrySinkConfig(
  ..._args: unknown[]
): TelemetrySinkConfig | null {
  return null;
}

export function readTaskTelemetrySinkConfig(
  ..._args: unknown[]
): TelemetrySinkConfig | null {
  return null;
}

export function readRunTelemetrySinkConfig(
  ..._args: unknown[]
): RunTelemetrySinkConfig | null {
  return null;
}

export function describeRunTelemetrySink(
  sink: RunTelemetrySinkConfig | null,
): EffectiveRunTelemetrySinkDiagnostic {
  if (!sink) return { kind: 'none', host: null, protocol: null };
  return { kind: sink.kind, host: null, protocol: null };
}

export interface TelemetryPrefs {
  metrics?: boolean;
  content?: boolean;
  artifactManifest?: boolean;
}

export function deriveTelemetryDeliveryState(
  _prefs: TelemetryPrefs,
  _sink: RunTelemetrySinkConfig | null,
): TelemetryDeliveryState {
  return {
    langfuse_expected: false,
    langfuse_delivery_status: 'not_expected',
    langfuse_drop_reason: 'missing_sink_config',
  };
}

export async function postTelemetryBatch(
  _config: TelemetryEndpointConfig,
  _batch: unknown[],
  _fetchImpl?: typeof fetch,
  _onAttempt?: () => void,
): Promise<TelemetryDeliveryState> {
  return {
    langfuse_expected: false,
    langfuse_delivery_status: 'not_expected',
    langfuse_drop_reason: 'missing_sink_config',
  };
}

export interface PostLegacyTelemetryBatchOptions {
  fetchImpl?: typeof fetch;
  onAttempt?: () => void;
  deliveryIdempotencyKey?: string;
  maxTotalAttempts?: number;
  /** Accept-and-ignore: there is no fallback sink locally. */
  fallbackConfig?: unknown;
}

export async function postLegacyTelemetryBatch(
  _config: RunTelemetrySinkConfig,
  _batch: unknown[],
  _options: PostLegacyTelemetryBatchOptions = {},
): Promise<TelemetryDeliveryState> {
  return {
    langfuse_expected: false,
    langfuse_delivery_status: 'not_expected',
    langfuse_drop_reason: 'missing_sink_config',
  };
}

export function buildSafeRunQualityProjectionFromDaemon(_input: unknown): null {
  return null;
}

export async function reportRunCompletedFromDaemon(_input: unknown): Promise<unknown> {
  return { langfuse_expected: false, langfuse_delivery_status: 'not_expected' };
}

/** Telemetry relay URLs are no longer meaningful; keep the value verbatim. */
export function normalizeCapyDesignTelemetryRelayUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '');
}
