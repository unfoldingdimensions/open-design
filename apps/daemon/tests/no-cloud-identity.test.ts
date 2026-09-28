// WS6 acceptance fence — the daemon must be usable with NO Cloud identity.
//
// The failure this pins (end state (a)): with sign-in removed but the workspace
// identity gate still in place, the daemon locks its own user out of their own
// projects — `GET /api/projects` answers `[]` (the NO-SCOPE catalog) or
// `400 WORKSPACE_CONTEXT_REQUIRED`, and project/run calls are refused to a
// caller that presents no `x-od-workspace-*` headers.
//
// CapyDesign has no Cloud: projects live in one implicit local scope. So a
// headerless caller — the `capt` CLI's normal shape, and a plain `curl` — must
// see the real project list, be able to create a project, be able to start a
// run, and never be answered `WORKSPACE_CONTEXT_REQUIRED`.
//
// This runs at the daemon HTTP boundary: the cheapest layer that can observe
// the symptom, so a regression that re-introduces the gate fails here.
import type http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startServer } from '../src/server.js';

/**
 * Every environment variable the removed Cloud/AMR/Vela surface read. The test
 * deletes them all, so "no Cloud identity" is a fact about the process this
 * suite runs in, not an assumption about the developer's shell.
 */
const CLOUD_ENV_KEYS = [
  'VELA_BIN',
  'VELA_API_URL',
  'VELA_LINK_URL',
  'VELA_RUNTIME_KEY',
  'VELA_OPENCODE_BIN',
  'VELA_ENABLE_PARALLEL_MCP',
  'OPEN_DESIGN_AMR_PROFILE',
  'AMR_CLIENT_SOURCE',
  'OPENCODE_TEST_HOME',
  'OD_WORKSPACE_CONTEXT_SOURCE',
] as const;

describe('daemon without Cloud identity (WS6 end state (a))', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    for (const key of CLOUD_ENV_KEYS) delete process.env[key];
    const started = (await startServer({ port: 0, returnServer: true })) as {
      url: string;
      server: http.Server;
    };
    baseUrl = started.url;
    server = started.server;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('starts with no VELA_/AMR environment at all', () => {
    const present = CLOUD_ENV_KEYS.filter((key) => process.env[key] !== undefined);
    expect(present).toEqual([]);
  });

  it('returns the real project list to a headerless GET /api/projects', async () => {
    const projectId = `ws6-headerless-${Date.now()}`;

    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: projectId, name: 'WS6 headerless project' }),
    });
    expect(createRes.status).toBe(200);
    const created = (await createRes.json()) as { project?: { id?: string } };
    expect(created.project?.id).toBe(projectId);

    // No `x-od-workspace-*` headers anywhere on this request.
    const listRes = await fetch(`${baseUrl}/api/projects`);
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as { projects?: Array<{ id?: string }> };

    // Not `[]` (the lock), not a 400 (the gate): the project we just created,
    // headerless, is actually there.
    expect(Array.isArray(list.projects)).toBe(true);
    expect(list.projects!.length).toBeGreaterThan(0);
    expect(list.projects!.some((project) => project.id === projectId)).toBe(true);
  });

  it('starts a run headerless and never answers WORKSPACE_CONTEXT_REQUIRED', async () => {
    const projectId = `ws6-run-${Date.now()}`;
    await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: projectId, name: 'WS6 headerless run' }),
    });

    const runRes = await fetch(`${baseUrl}/api/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        projectId,
        prompt: 'headerless run admission',
        sessionMode: 'chat',
      }),
    });
    const runBody = await runRes.text();

    // Admission may fail for unrelated local reasons (no agent CLI installed on
    // the test host), but it must never fail because no workspace identity was
    // presented.
    expect(runBody).not.toContain('WORKSPACE_CONTEXT_REQUIRED');
    expect(runRes.status).not.toBe(401);

    // Read back: the run route answers headerless too.
    const statusRes = await fetch(`${baseUrl}/api/runs?projectId=${encodeURIComponent(projectId)}`);
    expect(statusRes.status).toBe(200);
    expect(await statusRes.text()).not.toContain('WORKSPACE_CONTEXT_REQUIRED');
  });
});
