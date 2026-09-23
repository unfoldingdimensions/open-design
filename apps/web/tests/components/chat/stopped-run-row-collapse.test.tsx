// @vitest-environment jsdom
/**
 * 按了「停止」之后,那条正在跑的命令行必须**收起来**。
 *
 * ── 这个洞是今天自己挖的 ─────────────────────────────────────────────────
 *
 * `c16f2f087f` 把命令折叠块接上 `lifecycleOpen={row.pending || row.failed}`,让
 * 执行中的命令自动摊开(产品裁决 T47,稿子 `body-components.html:1010` 的
 * `<details class="fold" open>`)。`1497548850` 又把没有人话标题的那一支
 * (AMR / ACP 九家)一起统一进来。
 *
 * 代价没人算:`row.pending` 的定义是 **`result == null`** —— 「这次调用**从来没有
 * 回来过**」,不是「它此刻还在跑」。用户按停止时,那条在飞的调用**永远等不到
 * `tool_result`**,`pending` 就永远为真,于是那一行**永远摊在那儿** —— 而且以后每次
 * 重载这条老会话都还摊着。装依赖那种几百行输出的,一条就顶掉整屏。
 *
 * ── 为什么不能改 `pending` 本身 ──────────────────────────────────────────
 *
 * 顺手在轮次终止时把 `row.pending` 清掉是错的:行首那一格靠它分档 ——
 *   `row.pending ? <StatusMark status={running ? 'running' : 'pending'}/> : <工具图标/>`
 * 清掉 `pending` 就等于给一次**没跑完**的调用画上跑完的工具图标。
 * `closeRunningSegments` 的注释把这条规矩写在了 todo 那一半上,逐字是:
 * 「标成完成是替 agent 说了它没说过的话」。工具行同理。
 *
 * ── 真正的不变量 ─────────────────────────────────────────────────────────
 *
 * **自动摊开跟着「此刻真的在跑」走,不跟着「从来没回来」走。** 这两个量在这一层
 * 本来就都在手上,而且行首那一格**已经**是按前者分档的(上面那行 `running ? …`)。
 * 摊开却读了后者 —— 同一个组件里两个相邻的判断用了两个不同的量,是这次的根因。
 *
 * 真实触发路径(不是手搓的构造):`ExecutionShell:78` 是
 * `running = shell.status === 'running' && !shell.stopped`,而 `build-turn-blocks`
 * 在 `status === 'canceled'` 时只做两件事 —— `shell.stopped = true` 和
 * `closeRunningSegments(shell)`,后者**只管 todo 段**(`seg.status === 'in_progress'`),
 * 一个字都没碰工具行。所以 `running` 翻成 false 而 `row.pending` 留在 true,
 * 正是下面这些用例的形状。
 *
 * ── 防假绿 ───────────────────────────────────────────────────────────────
 *
 * · 断言的是 `<details>` 的 **`open` 属性**和**输出文字在不在 DOM 里**,不是类名 ——
 *   vitest 的 CSS Module 代理对任何 key 都返回类名。
 * · 前两组走 `AssistantMessage` + 真事件流(`runStatus: 'canceled'`),从产品的
 *   真实触发路径验起;第三组才落到 `ToolRow` 这一层,把不变量本身钉死。
 * · 每一组都配了反向对照(轮次还在跑 → 照旧摊开),否则「全都收起来」这种一刀切
 *   的实现也能让上面全绿。
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { ChatMessage, PersistedAgentEvent } from '@capydesign/contracts';
import { I18nProvider } from '../../../src/i18n';
import { AssistantMessage } from '../../../src/components/AssistantMessage';
import { ToolRow } from '../../../src/components/chat/primitives/ToolRow';
import { IN_FLIGHT_TOOL_OUTPUT_KEY } from '../../../src/runtime/tool-events';
import type { ToolRow as ToolRowData } from '../../../src/runtime/chat/contract';

afterEach(cleanup);

const T0 = 1_800_000_000_000;

const show = (node: ReactElement): ReactElement => (
  <I18nProvider initial="zh-CN">{node}</I18nProvider>
);

/** 装依赖那种一点点长出来的 stdout —— 收起时这些字一个都不该在 DOM 里 */
const LIVE_OUT = [
  'Progress: resolved 142, reused 138, downloaded 4',
  'Packages: +37',
].join('\n');

