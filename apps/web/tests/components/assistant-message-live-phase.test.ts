import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deriveLiveRunPhase } from '../../src/components/AssistantMessage';
import type { AgentEvent } from '../../src/types';

const STARTED_AT = 1_700_000_000_000;

function events(list: AgentEvent[]): AgentEvent[] {
  return list;
}

describe('deriveLiveRunPhase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(STARTED_AT);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports working (pre-output) when there are no events yet', () => {
    const { livePhase, lastActivityAt } = deriveLiveRunPhase([], STARTED_AT);
    expect(livePhase).toBe('working');
    expect(lastActivityAt).toBe(STARTED_AT);
  });

  it('reports running-tool while a tool_use has not yet produced a result', () => {
    const { livePhase, lastActivityAt } = deriveLiveRunPhase(
      events([{ kind: 'tool_use', id: 't1', name: 'Read', input: { file_path: 'a.ts' } }]),
      STARTED_AT,
    );
    expect(livePhase).toBe('running-tool');
    expect(lastActivityAt).toBe(STARTED_AT);
  });

  it('reports working after prose when no tool is open (the quiet model-call window)', () => {
    // cmdc streams a full sentence, then goes silent while the next model
    // call warms up. No tool is open, so this must read "working", not
    // "thinking" — the agent is alive and mid-call.
    const { livePhase } = deriveLiveRunPhase(
      events([
        { kind: 'status', label: 'starting', detail: 'command-code' },
        { kind: 'status', label: 'thinking' },
        { kind: 'thinking', text: 'Let me plan the build.' },
        { kind: 'text', text: 'I will read the schema first.' },
      ]),
      STARTED_AT,
    );
    expect(livePhase).toBe('working');
  });

  it('reports thinking while the trailing event is streamed reasoning', () => {
    const { livePhase } = deriveLiveRunPhase(
      events([
        { kind: 'status', label: 'thinking' },
        { kind: 'thinking', text: 'Comparing the two approaches' },
      ]),
      STARTED_AT,
    );
    expect(livePhase).toBe('thinking');
  });

  it('ignores lifecycle status bookkeeping when choosing the anchor', () => {
    // A bare trailing `running` status after real content should not flip the
    // phase away from the last substantive activity.
    const { livePhase } = deriveLiveRunPhase(
      events([
        { kind: 'text', text: 'Almost done.' },
        { kind: 'status', label: 'running' },
      ]),
      STARTED_AT,
    );
    expect(livePhase).toBe('working');
  });

  it('anchors on the most recent substantive event even with trailing status', () => {
    const { livePhase } = deriveLiveRunPhase(
      events([
        { kind: 'tool_use', id: 't9', name: 'Bash', input: { command: 'pnpm test' } },
        { kind: 'status', label: 'running' },
      ]),
      STARTED_AT,
    );
    expect(livePhase).toBe('running-tool');
  });
});
