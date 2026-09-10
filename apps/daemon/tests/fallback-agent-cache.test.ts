// Cache-first agent fallback for run creation (perf fix #2).
//
// The run-creation fallback used to call full `detectAgents()` — a 16.2s wall
// on a machine with 8 CLIs installed — every time `agentId` was absent.
// `resolveCachedFallbackAgentId` answers from the daemon-lifetime version
// cache instead (one scope check, no spawn); callers keep full `detectAgents()`
// only for the genuinely cold path.

import { describe, expect, it } from 'vitest';
import {
  ensureDetectedRuntimeVersions,
  resolveCachedFallbackAgentId,
} from '../src/runtimes/detection.js';

describe('resolveCachedFallbackAgentId', () => {
  it('returns null on a cold cache without spawning a probe', () => {
    const t0 = Date.now();
    expect(resolveCachedFallbackAgentId({}, 'devin')).toBeNull();
    // Memory-only answer: 29 map lookups, no filesystem walk, no child.
    expect(Date.now() - t0).toBeLessThan(5000);
  });

  it('returns the warmed agent without a second probe', async () => {
    await ensureDetectedRuntimeVersions('claude', {});
    expect(resolveCachedFallbackAgentId({}, 'claude')).toBe('claude');
  });

  it('prefers the configured agent over other warmed agents', async () => {
    await ensureDetectedRuntimeVersions('claude', {});
    await ensureDetectedRuntimeVersions('codex', {});
    expect(resolveCachedFallbackAgentId({}, 'codex')).toBe('codex');
  });
});
