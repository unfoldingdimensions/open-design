import { describe, expect, it } from 'vitest';

import { formatMediaTaskDiagnostic, retryDiagnosticFor } from '../../src/media/diagnostics.js';

describe('formatMediaTaskDiagnostic', () => {
  it('keeps correlation and routing context while redacting secrets', () => {
    const line = formatMediaTaskDiagnostic({
      event: 'failed',
      taskId: 'media-task-123',
      runId: 'run-456',
      projectId: 'project-789',
      surface: 'image',
      model: 'vela/gpt-image-2',
      providerId: 'vela',
      status: 503,
      code: 'provider_error',
      elapsedMs: 1_234.4,
      referenceImageCount: 2,
      hasCompositionDir: false,
      error: 'upstream rejected Authorization: Bearer abcdefghijklmnop',
    });

    expect(line).toContain('"task_id":"media-task-123"');
    expect(line).toContain('"run_id":"run-456"');
    expect(line).toContain('"model_id":"vela/gpt-image-2"');
    expect(line).toContain('"provider_id":"vela"');
    expect(line).toContain('"code":"provider_error"');
    expect(line).toContain('"elapsed_ms":1234');
    expect(line).toContain('"reference_image_count":2');
    expect(line).toContain('"has_composition_dir":false');
    expect(line).toContain('[REDACTED:');
    expect(line).not.toContain('abcdefghijklmnop');
  });

  it('omits retry fields when no retry was attempted', () => {
    const line = formatMediaTaskDiagnostic({
      event: 'done',
      taskId: 't',
      projectId: 'p',
      surface: 'image',
      model: 'm',
      retry: retryDiagnosticFor({ retryCount: 0, retryFinalResult: 'not_attempted' }),
    });
    expect(line).not.toContain('retry_');
  });

  it('carries retry attempts and skipped-budget verdicts onto the terminal line', () => {
    // F8: a 429 that succeeded after one retry, and a 503 whose retry was
    // skipped for budget — both used to be analytics-only.
    const retried = formatMediaTaskDiagnostic({
      event: 'done',
      taskId: 't',
      projectId: 'p',
      surface: 'image',
      model: 'm',
      retry: retryDiagnosticFor({
        retryCount: 1,
        retryReason: 'rate_limit_429',
        retryFinalResult: 'success',
      }),
    });
    expect(retried).toContain('"retry_count":1');
    expect(retried).toContain('"retry_reason":"rate_limit_429"');
    expect(retried).toContain('"retry_final_result":"success"');

    const skipped = formatMediaTaskDiagnostic({
      event: 'failed',
      taskId: 't',
      projectId: 'p',
      surface: 'image',
      model: 'm',
      retry: retryDiagnosticFor({ retryCount: 0, retryFinalResult: 'skipped_retry_after_budget' }),
    });
    expect(skipped).toContain('"retry_final_result":"skipped_retry_after_budget"');
    expect(skipped).not.toContain('retry_count');
  });
});
