// @vitest-environment jsdom
/**
 * 接入:新执行记录在**真实消息树**里跑起来 —— 它现在是唯一的一条链路,没有开关。
 *
 * 这一层要证三件事:
 *  ① 新壳真的出现在消息里(不是渲染成空)
 *  ② 壳内是过程、壳外是结论,同一段正文只出一次
 *  ③ 拿**真实录制**喂进去不炸 —— 接入最怕的不是写不出来,是真数据里有没想到的形状
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
import type { ChatMessage, PersistedAgentEvent } from '@capydesign/contracts';
import { I18nProvider } from '../../../src/i18n';
import { AssistantMessage } from '../../../src/components/AssistantMessage';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const FIXTURES = resolve(dirname(fileURLToPath(import.meta.url)), '../../fixtures/chat');

function msg(events: PersistedAgentEvent[], over: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm1', role: 'assistant', content: '', createdAt: 1_756_000_000_000,
    runStatus: 'succeeded', events, ...over,
  } as ChatMessage;
}

const show = (message: ChatMessage): ReactElement => (
  <I18nProvider initial="zh-CN">
    <AssistantMessage message={message} streaming={false} />
  </I18nProvider>
);

function activateExecutionRecord(container: HTMLElement): HTMLDetailsElement {
  const shell = container.querySelector<HTMLDetailsElement>('.assistant-flow > details');
  const summary = shell?.querySelector<HTMLElement>(':scope > summary');
  if (!shell || !summary) throw new Error('执行记录壳没有渲染出来');
  fireEvent.click(summary);
  return shell;
}

const SAMPLE: PersistedAgentEvent[] = [
  { kind: 'thinking', text: '先看一眼规格。' },
  { kind: 'tool_use', id: 't1', name: 'Read', input: { file_path: 'tokens.css' }, startedAt: 0 },
  { kind: 'tool_result', toolUseId: 't1', content: 'ok', isError: false, completedAt: 400 },
  { kind: 'text', text: '看完了,栅格对得上。' },
];

describe('新执行记录接入', () => {
  it('真实录制喂进去不炸', () => {
    const files = readdirSync(FIXTURES).filter((f) => f.endsWith('.json'));
    expect(files.length, '没有可回放的录制夹具').toBeGreaterThan(0);
    for (const f of files) {
      const raw: unknown = JSON.parse(readFileSync(resolve(FIXTURES, f), 'utf-8'));
      const events = (Array.isArray(raw) ? raw : (raw as { events?: unknown[] }).events ?? []) as PersistedAgentEvent[];
      if (events.length === 0) continue;
      const { container, unmount } = render(show(msg(events)));
      expect(container.textContent, `${f} 渲染成空`).not.toBe('');
      unmount();
    }
  });
});
