// Design-system catalog/create are data-plane operations. They must resolve
// their Workspace from the request identity, not from the daemon's mutable
// active/current Workspace. Otherwise two tabs can cross: an A request that
// lands after a B switch is listed/stamped as B.

import type http from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer } from '../../src/server.js';

type StartedServer = {
  url: string;
  server: http.Server;
  shutdown?: () => Promise<void> | void;
};

const CONTEXT_WS1 = {
  workspaceMemberId: 'member-switch',
  workspaceId: 'ws-switch-one',
  workspaceType: 'team',
  role: 'owner',
  memberStatus: 'active',
  lifecycleState: 'active',
};

const CONTEXT_WS2 = {
  workspaceMemberId: 'member-switch',
  workspaceId: 'ws-switch-two',
  workspaceType: 'personal',
  role: 'owner',
  memberStatus: 'active',
  lifecycleState: 'active',
};

// The dev/demo seam (`workspaceContext.set`), NOT `PUT /api/workspace/active`:
// this is deliberately the same shape as a Vela-Web-driven switch — the
// daemon's notion of "current" context changes, but no local pin is written.
async function setContext(baseUrl: string, context: unknown): Promise<void> {
  const resp = await fetch(`${baseUrl}/api/workspace/context`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(context),
  });
  expect(resp.ok).toBe(true);
}

function workspaceHeaders(context: typeof CONTEXT_WS1 | typeof CONTEXT_WS2): Record<string, string> {
  return {
    'x-od-workspace-id': context.workspaceId,
    'x-od-workspace-member-id': context.workspaceMemberId,
    'x-od-workspace-type': context.workspaceType,
    'x-od-workspace-role': context.role,
    'x-od-workspace-member-status': context.memberStatus,
    'x-od-workspace-lifecycle-state': context.lifecycleState,
  };
}


describe('resolveDesignSystemWorkspaceScope — stale local pins are never data-plane authority', () => {
  // This function's session-liveness gate (`collab.workspaceContext.lastKnown()`)
  // is untouched by the TTL-cache fix above — this suite exists to prove
  // removing that cache did not also disturb the gate. A fresh server
  // instance is used (rather than reusing the suite above) so its
  // `activeWorkspace` pin-file reader starts with an empty in-memory cache and
  // performs its first disk read AFTER the stale pin below is written —
  // mirroring a real daemon restart finding a leftover pin file on disk.
  let server: http.Server;
  let baseUrl: string;
  let shutdown: (() => Promise<void> | void) | undefined;

  beforeAll(async () => {
    // A stale local pin exactly like a real leftover from a previous identity
    // — `velaLogout` never clears this file (only a CONFIRMED member-removal
    // does; see `resolvePinnedWorkspace` in vela-workspace-context.ts).
    const dataDir = process.env.OD_DATA_DIR!;
    writeFileSync(
      path.join(dataDir, 'workspace-selection.json'),
      `${JSON.stringify({ workspaceId: 'ws-stale-pin' }, null, 2)}\n`,
    );
    // A design system claimed by the pinned workspace, seeded directly on
    // disk so this suite is independent of the other describe block's state.
    const dsDir = path.join(dataDir, 'design-systems', 'pinned-claim');
    mkdirSync(dsDir, { recursive: true });
    writeFileSync(path.join(dsDir, 'DESIGN.md'), '# Pinned claim\n\nSeeded directly on disk.\n');
    writeFileSync(
      path.join(dsDir, 'metadata.json'),
      `${JSON.stringify({ title: 'Pinned claim', workspaceId: 'ws-stale-pin' }, null, 2)}\n`,
    );

    const started = (await startServer({ port: 0, returnServer: true })) as StartedServer;
    baseUrl = started.url;
    server = started.server;
    shutdown = started.shutdown;
  });

  afterAll(async () => {
    await Promise.resolve(shutdown?.());
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('ignores a stale pin when an explicit request names another Workspace', async () => {
    const resp = await fetch(`${baseUrl}/api/design-systems`, {
      headers: workspaceHeaders(CONTEXT_WS2),
    });
    const body = (await resp.json()) as { designSystems: Array<{ id: string }> };
    expect(body.designSystems.some((d) => d.id === 'user:pinned-claim')).toBe(false);
  });

  it('quarantines a metadata-only claim without an exact member ownership envelope', async () => {
    const resp = await fetch(`${baseUrl}/api/design-systems`, {
      headers: workspaceHeaders({
        ...CONTEXT_WS1,
        workspaceId: 'ws-stale-pin',
      }),
    });
    const body = (await resp.json()) as { designSystems: Array<{ id: string }> };
    expect(body.designSystems.some((d) => d.id === 'user:pinned-claim')).toBe(false);
  });
});
