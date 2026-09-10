// @vitest-environment jsdom
/**
 * F3:失败格的重试按钮跟着 daemon 的 verdict 走,不再是「砸了就给重试」。
 *
 * 原样重发必再砸的 verdict(`revise-request` / `open-settings` / `sign-in` /
 * `add-credit` / `update-app` / `unsupported` / `contact-support`)不再摆按钮 ——
 * 那一格退回「错误图标 + 失败」的状态说明(复用 OPEND-2544 定死的那一档,
 * 见 `image-fail-cell-two-states.test.tsx`),而不是一枚点了白点的假按钮。
 *
 * 还能成的(`retry-later` / `switch-model` —— 后者走重试时 agent 自己换模)
 * 照旧给按钮;没分类的老数据(`nextStep` 缺席)同样照旧,下面有反向对照。
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render as rtlRender } from '@testing-library/react';
import type { ReactElement } from 'react';
import { I18nProvider } from '../../../src/i18n';
import { ImageRow } from '../../../src/components/chat/primitives/ImageRow';
import type { ImageRow as ImageRowData } from '../../../src/runtime/chat/contract';
import type { MediaFailureNextStep } from '@open-design/contracts';

afterEach(cleanup);
const render = (ui: ReactElement) => rtlRender(<I18nProvider initial="zh-CN">{ui}</I18nProvider>);

const rowWithFailedStep = (nextStep?: MediaFailureNextStep): ImageRowData => ({
  kind: 'image',
  id: 'media-batch:b1',
  surface: 'image',
  total: 2,
  done: 1,
  failed: 1,
  thumbs: ['a.png'],
  cells: [
    { taskId: 'one', status: 'done', path: 'a.png' },
    { taskId: 'two', status: 'failed', ...(nextStep ? { nextStep } : {}) },
  ],
  pending: false,
  elapsedMs: null,
});

const failedCell = (root: HTMLElement): HTMLElement => {
  const cell = root.querySelector<HTMLElement>('[data-image-cell="failed"]');
  if (!cell) throw new Error('没有渲染出失败格');
  return cell;
};

describe('失败格 · verdict 决定重试有没有', () => {
  it.each([
    'revise-request',
    'open-settings',
    'sign-in',
    'add-credit',
    'update-app',
    'unsupported',
    'contact-support',
  ] as const)('%s —— 不摆重试按钮,只留状态说明', (nextStep) => {
    const onRetry = vi.fn();
    const { container } = render(<ImageRow row={rowWithFailedStep(nextStep)} onRetry={onRetry} />);
    const cell = failedCell(container);
    expect(cell.querySelector('button'), `${nextStep} 原样重发必再砸,不该有按钮`).toBeNull();
    expect(cell.textContent).toBe('失败');
    expect(cell.getAttribute('data-next-step')).toBe(nextStep);
    expect(cell.getAttribute('data-fail-state')).toBe('locked');
  });

  it.each(['retry-later', 'switch-model'] as const)('%s —— 照旧给重试', (nextStep) => {
    const onRetry = vi.fn();
    const { container } = render(<ImageRow row={rowWithFailedStep(nextStep)} onRetry={onRetry} />);
    const button = failedCell(container).querySelector('button');
    expect(button, `${nextStep} 重发有可能成`).not.toBeNull();
    fireEvent.click(button!);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('反向对照:没分类的老数据照旧给重试', () => {
    const onRetry = vi.fn();
    const { container } = render(<ImageRow row={rowWithFailedStep()} onRetry={onRetry} />);
    const cell = failedCell(container);
    expect(cell.querySelector('button'), '无 verdict 时维持旧行为').not.toBeNull();
    expect(cell.hasAttribute('data-next-step')).toBe(false);
  });

  it('running 优先: verdict 可重试时轮次没停照样不给按钮', () => {
    const onRetry = vi.fn();
    const { container } = render(
      <ImageRow row={{ ...rowWithFailedStep('retry-later'), pending: true }} running onRetry={onRetry} />,
    );
    expect(failedCell(container).querySelector('button')).toBeNull();
  });
});