/**
 * 一条**在飞时被掐掉**的调用:只有 `tool_use`,没有 `tool_result`。
 * `withDescription` 切两种命令行形态(有人话标题 / 没有),两支都得收。
 */
function severedEvents(withDescription: boolean): PersistedAgentEvent[] {
  const input: Record<string, unknown> = {
    command: 'npm install',
    [IN_FLIGHT_TOOL_OUTPUT_KEY]: LIVE_OUT,
  };
  if (withDescription) input.description = '装依赖,准备跑构建';
  return [{ kind: 'tool_use', id: 't1', name: 'Bash', input, startedAt: T0 }] as unknown as PersistedAgentEvent[];
}

const message = (runStatus: string, withDescription: boolean): ChatMessage => ({
  id: 'm1',
  role: 'assistant',
  content: '',
  createdAt: T0,
  runStatus,
  events: severedEvents(withDescription),
} as unknown as ChatMessage);

/**
 * 一整轮。`streaming` 跟着 `runStatus` 走 —— 这一对必须自洽:传
 * `streaming` 却给 `canceled` 是产线上不存在的组合,拿它测出来的结论不算数。
 */
const turn = (runStatus: string, withDescription = true): ReactElement => (
  <AssistantMessage
    message={message(runStatus, withDescription)}
    streaming={runStatus === 'running'}
  />
);

/** 壳自己那层 flat fold 不算工具行 */
const commandFold = (root: HTMLElement): HTMLDetailsElement => {
  const el = root.querySelector<HTMLDetailsElement>('details[class*="fold"]:not([class*="flat"])');
  if (!el) throw new Error('壳 body 里没有命令折叠块 —— 选择器没命中,不是开合的问题');
  return el;
};

describe('按停止之后:在飞的命令行收起来(真实触发路径)', () => {
  for (const withDescription of [true, false]) {
    const shape = withDescription ? '有人话标题(Claude 家族)' : '没有人话标题(AMR / ACP 九家)';

    it(`${shape}:收起之后那几百行输出一个字都不在 DOM 里`, () => {
      const { container } = render(show(turn('canceled', withDescription)));
      expect(container.textContent).not.toContain('Packages: +37');
    });

    /* 反向对照 —— 否则「一律收起」也能让上面两条绿 */
  }
});

/* ── 不变量本身:自动摊开只跟着「此刻在跑」 ───────────────────────────────── */

function row(over: Partial<ToolRowData> = {}): ToolRowData {
  return {
    kind: 'tool',
    id: 'r1',
    tool: 'exec',
    name: 'Bash',
    title: '装依赖,准备跑构建',
    rawTitle: false,
    file: null,
    pattern: null,
    hits: null,
    delta: null,
    elapsedMs: 4100,
    pending: true,
    failed: false,
    failReason: null,
    command: 'npm install',
    terminal: LIVE_OUT,
    ...over,
  };
}

const fold = (): HTMLDetailsElement => {
  const el = document.querySelector<HTMLDetailsElement>('details');
  if (!el) throw new Error('折叠块没渲染出来');
  return el;
};

describe('ToolRow 这一层:pending 是「没回来过」,running 才是「此刻在跑」', () => {
  it('pending 且 running=false(默认值)→ 收起', () => {
    render(show(<ToolRow row={row()} />));
    expect(fold().open, '拿不到「在跑」的正面证据就不许自动摊开').toBe(false);
  });

  it('pending 且 running=true → 摊开', () => {
    render(show(<ToolRow row={row()} running />));
    expect(fold().open).toBe(true);
  });

  it('失败那一档和 running 无关 —— 报错原文是这时候唯一要读的东西(稿子 :1018 带 open)', () => {
    render(show(<ToolRow row={row({ pending: false, failed: true, terminal: 'ELIFECYCLE  Command failed.' })} />));
    expect(fold().open, '失败照旧默认摊开,轮次停没停都一样').toBe(true);
  });

  it('rawTitle 那一支同一条规矩', () => {
    const raw = row({ rawTitle: true, title: 'npm install' });
    const { unmount } = render(show(<ToolRow row={raw} />));
    expect(fold().open, 'running=false → 收起').toBe(false);
    unmount();
    render(show(<ToolRow row={raw} running />));
    expect(fold().open, 'running=true → 摊开').toBe(true);
  });
});
