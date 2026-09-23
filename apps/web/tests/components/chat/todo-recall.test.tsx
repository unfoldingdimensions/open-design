// @vitest-environment jsdom
/**
 * Todo 召回通路 —— 客户端这一半。
 *
 * 决定权在 **agent**,客户端只做「认出这条之前**干过**」:
 *  · agent 把上一轮动过手、没做完的那几条**重新发了** → 本轮这几条标成召回(划线);
 *  · agent **没重发**(用户问了别的)→ 这一轮一条都不显示,不是空壳。
 *
 * ⚠️ 2026-08-27 裁决改过一次判据(产品负责人真机截图,会话 `7e97c7e9-…`):
 * 本文件原来把「上一轮只是**声明过**、一次都没开始(`pending`)」也算召回,
 * 下面两条用例的 `previousTodos` / 第一轮清单当初写的就是 `pending`。
 * 真机后果是一整份**刚开跑**的五步计划五条全划线、第一条还同时是「进行中」——
 * 「正在做」和「这是旧账」自相矛盾,而且本轮真干的活被划线全盖住、一点进度都看不出来。
 * 新判据只认「上一轮**真动过手**」(`completed` / `in_progress` / `stopped`),
 * 见 `build-turn-blocks.ts` 的 `recalledContents`;
 * 规格 `chat-panel-next.md:274-283` 那张表里「还没跑的 → 划线 ✗」说的就是这一格。
 * 两条用例因此把状态从 `pending` 抬到 `in_progress` —— **要证的东西没变**
 * (「跨轮召回会划线」「ChatPane 真的把 previousTodos 递下去了」),
 * 变的只是「怎样才算上一轮留下的欠账」。
 *
 * 外加 agent 不照做时的**用户出口**:〔继续剩余任务〕。它不依赖任何 agent 能力,
 * 21 家不发清单的 runtime 一样能用。
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { ComponentProps, ReactElement } from 'react';
import type { ChatMessage, PersistedAgentEvent } from '@capydesign/contracts';
import { I18nProvider } from '../../../src/i18n';
import { AssistantMessage } from '../../../src/components/AssistantMessage';
import { ChatPane } from '../../../src/components/ChatPane';
import { previousTodosByAssistantMessageId } from '../../../src/runtime/todos';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const todoWrite = (
  todos: Array<{ content: string; status: string }>,
  id = 'tw-1',
): PersistedAgentEvent => ({
  kind: 'tool_use', id, name: 'TodoWrite', input: { todos },
} as unknown as PersistedAgentEvent);

function msg(events: PersistedAgentEvent[], over: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm1', role: 'assistant', content: '', createdAt: 1_756_000_000_000,
    runStatus: 'succeeded', endedAt: 1_756_000_001_000, events, ...over,
  } as ChatMessage;
}

const show = (
  message: ChatMessage,
  props: Partial<ComponentProps<typeof AssistantMessage>> = {},
): ReactElement => (
  <I18nProvider initial="zh-CN">
    <AssistantMessage message={message} streaming={false} {...props} />
  </I18nProvider>
);

function activateExecutionRecord(root: ParentNode): void {
  const summary = root.querySelector<HTMLElement>('.assistant-flow > details > summary');
  if (!summary) throw new Error('执行记录壳没有渲染出来');
  fireEvent.click(summary);
}

describe('previousTodos 的取值:更早轮次的那份清单', () => {
  const conversation: ChatMessage[] = [
    { id: 'u1', role: 'user', content: '开工', createdAt: 1 } as ChatMessage,
    msg([todoWrite([
      { content: '搭定价区', status: 'completed' },
      { content: '补 FAQ', status: 'pending' },
    ])], { id: 'a1' }),
    { id: 'u2', role: 'user', content: '顺便问个别的', createdAt: 3 } as ChatMessage,
    msg([{ kind: 'text', text: '答' }] as PersistedAgentEvent[], { id: 'a2' }),
    { id: 'u3', role: 'user', content: '接着干', createdAt: 5 } as ChatMessage,
    msg([todoWrite([{ content: '补 FAQ', status: 'in_progress' }], 'tw-2')], { id: 'a3' }),
  ];

  it('中间那轮没发清单,也要把上一份带下去', () => {
    expect(previousTodosByAssistantMessageId(conversation).get('a2')).toEqual([
      { content: '搭定价区', status: 'completed' },
      { content: '补 FAQ', status: 'pending' },
    ]);
  });

});

function chatPaneEl(
  messages: ChatMessage[],
  props: Partial<ComponentProps<typeof ChatPane>> = {},
) {
  return (
    <I18nProvider initial="zh-CN">
      <ChatPane
        messages={messages}
        streaming={false}
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
        {...props}
      />
    </I18nProvider>
  );
}

describe('〔继续剩余任务〕—— agent 不照做时的用户出口', () => {
  it('成功回合已用本轮 od-done 交付最终总结时,漏收尾的 Todo 快照不再伪装成未完成', () => {
    const onContinueRemainingTasks = vi.fn();
    const doneKey = 'a7f3c91ed2b40561';
    const messages: ChatMessage[] = [
      { id: 'u1', role: 'user', content: '生成一张新图', createdAt: 1 } as ChatMessage,
      msg([
        { kind: 'done_key', key: doneKey },
        todoWrite([
          { content: '生成新图', status: 'completed' },
          { content: '简短总结新图', status: 'in_progress' },
        ]),
        { kind: 'text', text: '图片已经生成。' },
        { kind: 'text', text: `<od-done key="${doneKey}"/>新图已经生成并保存到项目。` },
      ] as PersistedAgentEvent[], { id: 'a1', runStatus: 'succeeded' }),
    ];

    const { getByTestId, queryByTestId } = render(
      chatPaneEl(messages, { onContinueRemainingTasks, onAssistantFeedback: vi.fn() }),
    );

    expect(getByTestId('assistant-label').textContent).toContain('已完成');
    expect(queryByTestId('assistant-continue-remaining')).toBeNull();
  });

  it('最后一轮留着没做完的活时,按钮在,点了把那几条发回去', () => {
    const onContinueRemainingTasks = vi.fn();
    const messages: ChatMessage[] = [
      { id: 'u1', role: 'user', content: '开工', createdAt: 1 } as ChatMessage,
      msg([todoWrite([
        { content: '搭定价区', status: 'completed' },
        { content: '补 FAQ', status: 'pending' },
      ])], { id: 'a1' }),
    ];
    const { getByTestId } = render(chatPaneEl(messages, { onContinueRemainingTasks }));
    fireEvent.click(getByTestId('assistant-continue-remaining'));
    expect(onContinueRemainingTasks).toHaveBeenCalledTimes(1);
    const [assistantMessage, todos] = onContinueRemainingTasks.mock.calls[0]!;
    expect((assistantMessage as ChatMessage).id).toBe('a1');
    expect(todos).toEqual([{ content: '补 FAQ', status: 'pending', activeForm: undefined }]);
  });

  it('这一轮没发清单、但更早那份还欠着 → 出口仍然在', () => {
    const onContinueRemainingTasks = vi.fn();
    const messages: ChatMessage[] = [
      { id: 'u1', role: 'user', content: '开工', createdAt: 1 } as ChatMessage,
      msg([todoWrite([{ content: '补 FAQ', status: 'pending' }])], { id: 'a1' }),
      { id: 'u2', role: 'user', content: '顺便问个别的', createdAt: 3 } as ChatMessage,
      msg([{ kind: 'text', text: '答' }] as PersistedAgentEvent[], { id: 'a2' }),
    ];
    const { getByTestId } = render(chatPaneEl(messages, { onContinueRemainingTasks }));
    fireEvent.click(getByTestId('assistant-continue-remaining'));
    const [assistantMessage, todos] = onContinueRemainingTasks.mock.calls[0]!;
    expect((assistantMessage as ChatMessage).id).toBe('a2');
    expect((todos as Array<{ content: string }>).map((todo) => todo.content)).toEqual(['补 FAQ']);
  });

  it('活全干完了就没有这个出口', () => {
    const onContinueRemainingTasks = vi.fn();
    const messages: ChatMessage[] = [
      { id: 'u1', role: 'user', content: '开工', createdAt: 1 } as ChatMessage,
      msg([todoWrite([{ content: '补 FAQ', status: 'completed' }])], { id: 'a1' }),
    ];
    const { queryByTestId } = render(chatPaneEl(messages, { onContinueRemainingTasks }));
    expect(queryByTestId('assistant-continue-remaining')).toBeNull();
  });

});
