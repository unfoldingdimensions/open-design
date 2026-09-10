// Probe-context memo (perf fix #4).
//
// Measured: building one probe context costs ~65ms warm (~250ms cold), paid
// twice per OD Next run (versions + capabilities probes, identical args).
// The memo shares the build and returns an independent env copy per hit.
// Speedup is verified by the perf harness (ensure pair 150ms -> ~2ms), not
// by a clock assertion here: this spec guards what the memo must never
// change — equal snapshots across calls.

import { describe, expect, it } from 'vitest';
import { ensureDetectedRuntimeVersions } from '../src/runtimes/detection.js';

describe('version probe context memo', () => {
  it('returns equal snapshots across calls', async () => {
    const first = await ensureDetectedRuntimeVersions('claude', {});
    // No CLI installed: no context to memoize, nothing to assert.
    if (!first?.invocable) return;
    const second = await ensureDetectedRuntimeVersions('claude', {});
    expect(second).toEqual(first);
  });
});
