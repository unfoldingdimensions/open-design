// Capabilities-scope warming (perf fix #4 follow-up).
//
// Measured: the first `ensureDetectedRuntimeCapabilities('claude', {})`
// after a full probe costs 189ms — a redundant `claude -p --help` spawn —
// while the second costs 0.5ms. The full probe cached the capability map
// but never set its scope, so the first ensure always missed. This spec
// counts `--help` spawns instead of the clock: after a full probe, the
// ensure must not spawn at all.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { execAgentFile as execAgentFileType } from '../src/runtimes/invocation.js';

const helpArgvSeen: string[][] = [];

vi.mock('../src/runtimes/invocation.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../src/runtimes/invocation.js')>();
  const wrapped: typeof execAgentFileType = ((command: string, args: string[], options?: never) => {
    helpArgvSeen.push(args);
    return (mod.execAgentFile as (...a: unknown[]) => unknown)(command, args, options);
  }) as typeof execAgentFileType;
  return { ...mod, execAgentFile: wrapped };
});

import { AGENT_DEFS } from '../src/runtimes/registry.js';
import { detectAgent, ensureDetectedRuntimeCapabilities } from '../src/runtimes/detection.js';

describe('capabilities scope warming', () => {
  beforeEach(() => {
    helpArgvSeen.length = 0;
  });

  it('does not re-spawn --help after a full probe', async () => {
    const def = AGENT_DEFS.find((d) => d.id === 'claude');
    expect(def?.helpArgs).toBeDefined();
    const base = await detectAgent(def!, {});
    // No CLI installed: no --help metadata to warm, nothing to assert.
    if (!base.available) return;
    helpArgvSeen.length = 0;
    const caps = await ensureDetectedRuntimeCapabilities('claude', {});
    expect(caps).not.toBeNull();
    expect(helpArgvSeen.some((args) => args.includes('--help'))).toBe(false);
  }, 30000);
});
