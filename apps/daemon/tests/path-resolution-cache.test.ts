// PATH-resolution cache (perf fix #3).
//
// Measured: an isolated missing-CLI resolve costs ~6ms, but 29 parallel
// `detectAgent` probes inflate each missing agent to 195–857ms — redundant
// synchronous PATH walks (25 dirs x PATHEXT x fallbackBins per def) starving
// the event loop under spawn contention. The cache shares one walk per bin
// across every caller; the key carries PATH+PATHEXT so environment changes
// invalidate, and batch passes clear it outright (same freshness philosophy
// as `forgetUnusableExecutables`: a rescan re-proves).

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  clearPathResolutionCache,
  resolveAllOnPath,
} from '../src/runtimes/executables.js';

describe('resolveAllOnPath cache', () => {
  it('returns equal results for repeated walks', () => {
    clearPathResolutionCache();
    const first = resolveAllOnPath('od-definitely-not-a-real-binary-xyz');
    const second = resolveAllOnPath('od-definitely-not-a-real-binary-xyz');
    expect(first).toEqual([]);
    expect(second).toEqual(first);
  });

  it('invalidates when PATH changes', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'od-path-cache-'));
    const probeName = 'od-cache-probe-bin';
    const previousPath = process.env.PATH;
    try {
      clearPathResolutionCache();
      expect(resolveAllOnPath(probeName)).toEqual([]);
      // win32 only matches PATHEXT-suffixed names; posix matches the bare name.
      fs.writeFileSync(path.join(dir, probeName + (process.platform === 'win32' ? '.CMD' : '')), 'x');
      process.env.PATH = `${dir}${path.delimiter}${previousPath ?? ''}`;
      const found = resolveAllOnPath(probeName);
      expect(found).toHaveLength(1);
      expect(found[0]!.startsWith(path.join(dir, probeName))).toBe(true);
      process.env.PATH = previousPath;
      expect(resolveAllOnPath(probeName)).toEqual([]);
    } finally {
      process.env.PATH = previousPath;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
