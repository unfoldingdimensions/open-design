/**
 * F3:失败格不再把所有失败画成同一个「失败 + 重试」。
 *
 * daemon 早就把每次失败分类好了(`ProjectMediaTask.error.nextStep`,
 * 见 `packages/contracts/src/api/media.ts:mediaFailureNextStep`)——
 * `402 → add-credit`、`safety_rejection → revise-request` 等九种 verdict。
 * 但 `readImageCall` 把它丢在路上,渲染层只能画一个字:「失败」,
 * 连「重试必再砸」的格子也摆重试按钮。
 *
 * 这里钉两件事:
 *   1. task 背书的行里,失败格把 `error.nextStep` 带进 cell;
 *   2. 没分类的格子(老数据 / JSONL 兜底行)行为一个都没变 ——
 *      下面有专门的反向对照。
 */
import { describe, expect, it } from 'vitest';
import type { PersistedAgentEvent, ProjectMediaTask } from '@open-design/contracts';
import { buildTurnBlocks } from '../../../src/runtime/chat/build-turn-blocks';
import type { ExecutionShell, ImageRow, ShellItem } from '../../../src/runtime/chat/contract';

function images(items: ShellItem[]): ImageRow[] {
  return items.filter((i): i is ImageRow => i.kind === 'image');
}

function rowOf(mediaTasks: ProjectMediaTask[]): ImageRow {
  const blocks = buildTurnBlocks({
    events: [
      {
        kind: 'tool_use',
        id: 'g1',
        name: 'Bash',
        input: { command: 'od media generate a && od media generate b' },
        startedAt: 0,
      } as PersistedAgentEvent,
    ],
    mediaTasks,
    runStatus: 'succeeded',
  });
  const shell = blocks.find((b): b is ExecutionShell => b.kind === 'shell');
  if (!shell) throw new Error('没有生成执行壳');
  const rows = images(shell.items);
  if (rows.length !== 1) throw new Error(`期望一行两格,实际 ${rows.length} 行`);
  return rows[0]!;
}

const task = (over: Partial<ProjectMediaTask> & { taskId: string }): ProjectMediaTask => ({
  runId: 'run',
  surface: 'image',
  status: 'running',
  startedAt: 100,
  endedAt: null,
  elapsed: 0,
  progress: [],
  progressCount: 0,
  ...over,
});

describe('失败格带上 daemon 的 verdict', () => {
  it('failed 任务的 error.nextStep 落进 cell', () => {
    const row = rowOf([
      task({ taskId: 'm1', status: 'done', file: { name: 'a.png' } as never }),
      task({
        taskId: 'm2',
        status: 'failed',
        endedAt: 200,
        error: { message: 'no Fal API key', nextStep: 'open-settings' },
      }),
    ]);
    expect(row.failed).toBe(1);
    expect(row.cells?.[1]).toMatchObject({ taskId: 'm2', status: 'failed', nextStep: 'open-settings' });
  });

  it('interrupted 同样带 verdict', () => {
    const row = rowOf([
      task({ taskId: 'm1', status: 'done', file: { name: 'a.png' } as never }),
      task({
        taskId: 'm2',
        status: 'interrupted',
        endedAt: 200,
        error: { message: 'content refused', code: 'safety_rejection', nextStep: 'revise-request' },
      }),
    ]);
    expect(row.cells?.[1]).toMatchObject({ status: 'failed', nextStep: 'revise-request' });
  });

  it('done / pending 格不带 nextStep', () => {
    const row = rowOf([
      task({ taskId: 'm1', status: 'done', file: { name: 'a.png' } as never }),
      task({ taskId: 'm2', status: 'running' }),
    ]);
    expect(row.cells?.[0]).not.toHaveProperty('nextStep');
    expect(row.cells?.[1]).not.toHaveProperty('nextStep');
  });

  it('反向对照:没分类的失败格维持旧行为 —— 有 status,无 nextStep', () => {
    const row = rowOf([
      task({ taskId: 'm1', status: 'done', file: { name: 'a.png' } as never }),
      task({ taskId: 'm2', status: 'failed', endedAt: 200, error: { message: 'boom' } }),
    ]);
    expect(row.cells?.[1]).toMatchObject({ taskId: 'm2', status: 'failed' });
    expect(row.cells?.[1]).not.toHaveProperty('nextStep');
  });
});
