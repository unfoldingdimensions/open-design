import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildWorkspacePermissions, buildWorkspaceSeatSummary, WorkspaceCollabContext } from '../../src/runtime/collab-contract';
import {
  checkDeploymentLink,
  deleteDesignSystemDraft,
  deleteLiveArtifact,
  deleteProjectFile,
  deployProjectFile,
  designSystemStaticUrl,
  ensureDesignSystemWorkspace,
  fetchDesignSystem,
  fetchDesignSystemFile,
  fetchDesignSystemFiles,
  fetchDesignSystemGenerationJob,
  fetchDesignSystemPreview,
  fetchDesignSystemRevisions,
  fetchDesignSystemShowcase,
  fetchLiveArtifact,
  fetchLiveArtifactCode,
  fetchLiveArtifactRefreshes,
  fetchLiveArtifacts,
  fetchProjectFileText,
  fetchProjectPreviewBaseHref,
  fetchProjectFileVersion,
  fetchProjectFiles,
  fetchProjectDeployments,
  fetchSkill,
  fetchSkillFiles,
  liveArtifactPreviewUrl,
  openProjectInEditor,
  projectRawUrl,
  renewProjectPreviewBaseScope,
  refreshLiveArtifact,
  startDesignSystemGenerationJob,
  startDesignSystemRevisionJob,
  startDesignSystemTokenContractRebuildJob,
  syncDesignSystemAssetsFromWorkspace,
  updateDesignSystemDraft,
  updateDesignSystemRevisionStatus,
} from '../../src/providers/registry';
import {
  createTerminal,
  listConversations,
  loadTabs,
  saveTabs,
  sendTerminalStdin,
  terminalStreamUrl,
} from '../../src/state/projects';
import {
  fetchChatRunStatus,
  listActiveChatRuns,
  reportChatRunFeedback,
} from '../../src/providers/daemon';
import { projectEventsUrl } from '../../src/providers/project-events';

function teamContext(
  workspaceId: string,
  workspaceMemberId: string,
): WorkspaceCollabContext {
  return {
    workspaceId,
    workspaceType: 'team',
    workspaceMemberId,
    role: 'member',
    memberStatus: 'active',
    lifecycleState: 'active',
    billingState: 'active',
    planId: 'team_plus',
    providerMode: 'platform_credits',
    teamId: `team-${workspaceId}`,
    seatSummary: buildWorkspaceSeatSummary({ seatLimit: 3, usedSeats: 2 }),
    permissions: buildWorkspacePermissions({
      role: 'member',
      lifecycleState: 'active',
    }),
  };
}

function requestScope(init?: RequestInit): [string | null, string | null] {
  const headers = new Headers(init?.headers);
  return [
    headers.get('x-od-workspace-id'),
    headers.get('x-od-workspace-member-id'),
  ];
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('persisted project Workspace transport scope', () => {
  it('mints a srcDoc preview base without client-supplied Workspace authority', async () => {
    const workspaceA = teamContext('workspace-a', 'member-a');
    const expiresAt = Date.now() + 60 * 60 * 1000;
    vi.stubGlobal('location', { href: 'od://app/projects/project-1' });
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({
      url: '/api/projects/project-1/preview/scope-1/pages/brand.html',
      file: 'pages/brand.html',
      csp: "default-src 'none'",
      iframeSandbox: 'allow-scripts allow-forms',
      opaqueOrigin: true,
      expiresAt,
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchProjectPreviewBaseHref(
      'project-1',
      'pages/brand.html',
      workspaceA,
    )).resolves.toEqual({
      href: 'od://app/api/projects/project-1/preview/scope-1/pages/',
      expiresAt,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/projects/project-1/preview-url?file=pages%2Fbrand.html',
      {
        cache: 'no-store',
      },
    );
  });

  it('rejects a preview base response for a different project', async () => {
    const workspaceA = teamContext('workspace-a', 'member-a');
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => Response.json({
      url: '/api/projects/project-2/preview/scope-2/brand.html',
      file: 'brand.html',
      csp: "default-src 'none'",
      iframeSandbox: 'allow-scripts allow-forms',
      opaqueOrigin: true,
      expiresAt: Date.now() + 60 * 60 * 1000,
    })));

    await expect(fetchProjectPreviewBaseHref(
      'project-1',
      'brand.html',
      workspaceA,
    )).resolves.toBeNull();
  });

  it('keeps previews working while a new web bundle rolls against an older daemon', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-21T00:00:00Z'));
    vi.stubGlobal('location', { href: 'od://app/projects/project-1' });
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => Response.json({
      url: '/api/projects/project-1/preview/legacy-scope/pages/brand.html',
      file: 'pages/brand.html',
      csp: "default-src 'none'",
      iframeSandbox: 'allow-scripts allow-forms',
      opaqueOrigin: true,
    })));

    await expect(fetchProjectPreviewBaseHref(
      'project-1',
      'pages/brand.html',
    )).resolves.toEqual({
      href: 'od://app/api/projects/project-1/preview/legacy-scope/pages/',
      expiresAt: Date.now() + 45 * 60 * 1000,
    });
    vi.useRealTimers();
  });

  it('renews only a project-matching preview scope through the host-only route', async () => {
    const expiresAt = Date.now() + 60 * 60 * 1000;
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ expiresAt }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(renewProjectPreviewBaseScope(
      'project-1',
      '/api/projects/project-1/preview/scope-0001/pages/',
    )).resolves.toBe(expiresAt);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/projects/project-1/preview/scope-0001/renew',
      {
        method: 'POST',
        cache: 'no-store',
        headers: { 'x-od-preview-scope-renewal': '1' },
      },
    );

    await expect(renewProjectPreviewBaseScope(
      'project-2',
      '/api/projects/project-1/preview/scope-0001/pages/',
    )).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

});
