// @vitest-environment jsdom
/**
 * 【产品裁决 2026-09-04】**done 标记一到,进行中那张执行记录卡就自己收起来** ——
 * 不等整轮跑完。
 *
 * 用户原话:「然后输出 done 标记之后,上面的**进行中展开收起卡片,就应该自动收起**,
 * 而不是等到整个对话 run 完了再收起」。截图里:两个已完成的步骤连着它们的工具行还
 * 全摊着,而正文已经在下面开始输出「已交付 parchment-typography-one-pager.html ——」。
 *
 * ── 为什么这不是 OPEND-2557 那一条的重复 ────────────────────────────────
 *
 * `shell-collapse-on-finish.test.tsx` 钉的是「**run 结束**要收起」,判据是
 * `shell.status` 从 `running` 翻成 `done`。那一条改动之前就绿,它看不见这里的缺陷:
 * done 标记到达时 run **还在跑**(`runStatus: 'running'`、壳仍是 `running`),
 * 于是 `lifecycleOpen = running || stopped` 照旧为真,卡就一直摊着 ——
 * 摊到流真正关闭为止,而那可能是几十秒之后(结论本身还在一个字一个字地写)。
 *
 * 所以下面这一整套的**时刻**都压在「done 到了、run 没完」那一帧上:
 * 每一条断言的前置条件里 `runStatus` 都是 `running`。
 *
 * ── 走整条真实链路,不手搭壳 ────────────────────────────────────────────
 *
 * 判据是「**done 标记**到达」,而认标记这件事住在 `buildTurnBlocks` 里
 * (每轮一次性密钥 `<od-done key="…"/>`,配一条 `done_key` 事件)。手搭一个
 * `ExecutionShell` 的 props 等于自己替它判一遍 done,那测的就不是真实触发路径了。
 * 所以这里从 `AssistantMessage` 喂事件流进去。
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ReactElement } from 'react';
import type { ChatMessage, PersistedAgentEvent } from '@capydesign/contracts';
import { I18nProvider } from '../../../src/i18n';
import { AssistantMessage } from '../../../src/components/AssistantMessage';

afterEach(cleanup);

const T0 = 1_800_000_000_000;
const KEY = 'a7f3c91ed2b40561';

/*
 * ⚠️ 夹具**逐字段满足契约**,没有一处 `as`。
 * 这里踩过:`tool_use` 的时刻字段是 `startedAt` 不是 `at`,`tool_result` 认的是
 * `toolUseId` 不是 `id` —— 拿 `as PersistedAgentEvent` 压过去的话,窄跑 vitest 全绿
 * (vitest 不做全量类型检查),只有 `pnpm typecheck` 照得出来,而那时这套测试
 * 已经在证明一个产品**产不出来**的事件形状了。
 */
/** 一条正在跑的轮次:密钥 → 一次工具调用 → 一段过程叙述 */
const BEFORE_DONE: PersistedAgentEvent[] = [
  { kind: 'done_key', key: KEY },
  { kind: 'tool_use', id: 't1', name: 'Read', input: { file_path: 'a.ts' }, startedAt: T0 + 1_000 },
  { kind: 'tool_result', toolUseId: 't1', content: 'ok', isError: false, completedAt: T0 + 2_000 },
  { kind: 'text', text: '构建单文件 HTML 一页纸。' },
];

/** 同一条流,再往后一帧:done 标记 + 结论的头几个字 */
const AFTER_DONE: PersistedAgentEvent[] = [
  ...BEFORE_DONE,
  { kind: 'text', text: `<od-done key="${KEY}"/>已交付 parchment-typography-one-pager.html ——` },
];

/** ⚠️ `runStatus` 一律 `running`:这一套钉的是「done 到了」,不是「run 完了」 */
const live = (events: PersistedAgentEvent[]): ReactElement => {
  const message: ChatMessage = {
    id: 'm1', role: 'assistant', content: '', createdAt: T0, runStatus: 'running', events,
  };
  return (
    <I18nProvider initial="zh-CN">
      <AssistantMessage message={message} streaming />
    </I18nProvider>
  );
};

/** 执行记录那张卡(壳是 `variant="flat"` 的那一层) */
function shellCard(root: HTMLElement): HTMLDetailsElement {
  const el = root.querySelector<HTMLDetailsElement>('details[class*="flat"]');
  if (!el) throw new Error('执行记录卡没渲染出来 —— 选择器没命中,不是折叠态的问题');
  return el;
}

/** 浏览器在受控 `open` 被写回时派发的那一次 —— 不是用户点的(OPEND-2557) */
const echoToggle = (el: HTMLDetailsElement): void => {
  fireEvent(el, new Event('toggle', { bubbles: false }));
};

/**
 * **收起这件事只准动折叠态,不准动壳身子的排版。**
 *
 * 曾经在这里加过一段手风琴过渡(`.fold.flat::details-content` 上
 * `display:grid` + `grid-template-rows:0fr↔1fr` + `overflow:hidden`),让「done 一到就收」
 * 不要瞬间把还在流的正文往上拽。用户 2026-09-04 随后在真机上报了一个布局缺陷:
 * **思考正文那个限高盒(`.body.scroll`,`max-height:96px`)滚不到底**,最后一行被裁在下沿。
 * 那段规则是当时唯一动过壳身子格式化上下文的改动 —— 把 `.body` 从普通流里的块变成
 * 栅格项、外面再套一层 `overflow:hidden` —— 于是先撤下(它也不是任何产品裁决要的东西,
 * 产品要的只是收起的**时机**)。
 *
 * ⚠️ 下面这条守卫**不证明**那段规则就是真因(证据反而不指向它:用户说刷新一下就好了,
 * 而纯 CSS 规则刷新后一模一样地生效)。它钉的是**流程**:这一层 DOM 里嵌着一个
 * `max-height` 的滚动盒,任何在它外面新加格式化上下文的改动都必须先在**真浏览器**里、
 * 在「内容一边长一边算」的场景下验过 —— jsdom 不做布局(`scrollHeight`/`clientHeight`
 * 恒为 0),这个仓库那套「真跑层叠」的量尺也只解层叠不做布局,**单测绿在这件事上不是证据**。
 */
describe('收起的动作本身', () => {
  it('壳身子外面不许再包一层格式化上下文 —— 里面还嵌着一个限高滚动盒', () => {
    const css = readFileSync(
      resolve(__dirname, '../../../src/components/chat/primitives/record.module.css'),
      'utf8',
    ).replace(/\/\*[\s\S]*?\*\//g, '');

    // 正向对照:这份样式表确实读进来了,而且那个限高盒还在
    expect(css, '`.body.scroll` 的 96px 限高是这条守卫保护的对象').toMatch(
      /\.fold\s+\.body\.scroll\s*\{[^}]*max-height/,
    );

    expect(
      /\.fold\.flat::details-content/.test(css),
      '要给壳加收起动画,先在真浏览器里验限高盒还滚不滚得到底 —— 单测看不见布局',
    ).toBe(false);
  });
});
