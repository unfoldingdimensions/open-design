// @vitest-environment jsdom
/**
 * 第 71 格「Plan 卡 · 收起态」—— 钉在输入框上方的那枚「第 N / M 步」药丸。
 *
 * 这一组钉住的是**行为**,不是类名(chat/AGENTS.md §5):出没判据、N/M 口径、
 * 浮层里那份清单的四态记号、以及它和发送队列的上下堆叠关系。
 * 悬停本身(CSS `:hover` 才浮出)在 jsdom 里看不见 —— 那一段靠真实客户端验,
 * 这里只保证浮层的**内容**确实渲染出来了。
 */
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatPane } from '../../../src/components/ChatPane';
import type { ChatMessage } from '../../../src/types';

let originalResizeObserver: typeof ResizeObserver | undefined;

beforeEach(() => {
  originalResizeObserver = globalThis.ResizeObserver;
  class MockResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: MockResizeObserver,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (originalResizeObserver) {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: originalResizeObserver,
    });
  } else {
    delete (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver;
  }
});

type Todo = { content: string; status: string };

function messagesWithTodos(todos: Todo[]): ChatMessage[] {
  return [
    { id: 'u1', role: 'user', content: '把这两页做出来', createdAt: 1 },
    {
      id: 'a1',
      role: 'assistant',
      content: '好的',
      createdAt: 2,
      events: [{ kind: 'tool_use', id: 'tw-1', name: 'TodoWrite', input: { todos } }],
    },
  ];
}

const FOUR: Todo[] = [
  { content: '复刻商品列表页结构与栅格', status: 'completed' },
  { content: '抽出商品卡为共享组件', status: 'completed' },
  { content: '按同一套间距做设置页', status: 'in_progress' },
  { content: '接上两页之间的跳转', status: 'pending' },
];

function pane(
  messages: ChatMessage[],
  extra: { streaming?: boolean; queuedItems?: { id: string; prompt: string }[] } = {},
) {
  return (
    <ChatPane
      messages={messages}
      streaming={extra.streaming ?? true}
      error={null}
      projectId="project-1"
      projectFiles={[]}
      onEnsureProject={async () => 'project-1'}
      onSend={() => {}}
      onStop={() => {}}
      conversations={[]}
      activeConversationId={null}
      onSelectConversation={() => {}}
      onDeleteConversation={() => {}}
      {...(extra.queuedItems ? { queuedItems: extra.queuedItems } : {})}
    />
  );
}

describe('Plan 药丸 · 收起态(第 71 格)', () => {
  it('run 结束就消失', () => {
    render(pane(messagesWithTodos(FOUR), { streaming: false }));
    expect(screen.queryByTestId('chat-plan-pill')).toBeNull();
  });

  it('清单全部完成 / 作废就消失 —— 哪怕 run 还跑着', () => {
    render(pane(messagesWithTodos(FOUR.map((t) => ({ ...t, status: 'completed' })))));
    expect(screen.queryByTestId('chat-plan-pill')).toBeNull();
  });

  it('没有清单时不出现', () => {
    render(pane([{ id: 'u1', role: 'user', content: '你好', createdAt: 1 }]));
    expect(screen.queryByTestId('chat-plan-pill')).toBeNull();
  });

});
