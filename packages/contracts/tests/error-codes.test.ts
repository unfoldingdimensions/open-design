import { describe, expect, it } from 'vitest';

import { API_ERROR_CODES, type ApiErrorCode } from '../src/errors';

describe('shared API error codes', () => {
  it('exposes every public workspace project-creation failure code', () => {
    expect(API_ERROR_CODES).toEqual(expect.arrayContaining([
      'WORKSPACE_CONTEXT_INCOMPLETE',
      'WORKSPACE_PROJECT_PERMISSION_DENIED',
      'WORKSPACE_AUTHORITY_UNAVAILABLE',
    ]));
  });

  it('exposes AGENT_RUNTIME_DEF_INVALID for runtime-def validation failures', () => {
    // Chat-run startup emits this code through the shared SSE/status error
    // envelopes when a checked-in runtime def is invalid. Keeping the
    // assertion in the contracts package ensures contract-only refactors
    // cannot drop the literal without this package's own test lane failing.
    expect(API_ERROR_CODES).toContain('AGENT_RUNTIME_DEF_INVALID');
  });

  it('keeps AGENT_RUNTIME_DEF_INVALID assignable to ApiErrorCode', () => {
    const code: ApiErrorCode = 'AGENT_RUNTIME_DEF_INVALID';
    expect(code).toBe('AGENT_RUNTIME_DEF_INVALID');
  });

  // Daemon-emitted startup/lifecycle codes the chat surfaces through the
  // shared SSE/status error envelopes. Each is proven emitted in
  // apps/daemon/src (see comments in errors.ts); the contract must name
  // them so clients can switch on code instead of matching sentences.
  it('exposes daemon-emitted run lifecycle failure codes', () => {
    expect(API_ERROR_CODES).toEqual(expect.arrayContaining([
      'DAEMON_RESTARTED',
      'BYOK_PROVIDER_REQUIRED',
      'HTML_VERSION_SNAPSHOT_FAILED',
      'PI_PARENT_SESSION_FAILED',
      'DSH_PROFILE_FRAME_TOO_LARGE',
      'DSH_PROFILE_MALFORMED_FRAME',
      'DSH_PROFILE_INVALID_FRAME',
      'DSH_PROFILE_TRUNCATED_FRAME',
      'DSH_PROFILE_PROTOCOL_ERROR',
      'AMR_WORKSPACE_SCOPE_REQUIRED',
      'AMR_WORKSPACE_SCOPE_CONFLICT',
    ]));
  });
});
