// Detection model-probe cap (perf fix #1).
//
// Measured: hermes model enumeration (ACP handshake) 13.3s, command-code
// `listModels` 7.2s, against 15s per-def budgets. The batch wall is the
// slowest finisher, so no single CLI's enumeration may hold the picker past
// the cap — timeouts fall back to the def's static fallbackModels.

import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENT_DEFS } from '../src/runtimes/registry.js';
import { detectAgent } from '../src/runtimes/detection.js';

const slowModelsCli = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'slow-models-cli.mjs',
);

describe('detection model probe cap', () => {
  it('falls back to static models when enumeration hangs', async () => {
    const codex = AGENT_DEFS.find((d) => d.id === 'codex');
    expect(codex).toBeDefined();
    // The cap only matters past the version gate; without the CLI installed
    // there is no enumeration to cap.
    const base = await detectAgent(codex!, {});
    if (!base.available) return;
    const hanging = {
      ...codex!,
      fetchModels: async () => {
        await new Promise((resolve) => setTimeout(resolve, 15_000));
        return [{ id: 'never-live', label: 'never-live' }];
      },
    };
    const t0 = Date.now();
    const agent = await detectAgent(hanging, {});
    const elapsed = Date.now() - t0;
    expect(agent.modelsSource).toBe('fallback');
    expect(elapsed).toBeLessThan(8000);
  }, 25000);

  it('caps the listModels argv path too, not just custom fetchModels', async () => {
    const codex = AGENT_DEFS.find((d) => d.id === 'codex');
    expect(codex).toBeDefined();
    // node answers --version instantly and hangs on the models argv; the def
    // budget is deliberately huge so only the detection-level cap can fire.
    const hangingList = {
      ...codex!,
      bin: 'node',
      versionArgs: [slowModelsCli, '--version'],
      listModels: {
        args: [slowModelsCli, 'models'],
        timeoutMs: 60_000,
        parse: (stdout: string) => JSON.parse(stdout),
      },
    };
    const t0 = Date.now();
    const agent = await detectAgent(hangingList, {});
    const elapsed = Date.now() - t0;
    expect(agent.available).toBe(true);
    expect(agent.modelsSource).toBe('fallback');
    expect(elapsed).toBeLessThan(8000);
  }, 25000);
});
