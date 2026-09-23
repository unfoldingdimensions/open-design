// @vitest-environment jsdom
/**
 * 执行记录(`chat-panel-next.md`)在真实消息里的行为。
 *
 * 这一层**不重复纯函数那一层**(落块规则在 `tests/runtime/chat/build-turn-blocks.test.ts`),
 * 只问两件事:画出来了没有、画对了没有。
 *
 * 用例编码的是行为不是样式,所以断言挂在**看得见的字**和 `<details>` 的开合上,
 * 不挂 CSS Module 的类名 —— 那些名字在 vitest 下带哈希。
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AssistantMessage } from '../../src/components/AssistantMessage';
import type { AgentEvent, ChatMessage } from '../../src/types';

function messageWithEvents(events: AgentEvent[]): ChatMessage {
  return {
    id: 'assistant-1',
    role: 'assistant',
    content: '',
    events,
    startedAt: 1_000,
    endedAt: 3_000,
    runStatus: 'succeeded',
  };
}

/** 执行记录壳:`.assistant-flow` 里的第一个顶层 `<details>`(ExecutionShell → Foldable) */
function record(container: HTMLElement): HTMLDetailsElement {
  const el = maybeRecord(container);
  if (!el) throw new Error('执行记录壳没有渲染出来');
  return el;
}

/** 同上,但**允许没有** —— B47 之后「跑完了却空着」的壳整个不渲染 */
const maybeRecord = (container: HTMLElement): HTMLDetailsElement | null =>
  container.querySelector<HTMLDetailsElement>('.assistant-flow > details');

/** 壳头那行字:状态词(+ 耗时) */
const recordHead = (container: HTMLElement): string =>
  record(container).querySelector('summary')?.textContent ?? '';

/** 壳里的内容区。壳里没东西可展开时 `Foldable` 连这个 div 都不建 */
const recordBody = (container: HTMLElement): HTMLElement | null =>
  record(container).querySelector<HTMLElement>(':scope > div');

function activateExecutionRecord(container: HTMLElement): void {
  const shell = record(container);
  const summary = shell.querySelector<HTMLElement>(':scope > summary');
  if (!summary) throw new Error('执行记录壳标题没有渲染出来');
  fireEvent.click(summary);
}

const bodyText = (container: HTMLElement): string => recordBody(container)?.textContent ?? '';

/** 壳里的行数:工具行、清单行、过程叙述各算一行 */
const rowCount = (container: HTMLElement): number => recordBody(container)?.children.length ?? 0;

describe('AssistantMessage 执行记录', () => {
  afterEach(() => cleanup());

  /*
   * ⚠️ OPEND-2626 **翻过案**:壳头不再沿用「进行中」。
   * 原来的理由是「下面那行『已手动停止』已经说清楚了」,而那一行在**历史回合**上
   * 是 `opacity: 0`(OPEND-2542 的 hover 揭示)—— 前提在历史回合上不成立。
   * 这一条仍然守着「两行说的是同一件事的两句话」:壳头报终态、状态行报是谁停的。
   */
  it('执行记录里没内容的一轮被停掉:状态行说「已手动停止」而不是「已完成」', () => {
    const { container } = render(
      <AssistantMessage
        projectKind="prototype"
        conversationId="conv-1"
        message={{
          ...messageWithEvents([{ kind: 'text', text: 'Partial response.' }]),
          content: 'Partial response.',
          runStatus: 'canceled',
        }}
        streaming={false}
        projectId="project-1"
        // 同上:回合状态行只在最后一轮出。
        isLast
      />,
    );

    expect(container.querySelector('[data-testid="assistant-label"]')?.textContent).toBe('Stopped manually');
  });

  it('hides persisted lifecycle status rows after a run reaches a terminal state', () => {
    const { container } = render(
      <AssistantMessage
        projectKind="prototype"
        conversationId="conv-1"
        message={{
          ...messageWithEvents([
            { kind: 'status', label: 'working' },
            { kind: 'status', label: 'completed' },
          ]),
          runStatus: 'canceled',
          endedAt: 2,
        }}
        streaming={false}
        projectId="project-1"
      />,
    );

    expect(container.querySelector('[data-status="working"]')).toBeNull();
    expect(container.querySelector('[data-status="completed"]')).toBeNull();
    expect(container.querySelector('[data-testid="status-pill"]')).toBeNull();
  });

  /*
   * `model` 这一档 2026-08-27 起不再渲染(用户:「这个模型的标识可以去掉」)——
   * 它是 AMR/ACP 独有的运行时标记,由 `acp/session.ts` 在 session/new 和
   * set_model 完成时各发一次,内容是模型 id,而输入区的模型芯片上已经写着了。
   * 详见 `tests/components/AssistantMessage.amr-model-status.test.tsx`。
   *
   * 这条用例原来把 `model` 和生命周期状态行捆在一起断言,于是跟着变红。
   * 保留生命周期那两档(它们照常渲染),把 `model` 那半改成**反向断言** ——
   * 这样它从「跟着别人一起红」变成「替那条裁决站岗」。
   */
  it('lifecycle 状态行照常渲染,而 model 那一档不再出现', () => {
    const { container } = render(
      <AssistantMessage
        projectKind="prototype"
        conversationId="conv-1"
        message={messageWithEvents([
          { kind: 'status', label: 'working', detail: 'Publishing plugin' },
          { kind: 'status', label: 'done', detail: 'CLI command finished' },
          { kind: 'status', label: 'model', detail: 'claude-opus-4-7-high' },
        ])}
        streaming={false}
        projectId="project-1"
      />,
    );

    expect(container.querySelector('[data-status="working"]')).not.toBeNull();
    expect(container.querySelector('[data-status="done"]')).not.toBeNull();
    expect(container.textContent).toContain('Publishing plugin');
    expect(container.textContent).toContain('CLI command finished');
    // 反向断言:model 那一行整个不画,detail 里的模型 id 也不出现在任何地方
    expect(container.querySelector('[data-status="model"]')).toBeNull();
    expect(container.textContent).not.toContain('claude-opus-4-7-high');
  });

  it('renders URLs in JSON-like status details without trailing structural characters', () => {
    const { container } = render(
      <AssistantMessage
        projectKind="prototype"
        conversationId="conv-1"
        message={messageWithEvents([
          {
            kind: 'status',
            label: 'publish repo',
            detail: '{"url":"https://github.com/nexu-io/example-plugin","nameWithOwner":"nexu-io/example-plugin"}',
          },
        ])}
        streaming={false}
        projectId="project-1"
      />,
    );

    const link = container.querySelector('[data-testid="status-detail"] a.md-link');
    expect(link?.getAttribute('href')).toBe('https://github.com/nexu-io/example-plugin');
    expect(link?.textContent).toBe('https://github.com/nexu-io/example-plugin');
    expect(container.querySelector('[data-testid="status-detail"]')?.textContent).toContain('"}');
  });
});
