// End-state (a) fence: CapyDesign has no Cloud identity.
//
// There is no sign-in and no workspace gate. Projects live in one implicit
// local scope, so a caller with no `VELA_*`/`AMR_*` environment and no
// `x-od-workspace-*` headers must still see and drive their own projects.
//
// This is the regression fence for the whole Cloud-surface removal: if the
// workspace gate is ever reintroduced, `GET /api/projects` starts answering
// `[]` (or `400 WORKSPACE_CONTEXT_REQUIRED`) and these specs fail.
import type http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startServer } from '../src/server.js';

/** Every environment name that used to select the removed Cloud surface. */
const REMOVED_CLOUD_ENV = [
  'VELA_BIN',
  'VELA_API_URL',
  'VELA_LINK_URL',
  'VELA_RUNTIME_KEY',
  'VELA_OPENCODE_BIN',
  'VELA_CONTROL_KEY',
  'OPEN_DESIGN_AMR_PROFILE',
  'OPEN_DESIGN_VELA_TELEMETRY',
  'OD_WORKSPACE_CONTEXT_SOURCE',
];

/** Headers that used to *require* a signed-in workspace. */
const WORKSPACE_HEADERS = {
  'x-od-workspace-id': 'workspace-that-must-be-ignored',
  'x-od-workspace-member-id': 'member-that-must-be-ignored',
  'x-od-workspace-type': 'team',
  'x-od-workspace-role': 'member',
  'x-od-workspace-member-status': 'removed',
  'x-od-workspace-lifecycle-state': 'deleted',
  'x-od-workspace-can-share-projects': 'false',
  'x-od-workspace-can-write-synced-files': 'false',
};

describe('daemon runs with no Cloud identity', () => {
  let server: http.Server;
  let baseUrl: string;
  const savedEnv = new Map<string, string | undefined>();

  beforeAll(async () => {
    for (const name of REMOVED_CLOUD_ENV) {
      savedEnv.set(name, process.env[name]);
      delete process.env[name];
    }
    const started = (await startServer({ port: 0, returnServer: true })) as {
      url: string;
      server: http.Server;
    };
    baseUrl = started.url;
    server = started.server;
  });

  afterAll(async () => {
    for (const [name, value] of savedEnv) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  async function createProject(prefix: string) {
    const id = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const resp = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: id }),
    });
    expect(resp.status).toBe(200);
    return id;
  }

  it('lists the real project list to a headerless caller', async () => {
    const projectId = await createProject('local-scope');

    const resp = await fetch(`${baseUrl}/api/projects`);
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { projects?: Array<{ id?: string }> };
    expect(Array.isArray(body.projects)).toBe(true);
    // Not the empty NO-SCOPE catalog the workspace gate used to produce.
    expect(body.projects!.map((project) => project.id)).toContain(projectId);
    expect(JSON.stringify(body)).not.toContain('WORKSPACE_CONTEXT_REQUIRED');
  });

  it('creates, reads back, and starts a run headerless', async () => {
    const projectId = await createProject('headerless');

    const readBack = await fetch(`${baseUrl}/api/projects/${encodeURIComponent(projectId)}`);
    expect(readBack.status).toBe(200);
    const project = (await readBack.json()) as { id?: string };
    expect(project.id).toBe(projectId);

    const runResp = await fetch(`${baseUrl}/api/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        agentId: 'claude',
        message: 'no-cloud-identity fence',
      }),
    });
    const runBody = (await runResp.text()).slice(0, 2_000);
    // The only forbidden outcome is the workspace gate. Anything else (a
    // missing local agent runtime, an unsupported model, …) is a legitimate
    // local answer and must not be masked here.
    expect(runBody).not.toContain('WORKSPACE_CONTEXT_REQUIRED');
    expect(runBody).not.toContain('WORKSPACE_CONTEXT_INCOMPLETE');
    expect(runResp.status).not.toBe(401);
  });

  it('accepts and ignores x-od-workspace-* headers', async () => {
    const headerless = await fetch(`${baseUrl}/api/projects`);
    const withHeaders = await fetch(`${baseUrl}/api/projects`, {
      headers: WORKSPACE_HEADERS,
    });

    expect(withHeaders.status).toBe(headerless.status);
    // A removed member with a deleted workspace, sending every legacy header,
    // must see exactly what a headerless caller sees — the headers are inert.
    expect(await withHeaders.json()).toEqual(await headerless.json());
  });

  it('never answers with the removed workspace gate', async () => {
    const routes = [
      '/api/projects',
      '/api/health',
      '/api/version',
      '/api/workspaces/workspace-that-must-be-ignored/projects',
    ];
    for (const route of routes) {
      const resp = await fetch(`${baseUrl}${route}`);
      const text = await resp.text();
      expect(text, `${route} must not return the removed workspace gate`)
        .not.toContain('WORKSPACE_CONTEXT_REQUIRED');
    }
  });
});
