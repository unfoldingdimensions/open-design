import { redactSecrets } from '../redact.js';

const MAX_MEDIA_ERROR_LOG_LENGTH = 2_000;

export interface MediaTaskDiagnosticInput {
  code?: string | undefined;
  elapsedMs?: number | undefined;
  error?: string | undefined;
  event: 'queued' | 'done' | 'failed';
  fileSize?: number | undefined;
  hasCompositionDir?: boolean | undefined;
  mime?: string | undefined;
  model: string;
  projectId: string;
  providerId?: string | undefined;
  runId?: string | undefined;
  referenceImageCount?: number | undefined;
  retry?: MediaRequestRetrySummary | undefined;
  status?: number | string | undefined;
  surface: string;
  taskId: string;
}

/**
 * Retry facts from `ImageGenerationRequestSummary`, for the daemon diagnostic
 * only. Paid POSTs retry on a narrow allowlist (429/503); when a retry was
 * attempted — or deliberately skipped for budget (`skipped_retry_after_budget`)
 * — that decision used to be analytics-only and invisible on the terminal.
 */
export interface MediaRequestRetrySummary {
  retryCount?: number | undefined;
  retryReason?: string | undefined;
  retryFinalResult?: string | undefined;
}

/**
 * Map a provider-request summary onto diagnostic retry fields. Returns
 * `undefined` when no retry was attempted or skipped, so quiet generations
 * keep their existing one-line shape.
 */
export function retryDiagnosticFor(
  summary:
    | { retryCount?: number | undefined; retryReason?: string | undefined; retryFinalResult?: string | undefined }
    | null
    | undefined,
): MediaRequestRetrySummary | undefined {
  if (!summary) return undefined;
  const retryCount = typeof summary.retryCount === 'number' ? summary.retryCount : 0;
  const finalResult = typeof summary.retryFinalResult === 'string' ? summary.retryFinalResult : 'not_attempted';
  if (retryCount <= 0 && finalResult === 'not_attempted') return undefined;
  return {
    ...(retryCount > 0 ? { retryCount } : {}),
    ...(typeof summary.retryReason === 'string' && summary.retryReason ? { retryReason: summary.retryReason } : {}),
    ...(finalResult !== 'not_attempted' ? { retryFinalResult: finalResult } : {}),
  };
}

export function formatMediaTaskDiagnostic(
  input: MediaTaskDiagnosticInput,
): string {
  const diagnostic = {
    event: input.event,
    task_id: input.taskId,
    run_id: input.runId ?? null,
    project_id: input.projectId,
    surface: input.surface,
    model_id: input.model,
    provider_id: input.providerId ?? null,
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.code ? { code: input.code } : {}),
    ...(input.elapsedMs !== undefined
      ? { elapsed_ms: Math.max(0, Math.round(input.elapsedMs)) }
      : {}),
    ...(input.referenceImageCount !== undefined
      ? { reference_image_count: Math.max(0, Math.round(input.referenceImageCount)) }
      : {}),
    ...(input.retry?.retryCount !== undefined ? { retry_count: input.retry.retryCount } : {}),
    ...(input.retry?.retryReason ? { retry_reason: input.retry.retryReason } : {}),
    ...(input.retry?.retryFinalResult ? { retry_final_result: input.retry.retryFinalResult } : {}),
    ...(input.hasCompositionDir !== undefined
      ? { has_composition_dir: input.hasCompositionDir }
      : {}),
    ...(input.fileSize !== undefined
      ? { file_size: Math.max(0, Math.round(input.fileSize)) }
      : {}),
    ...(input.mime ? { mime: input.mime } : {}),
    ...(input.error
      ? {
          error: redactSecrets(input.error)
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, MAX_MEDIA_ERROR_LOG_LENGTH),
        }
      : {}),
  };
  return `[media] ${JSON.stringify(diagnostic)}`;
}
