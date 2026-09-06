// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AssistantMessage } from '../../src/components/AssistantMessage';
import type { AgentEvent, ChatMessage } from '../../src/types';

function messageWithEvents(events: AgentEvent[]): ChatMessage {
  return {
    id: 'assistant-stream-1',
    role: 'assistant',
    content: '',
    events,
    startedAt: 1_000,
    runStatus: 'running',
  };
}

function renderStreaming(events: AgentEvent[]) {
  return render(
    <AssistantMessage
      projectKind="prototype"
      conversationId="conv-1"
      message={messageWithEvents(events)}
      streaming
      isLast
      projectId="project-1"
    />,
  );
}

describe('AssistantMessage live run status strip', () => {
  afterEach(() => cleanup());

  it('renders the strip under streaming prose without replacing the prose', () => {
    const { container } = renderStreaming([
      { kind: 'status', label: 'starting', detail: 'command-code' },
      { kind: 'status', label: 'thinking' },
      { kind: 'thinking', text: 'Planning the build.' },
      { kind: 'text', text: 'I will read the design system first.' },
    ]);

    // Prose is still rendered (not replaced by the strip).
    expect(screen.getByText(/I will read the design system first/)).toBeTruthy();

    const strip = container.querySelector('.live-run-status');
    expect(strip).not.toBeNull();
    expect(strip?.getAttribute('data-phase')).toBe('working');
  });

  it('does not render the strip while a tool is the active tail (rail already communicates it)', () => {
    const { container } = renderStreaming([
      { kind: 'tool_use', id: 't1', name: 'Read', input: { file_path: 'schema.ts' } },
    ]);

    // No trailing prose → the "under prose" strip must not appear; the rail
    // card already shows the running tool, and nothing should be replaced.
    expect(container.querySelector('.live-run-status')).toBeNull();
    expect(container.querySelector('.action-card, .task-activity')).not.toBeNull();
  });

  it('does not render the strip on the last block when it is a tool group, not prose', () => {
    const { container } = renderStreaming([
      { kind: 'tool_use', id: 't1', name: 'Bash', input: { command: 'pnpm guard' } },
      { kind: 'tool_result', toolUseId: 't1', content: 'ok', isError: false },
    ]);

    // No trailing prose → the "under prose" strip must not appear (the rail
    // already communicates activity); nothing should be replaced either.
    expect(container.querySelector('.live-run-status')).toBeNull();
    // The tool card still rendered.
    expect(container.querySelector('.action-card, .task-activity')).not.toBeNull();
  });

  it('keeps post-prose thinking/actions inline below the prose while streaming', () => {
    const { container } = renderStreaming([
      // Round 1: prose first…
      { kind: 'text', text: 'Here is the plan.' },
      // …then the model goes quiet, thinks again, and runs a tool.
      { kind: 'thinking', text: 'Let me verify the schema first.' },
      { kind: 'tool_use', id: 't2', name: 'Read', input: { file_path: 'schema.ts' } },
    ]);

    // No hoisted execution card mid-stream: prose + activity flow inline.
    expect(screen.getByText('Here is the plan.')).toBeTruthy();
    expect(screen.getByText(/Let me verify the schema first/)).toBeTruthy();
    // The thinking block must sit AFTER the prose in DOM order (the live
    // "read along" order the user asked for), not hoisted above it.
    const prose = container.querySelector('.prose-block') ?? screen.getByText('Here is the plan.');
    const thinking = screen.getByText(/Let me verify the schema first/).closest('.thinking-block');
    expect(thinking).not.toBeNull();
    expect(prose.compareDocumentPosition(thinking as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // No settled audit toggle while streaming with prose (the toggle returns
    // once the turn settles).
    expect(screen.queryByTestId('task-activity-toggle')).toBeNull();
  });

  it('auto-expands live post-prose thinking inline below the message tail', () => {
    // The model already answered, then went quiet to reason again. The
    // trailing "Thinking…" body must be expanded in place (not collapsed, not
    // in a top card) so the user can read the live reasoning.
    const { container } = renderStreaming([
      { kind: 'text', text: 'I will restructure the module.' },
      { kind: 'thinking', text: 'Moving the parser into its own file would decouple the concerns.' },
    ]);

    const thinking = screen.getByText(/Moving the parser/).closest('.thinking-block');
    expect(thinking).not.toBeNull();
    // Expanded while live: reasoning text is visible without a click.
    expect(thinking?.querySelector('.accordion-collapsible')?.classList.contains('open')).toBe(true);
    expect(container.querySelector('.task-activity-current, .task-activity-toggle')).toBeNull();
  });
});
