// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  buildWorkspacePermissions,
  type WorkspaceCollabContext,
} from '@capydesign/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../src/App';
// Stand-ins: the module that provided these was removed with the Cloud surface.
const notifyAmrLoginStatusChanged: any = (..._args: unknown[]) => null;
import type {
  ProjectNameAuthorityResolution,
  ProjectRenameFenceToken,
} from '../../src/components/ProjectView';
import type { AgentInfo, AppConfig, Project } from '../../src/types';
import {
  fetchComposioConfigFromDaemon,
  fetchDaemonConfig,
  loadConfig,
  mergeDaemonConfig,
  saveConfig,
  syncComposioConfigToDaemon,
  syncConfigToDaemon,
} from '../../src/state/config';
import {
  daemonIsLive,
  fetchAgentsStream,
  fetchAppVersionInfo,
  fetchDesignSystems,
  fetchDesignTemplates,
  fetchPromptTemplates,
  fetchSkills,
  replaceProjectWorkingDir,
  uploadProjectFiles,
} from '../../src/providers/registry';
import {
  createDesignSystemProjectFromProject,
  createProject,
  createPluginShareProject,
  deleteProject,
  duplicateProject,
  getProject,
  invalidatePluginCatalogCache,
  listProjects,
  listTemplates,
  patchProject,
} from '../../src/state/projects';
// Stand-ins: the module that provided these was removed with the Cloud surface.
const WORKSPACE_CONTEXT_REFRESH_EVENT: any = (props: any) => props?.children ?? null;
const notifyWorkspaceContextRefresh: any = (..._args: unknown[]) => null;
const resetTeamProjectsCache: any = (..._args: unknown[]) => null;
const resetWorkspaceContextCache: any = (..._args: unknown[]) => null;
const currentWorkspaceAccountGeneration: any = (..._args: unknown[]) => null;
const workspaceIdentityCacheKey: any = (..._args: unknown[]) => null;
import { resetCoalescedGet } from '../../src/lib/coalesced-get';
import {
  projectDisplaySnapshotKey,
  readProjectDisplaySnapshot,
  resetProjectDisplaySnapshots,
  writeProjectDisplaySnapshot,
} from '../../src/state/project-display-cache';
// Stand-ins: the module that provided these was removed with the Cloud surface.
type AmrAuthRetryContinuation = any;
import type { VelaLoginStatus } from '../../src/providers/daemon';
import { workspaceDirectoryFixture } from '../helpers/workspace-context';

const workspaceInvalidationHarness = vi.hoisted(() => ({
  handlers: [] as Array<Record<string, (payload: any) => void>>,
  onActive: [] as Array<() => void>,
}));

const iframePoolHarness = vi.hoisted(() => ({
  evictMatching: vi.fn(),
  evictProject: vi.fn(),
}));

const projectViewRenameFenceHarness = vi.hoisted(() => ({
  token: null as ProjectRenameFenceToken | null,
}));

const workspaceTabsHarness = vi.hoisted(() => ({
  projectIds: new Set<string>(),
}));

vi.mock('../../src/collab/workspace-events', () => ({
  useWorkspaceInvalidation: vi.fn((
    handlers: Record<string, (payload: any) => void>,
    options?: { onActive?: () => void },
  ) => {
    workspaceInvalidationHarness.handlers.push(handlers);
    if (options?.onActive) workspaceInvalidationHarness.onActive.push(options.onActive);
    return { connected: false };
  }),
}));

vi.mock('../../src/components/IframeKeepAlivePool', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useIframeKeepAlivePool: () => ({
    attach: vi.fn(),
    release: vi.fn(),
    evict: vi.fn(),
    evictProject: iframePoolHarness.evictProject,
    evictMatching: iframePoolHarness.evictMatching,
    subscribe: vi.fn(() => () => {}),
    revision: vi.fn(() => 0),
  }),
}));

vi.mock('../../src/components/EntryView', () => ({
  EntryView: ({
    onCreateProject,
    onCreatePluginShareProject,
    onDeleteProject,
    onImportFolderResponse,
    onOpenProject,
    onRenameProject,
    onOpenSettings,
    onRefreshAgents,
    agents,
    amrLoggedIn,
    projects,
    projectsLoading,
  }: {
    onCreateProject: (input: unknown) => boolean | Promise<boolean>;
    onCreatePluginShareProject: (
      pluginId: string,
      action: 'publish-github' | 'contribute-open-design',
    ) => Promise<unknown>;
    onDeleteProject: (id: string) => void;
    onImportFolderResponse?: (response: {
      conversationId: string;
      entryFile: string | null;
      ok: true;
      projectId: string;
    }) => Promise<void> | void;
    onOpenProject: (
      id: string,
      fileName?: string,
      projectTitleHint?: {
        authoritative: boolean;
        name: string;
        workspaceId: string | null;
        workspaceMemberId: string | null;
      },
    ) => Promise<boolean> | boolean | void;
    onRenameProject?: (id: string, name: string) => Promise<void> | void;
    onOpenSettings: () => void;
    onRefreshAgents: () => void | Promise<void>;
    agents: AgentInfo[];
    amrLoggedIn?: boolean | null;
    projects: Project[];
    projectsLoading?: boolean;
  }) => (
    <main>
      <div data-testid="entry-home-surface" />
      <div data-testid="amr-login-status">{String(amrLoggedIn)}</div>
      <div data-testid="entry-projects-loading">{String(Boolean(projectsLoading))}</div>
      <button
        type="button"
        onClick={() => {
          void Promise.resolve(onCreateProject({
            name: 'Fresh project',
            skillId: null,
            designSystemId: null,
            metadata: { kind: 'prototype' },
          })).catch(() => {});
        }}
      >
        Create project
      </button>
      <button
        type="button"
        onClick={() => {
          void Promise.resolve(onCreateProject({
            name: 'Prompted project',
            skillId: null,
            designSystemId: null,
            pendingPrompt: 'Build the retained artifact prompt',
            pendingFiles: [new File(['brief'], 'brief.txt', { type: 'text/plain' })],
            autoSendFirstMessage: true,
            metadata: { kind: 'prototype' },
          })).catch(() => {});
        }}
      >
        Create prompted project
      </button>
      <button
        type="button"
        onClick={() => void onCreatePluginShareProject(
          'plugin-source',
          'publish-github',
        )}
      >
        Create plugin share project
      </button>
      <button
        type="button"
        onClick={() =>
          onCreateProject({
            name: 'Dir project',
            skillId: null,
            designSystemId: null,
            metadata: { kind: 'prototype', userWorkingDir: '/Users/me/external' },
            userWorkingDirToken: 'wd-token',
            pendingFiles: [new File(['hi'], 'note.txt', { type: 'text/plain' })],
          })
        }
      >
        Create project with working dir
      </button>
      <button
        type="button"
        onClick={() =>
          onCreateProject({
            name: 'Many attachment project',
            skillId: null,
            designSystemId: null,
            metadata: { kind: 'prototype', userWorkingDir: '/Users/me/external' },
            userWorkingDirToken: 'wd-token',
            pendingPrompt: 'Make a deck from these',
            autoSendFirstMessage: true,
            pendingFiles: Array.from(
              { length: 6 },
              (_unused, index) =>
                new File([`shot-${index}`], `shot-${index}.png`, { type: 'image/png' }),
            ),
          })
        }
      >
        Create project with many attachments
      </button>
      <button
        type="button"
        onClick={() =>
          onCreateProject({
            name: 'Context dir project',
            skillId: null,
            designSystemId: null,
            metadata: { kind: 'prototype', linkedDirs: ['/Users/me/existing'] },
            linkedDirs: ['/Users/me/reference', ' /Users/me/reference ', '/Users/me/local-code'],
          })
        }
      >
        Create project with context dirs
      </button>
      <button
        type="button"
        onClick={() =>
          void onImportFolderResponse?.({
            conversationId: 'conv-import',
            entryFile: null,
            ok: true,
            projectId: 'project-new',
          })
        }
      >
        Host import folder
      </button>
      <button type="button" onClick={() => void onRefreshAgents()}>
        Refresh agents
      </button>
      <button type="button" onClick={onOpenSettings}>
        Open settings from home
      </button>
      <button type="button" onClick={() => void onOpenProject('project-missing')}>
        Open missing project
      </button>
      <button
        type="button"
        onClick={() => projects[0] && void onRenameProject?.(projects[0].id, 'Rename A')}
      >
        Rename first project A
      </button>
      <button
        type="button"
        onClick={() => projects[0] && void onRenameProject?.(projects[0].id, 'Rename B')}
      >
        Rename first project B
      </button>
      <button
        type="button"
        onClick={() =>
          void onOpenProject('project-shared', undefined, {
            authoritative: true,
            name: 'Catalog authority',
            workspaceId: 'ws-1',
            workspaceMemberId: 'wm-1',
          })
        }
      >
        Open catalog project
      </button>
      <button
        type="button"
        onClick={() =>
          void onOpenProject('project-shared', undefined, {
            authoritative: true,
            name: 'New card authority',
            workspaceId: 'ws-1',
            workspaceMemberId: 'wm-1',
          })
        }
      >
        Open updated catalog project
      </button>
      <button
        type="button"
        onClick={() =>
          void onOpenProject('project-own', undefined, {
            authoritative: false,
            name: 'Own local project',
            workspaceId: 'ws-1',
            workspaceMemberId: 'wm-1',
          })
        }
      >
        Open own unbound project
      </button>
      <button
        type="button"
        onClick={() =>
          void onOpenProject('project-same', undefined, {
            authoritative: true,
            name: 'Workspace A catalog',
            workspaceId: 'ws-a',
            workspaceMemberId: 'member-ws-a',
          })
        }
      >
        Open workspace A project
      </button>
      <button
        type="button"
        onClick={() =>
          void onOpenProject('project-same', undefined, {
            authoritative: false,
            name: 'Workspace A stale own title',
            workspaceId: 'ws-a',
            workspaceMemberId: 'member-ws-a',
          })
        }
      >
        Open stale own workspace A project
      </button>
      <div data-testid="entry-agent-list">
        {agents.map((agent) => (
          <span key={agent.id} data-testid={`entry-agent-${agent.id}`}>
            {agent.name}
          </span>
        ))}
      </div>
      {projects.map((project) => (
        <div key={project.id} data-testid={`entry-project-${project.id}`}>
          <span>{project.name}</span>
          <button type="button" onClick={() => onOpenProject(project.id)}>
            Open {project.name}
          </button>
          <button type="button" onClick={() => void onDeleteProject(project.id)}>
            Delete {project.name}
          </button>
        </div>
      ))}
    </main>
  ),
}));

vi.mock('../../src/components/ProjectView', () => ({
  ProjectView: ({
    onBack,
    onCreateProjectFromDesignSystem,
    onCreateDesignSystemFromProject,
    onDuplicateProject,
    onProjectsRefresh,
    onProjectChange,
    onProjectRenameStarted,
    onProjectRenameSettled,
    project,
    routeConversationId,
    authoritativeProjectName,
    projectAuthorizationKey,
    resolveAuthoritativeProjectName,
    amrAuthRetryContinuation,
    onArmAmrAuthRetryContinuation,
    onConsumeAmrAuthRetryContinuation,
    onOpenAmrSettings,
    onOpenSettings,
    workspaceContextOverride,
  }: {
    onBack: () => void;
    onCreateProjectFromDesignSystem?: (designSystemId: string, title: string) => Promise<void> | void;
    onCreateDesignSystemFromProject?: (
      sourceProjectId: string,
      input: { name?: string; pendingPrompt?: string },
    ) => Promise<void> | void;
    onDuplicateProject?: (
      sourceProjectId: string,
      input?: { name?: string },
    ) => Promise<void> | void;
    onProjectsRefresh: () => Promise<void>;
    onProjectChange: (project: Project) => void;
    onProjectRenameStarted?: (project: Project) => ProjectRenameFenceToken | null;
    onProjectRenameSettled?: (
      token: ProjectRenameFenceToken | null,
      project: Project,
    ) => void;
    project: Project;
    routeConversationId?: string | null;
    authoritativeProjectName?: string;
    projectAuthorizationKey?: string;
    resolveAuthoritativeProjectName?: (
      projectId: string,
      expectedAuthorizationKey: string,
    ) => Promise<ProjectNameAuthorityResolution>;
    amrAuthRetryContinuation?: AmrAuthRetryContinuation | null;
    onArmAmrAuthRetryContinuation?: (
      continuation: Omit<AmrAuthRetryContinuation, 'accountIdAtArm' | 'createdAtMs'>,
    ) => void;
    onConsumeAmrAuthRetryContinuation?: (
      continuation: AmrAuthRetryContinuation,
    ) => boolean;
    onOpenAmrSettings?: () => void;
    onOpenSettings?: () => void;
    workspaceContextOverride?: WorkspaceCollabContext | null;
  }) => (
    <main data-testid="project-view">
      <span data-testid="project-title">{project.name}</span>
      <span data-testid="project-authoritative-title">{authoritativeProjectName ?? 'none'}</span>
      <span data-testid="project-workspace-id">{project.workspaceId ?? 'unbound'}</span>
      <span data-testid="project-route-workspace-context">
        {workspaceContextOverride
          ? `${workspaceContextOverride.workspaceId}:${workspaceContextOverride.workspaceMemberId}`
          : 'none'}
      </span>
      <span data-testid="project-route-conversation">{routeConversationId ?? 'none'}</span>
      <span data-testid="project-auth-continuation">
        {amrAuthRetryContinuation?.assistantId ?? 'none'}
      </span>
      <button type="button" onClick={onBack}>
        Back to projects
      </button>
      <button
        type="button"
        onClick={() => void onCreateDesignSystemFromProject?.(project.id, {
          name: 'Derived design system',
          pendingPrompt: 'Extract the retained design system prompt',
        })}
      >
        Extract design system project
      </button>
      <button
        type="button"
        onClick={() => void onDuplicateProject?.(project.id, {
          name: 'Scoped duplicate',
        })}
      >
        Duplicate project
      </button>
      <button type="button" onClick={onOpenSettings}>
        Open settings from project
      </button>
      <button type="button" onClick={() => void onProjectsRefresh()}>
        Refresh projects
      </button>
      <button
        type="button"
        onClick={() => {
          const optimistic = {
            ...project,
            name: 'After local rename',
            updatedAt: project.updatedAt + 1,
          };
          projectViewRenameFenceHarness.token = onProjectRenameStarted?.(optimistic) ?? null;
          onProjectChange(optimistic);
        }}
      >
        Rename current project
      </button>
      <button
        type="button"
        onClick={() => onProjectChange({
          ...project,
          name: 'Remote rename',
          updatedAt: project.updatedAt + 1,
        })}
      >
        Apply remote project rename
      </button>
      <button
        type="button"
        onClick={() => onProjectRenameSettled?.(projectViewRenameFenceHarness.token, project)}
      >
        Settle current project rename
      </button>
      <button
        type="button"
        onClick={() => void onCreateProjectFromDesignSystem?.('slack', 'Slack')}
      >
        Create design from design system
      </button>
      <button
        type="button"
        onClick={() =>
          void resolveAuthoritativeProjectName?.(
            project.id,
            projectAuthorizationKey ?? project.id,
          )
        }
      >
        Refresh catalog title
      </button>
      <button
        type="button"
        onClick={() => onArmAmrAuthRetryContinuation?.({
          projectId: project.id,
          conversationId: routeConversationId ?? 'conv-auth',
          assistantId: 'assistant-auth-failure',
          originMountId: 'origin-mount',
          workspaceIdentityKey: workspaceIdentityCacheKey(workspaceContextOverride),
        })}
      >
        Arm auth continuation
      </button>
      <button
        type="button"
        onClick={() => {
          onArmAmrAuthRetryContinuation?.({
            projectId: project.id,
            conversationId: routeConversationId ?? 'conv-auth',
            assistantId: 'assistant-auth-failure',
            originMountId: 'origin-mount',
            workspaceIdentityKey: workspaceIdentityCacheKey(workspaceContextOverride),
          });
          onOpenAmrSettings?.();
        }}
      >
        Authorize in settings
      </button>
      <button
        type="button"
        disabled={!amrAuthRetryContinuation}
        onClick={() => {
          if (amrAuthRetryContinuation) {
            onConsumeAmrAuthRetryContinuation?.(amrAuthRetryContinuation);
          }
        }}
      >
        Consume auth continuation
      </button>
    </main>
  ),
}));

vi.mock('../../src/components/WorkspaceTabsBar', () => ({
  WorkspaceTabsBar: ({
    activeProjectWorkspaceId,
    projects,
  }: {
    activeProjectWorkspaceId?: string | null;
    projects: Project[];
  }) => (
    <>
      <span data-testid="workspace-tabs-active-project-workspace">
        {activeProjectWorkspaceId === undefined
          ? 'unresolved'
          : activeProjectWorkspaceId ?? 'personal'}
      </span>
      {projects.map((project) => (
        <span key={project.id} data-testid={`workspace-tab-name-${project.id}`}>
          {project.name}
        </span>
      ))}
    </>
  ),
  openWorkspaceTab: (route: { kind: string; projectId?: string }) => {
    if (route.kind === 'project' && route.projectId) {
      workspaceTabsHarness.projectIds.add(route.projectId);
    }
  },
  removeWorkspaceProjectTabs: (projectId: string) => {
    workspaceTabsHarness.projectIds.delete(projectId);
  },
}));

vi.mock('../../src/components/pet/PetOverlay', () => ({
  PetOverlay: () => null,
}));

vi.mock('../../src/components/pet/pets', () => ({
  migrateCustomPetAtlas: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../src/components/SettingsDialog', () => ({
  SettingsDialog: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="settings-surface">
      <button type="button" onClick={onClose}>
        Close settings
      </button>
    </div>
  ),
  switchApiProtocolConfig: (config: AppConfig) => config,
  updateCurrentApiProtocolConfig: (config: AppConfig) => config,
}));

vi.mock('../../src/providers/registry', async () => {
  const actual = await vi.importActual<typeof import('../../src/providers/registry')>(
    '../../src/providers/registry',
  );
  return {
    ...actual,
    daemonIsLive: vi.fn(),
    fetchAgentsStream: vi.fn(),
    fetchAppVersionInfo: vi.fn(),
    fetchDesignSystems: vi.fn(),
    fetchDesignTemplates: vi.fn(),
    fetchPromptTemplates: vi.fn(),
    fetchSkills: vi.fn(),
    replaceProjectWorkingDir: vi.fn(),
    uploadProjectFiles: vi.fn(),
  };
});

vi.mock('../../src/state/projects', async () => {
  const actual = await vi.importActual<typeof import('../../src/state/projects')>(
    '../../src/state/projects',
  );
  return {
    ...actual,
    createDesignSystemProjectFromProject: vi.fn(),
    createProject: vi.fn(),
    createPluginShareProject: vi.fn(),
    deleteProject: vi.fn(),
    duplicateProject: vi.fn(),
    getProject: vi.fn(),
    invalidatePluginCatalogCache: vi.fn(actual.invalidatePluginCatalogCache),
    listProjects: vi.fn(),
    listTemplates: vi.fn(),
    patchProject: vi.fn(),
  };
});

vi.mock('../../src/state/config', async () => {
  const actual = await vi.importActual<typeof import('../../src/state/config')>(
    '../../src/state/config',
  );
  return {
    ...actual,
    fetchDaemonConfig: vi.fn().mockResolvedValue({}),
    fetchComposioConfigFromDaemon: vi.fn().mockResolvedValue(null),
    loadConfig: vi.fn(),
    mergeDaemonConfig: vi.fn(),
    saveConfig: vi.fn(),
    syncComposioConfigToDaemon: vi.fn().mockResolvedValue(true),
    syncConfigToDaemon: vi.fn().mockResolvedValue(undefined),
  };
});

const mockedDaemonIsLive = vi.mocked(daemonIsLive);
const mockedFetchAgentsStream = vi.mocked(fetchAgentsStream);
const mockedFetchAppVersionInfo = vi.mocked(fetchAppVersionInfo);
const mockedFetchDesignSystems = vi.mocked(fetchDesignSystems);
const mockedFetchDesignTemplates = vi.mocked(fetchDesignTemplates);
const mockedFetchPromptTemplates = vi.mocked(fetchPromptTemplates);
const mockedFetchSkills = vi.mocked(fetchSkills);
const mockedUploadProjectFiles = vi.mocked(uploadProjectFiles);
const mockedReplaceProjectWorkingDir = vi.mocked(replaceProjectWorkingDir);
const mockedCreateDesignSystemProjectFromProject = vi.mocked(createDesignSystemProjectFromProject);
const mockedCreateProject = vi.mocked(createProject);
const mockedCreatePluginShareProject = vi.mocked(createPluginShareProject);
const mockedDeleteProject = vi.mocked(deleteProject);
const mockedDuplicateProject = vi.mocked(duplicateProject);
const mockedGetProject = vi.mocked(getProject);
const mockedInvalidatePluginCatalogCache = vi.mocked(invalidatePluginCatalogCache);
const mockedListProjects = vi.mocked(listProjects);
const mockedListTemplates = vi.mocked(listTemplates);
const mockedPatchProject = vi.mocked(patchProject);
const mockedFetchDaemonConfig = vi.mocked(fetchDaemonConfig);
const mockedFetchComposioConfigFromDaemon = vi.mocked(fetchComposioConfigFromDaemon);
const mockedLoadConfig = vi.mocked(loadConfig);
const mockedMergeDaemonConfig = vi.mocked(mergeDaemonConfig);
const mockedSaveConfig = vi.mocked(saveConfig);
const mockedSyncComposioConfigToDaemon = vi.mocked(syncComposioConfigToDaemon);
const mockedSyncConfigToDaemon = vi.mocked(syncConfigToDaemon);

const baseConfig: AppConfig = {
  mode: 'daemon',
  apiKey: '',
  apiProtocol: 'anthropic',
  apiVersion: '',
  baseUrl: 'https://api.anthropic.com',
  model: 'claude-sonnet-4-5',
  apiProviderBaseUrl: 'https://api.anthropic.com',
  apiProtocolConfigs: {},
  agentId: 'codex',
  skillId: null,
  designSystemId: null,
  onboardingCompleted: true,
  privacyDecisionAt: 1778244000000,
  mediaProviders: {},
  composio: {},
  agentModels: {},
  agentCliEnv: {},
};

const freshProject: Project = {
  id: 'project-new',
  name: 'Fresh project',
  skillId: null,
  designSystemId: null,
  createdAt: 1778244000000,
  updatedAt: 1778244000000,
  metadata: { kind: 'prototype' },
};

const existingProject: Project = {
  id: 'project-existing',
  name: 'Existing project',
  skillId: null,
  designSystemId: null,
  createdAt: 1778243000000,
  updatedAt: 1778243000000,
  metadata: { kind: 'prototype' },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function workspaceContextPayload(
  workspaceId: string,
  workspaceMemberId: string,
) {
  return { context: workspaceContext(workspaceId, workspaceMemberId) };
}

function workspaceContext(
  workspaceId: string,
  workspaceMemberId: string,
) {
  return {
    workspaceId,
    workspaceName: workspaceId,
    workspaceType: 'team' as const,
    workspaceMemberId,
    role: 'member' as const,
    memberStatus: 'active' as const,
    lifecycleState: 'active' as const,
    billingState: 'active' as const,
    planId: null,
    providerMode: 'platform_credits' as const,
    seatSummary: {
      seatLimit: 5,
      usedSeats: 1,
      availableSeats: 4,
      isSeatFull: false,
    },
    permissions: buildWorkspacePermissions({
      role: 'member',
      lifecycleState: 'active',
    }),
    displayName: workspaceId,
  };
}

function stubWorkspaceContext(
  workspaceId: string,
  workspaceMemberId: string,
) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const pathname = new URL(String(input), 'http://d.local').pathname;
      return {
        ok: true,
        json: async () =>
          pathname.endsWith('/workspace/directory')
            ? workspaceDirectoryFixture([workspaceContext(workspaceId, workspaceMemberId)])
            : pathname.endsWith('/workspace/context')
              ? workspaceContextPayload(workspaceId, workspaceMemberId)
              : {},
      } as Response;
    }),
  );
}

describe('App project creation routing', () => {
  beforeEach(() => {
    resetCoalescedGet();
    resetWorkspaceContextCache();
    resetTeamProjectsCache();
    resetProjectDisplaySnapshots();
    workspaceInvalidationHarness.handlers.length = 0;
    workspaceInvalidationHarness.onActive.length = 0;
    projectViewRenameFenceHarness.token = null;
    workspaceTabsHarness.projectIds.clear();
    window.history.replaceState(null, '', '/');
    mockedDaemonIsLive.mockResolvedValue(true);
    mockedFetchAgentsStream.mockResolvedValue([]);
    mockedFetchSkills.mockResolvedValue([]);
    mockedFetchDesignTemplates.mockResolvedValue([]);
    mockedFetchDesignSystems.mockResolvedValue([]);
    mockedFetchPromptTemplates.mockResolvedValue([]);
    mockedFetchAppVersionInfo.mockResolvedValue(null);
    mockedListTemplates.mockResolvedValue([]);
    mockedFetchDaemonConfig.mockResolvedValue({});
    mockedFetchComposioConfigFromDaemon.mockResolvedValue(null);
    mockedMergeDaemonConfig.mockImplementation((local) => local);
    mockedLoadConfig.mockReturnValue({ ...baseConfig });
    mockedUploadProjectFiles.mockResolvedValue({ uploaded: [], failed: [] });
    mockedCreateProject.mockResolvedValue({
      project: freshProject,
      conversationId: 'conv-new',
    });
    mockedCreateDesignSystemProjectFromProject.mockResolvedValue({
      project: {
        ...freshProject,
        id: 'project-design-system',
        name: 'Derived design system',
      },
      conversationId: 'conv-design-system',
      designSystemId: 'derived-design-system',
      copiedFiles: [],
    });
    mockedCreatePluginShareProject.mockResolvedValue({
      ok: true,
      project: {
        ...freshProject,
        id: 'project-plugin-share',
        name: 'Plugin share project',
        pendingPrompt: 'Publish the retained plugin share prompt',
      },
      conversationId: 'conv-plugin-share',
      actionPluginId: 'od-plugin-publish-github',
      sourcePluginId: 'plugin-source',
      stagedPath: 'plugin-source',
      prompt: 'Publish the retained plugin share prompt',
      message: 'Prepared',
    });
    mockedDeleteProject.mockResolvedValue(true);
    mockedDuplicateProject.mockResolvedValue({
      project: {
        ...freshProject,
        id: 'project-duplicate',
        name: 'Scoped duplicate',
      },
      conversationId: 'conv-duplicate',
      copiedFiles: [],
    });
    mockedGetProject.mockResolvedValue(null);
    mockedPatchProject.mockResolvedValue(freshProject);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    resetWorkspaceContextCache();
    resetTeamProjectsCache();
    resetProjectDisplaySnapshots();
    resetCoalescedGet();
    workspaceInvalidationHarness.handlers.length = 0;
    workspaceInvalidationHarness.onActive.length = 0;
  });

  it('auto-picks the first available agent in registry order after streamed probes settle', async () => {
    const codexAgent: AgentInfo = {
      id: 'codex',
      name: 'Codex CLI',
      bin: 'codex',
      available: true,
      version: '0.80.0',
      models: [{ id: 'default', label: 'Default' }],
    };
    const claudeAgent: AgentInfo = {
      id: 'claude',
      name: 'Claude Code',
      bin: 'claude',
      available: true,
      version: '1.0.0',
      models: [{ id: 'default', label: 'Default' }],
    };
    mockedLoadConfig.mockReturnValue({ ...baseConfig, agentId: null });
    mockedListProjects.mockResolvedValue([]);
    mockedFetchAgentsStream.mockImplementation(async ({ onAgent }) => {
      onAgent(codexAgent);
      onAgent(claudeAgent);
      return [codexAgent, claudeAgent];
    });

    render(<App />);

    await waitFor(() => {
      expect(mockedSaveConfig).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: 'claude' }),
      );
    });
    expect(
      mockedSaveConfig.mock.calls.some(([saved]) => saved.agentId === 'codex'),
    ).toBe(false);
    expect(mockedSyncConfigToDaemon).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: 'claude' }),
    );
  });

  it('ignores stale streamed writes from an older bootstrap after a newer rescan', async () => {
    const staleCodexAgent: AgentInfo = {
      id: 'codex',
      name: 'Stale Codex CLI',
      bin: 'codex',
      available: false,
      version: null,
      models: [],
    };
    const refreshedCodexAgent: AgentInfo = {
      id: 'codex',
      name: 'Fresh Codex CLI',
      bin: 'codex',
      available: true,
      version: '0.80.0',
      models: [{ id: 'default', label: 'Default' }],
    };
    const staleBootstrap = deferred<AgentInfo[]>();
    let emitStaleAgent: ((agent: AgentInfo) => void) | null = null;
    mockedFetchAgentsStream
      .mockImplementationOnce(({ onAgent }) => {
        emitStaleAgent = onAgent;
        return staleBootstrap.promise;
      })
      .mockImplementationOnce(async ({ onAgent }) => {
        onAgent(refreshedCodexAgent);
        return [refreshedCodexAgent];
      });
    mockedListProjects.mockResolvedValue([]);

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Refresh agents' }));

    await waitFor(() => {
      expect(screen.getByTestId('entry-agent-codex').textContent).toBe(
        'Fresh Codex CLI',
      );
    });

    await act(async () => {
      emitStaleAgent?.(staleCodexAgent);
      staleBootstrap.resolve([staleCodexAgent]);
      await staleBootstrap.promise;
    });

    expect(screen.getByTestId('entry-agent-codex').textContent).toBe(
      'Fresh Codex CLI',
    );
  });

  it('does not auto-pick from a partial rescan when an older bootstrap settles', async () => {
    const codexAgent: AgentInfo = {
      id: 'codex',
      name: 'Codex CLI',
      bin: 'codex',
      available: true,
      version: '0.80.0',
      models: [{ id: 'default', label: 'Default' }],
    };
    const claudeAgent: AgentInfo = {
      id: 'claude',
      name: 'Claude Code',
      bin: 'claude',
      available: true,
      version: '1.0.0',
      models: [{ id: 'default', label: 'Default' }],
    };
    const staleBootstrap = deferred<AgentInfo[]>();
    const rescan = deferred<AgentInfo[]>();
    mockedLoadConfig.mockReturnValue({ ...baseConfig, agentId: null });
    mockedListProjects.mockResolvedValue([]);
    mockedFetchAgentsStream
      .mockReturnValueOnce(staleBootstrap.promise)
      .mockImplementationOnce(({ onAgent }) => {
        onAgent(codexAgent);
        return rescan.promise;
      });

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Refresh agents' }));

    await waitFor(() => {
      expect(screen.getByTestId('entry-agent-codex').textContent).toBe(
        'Codex CLI',
      );
    });

    await act(async () => {
      staleBootstrap.resolve([]);
      await staleBootstrap.promise;
    });
    await act(async () => {
      rescan.resolve([codexAgent, claudeAgent]);
      await rescan.promise;
    });

    await waitFor(() => {
      expect(mockedSaveConfig).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: 'claude' }),
      );
    });
    expect(
      mockedSaveConfig.mock.calls.some(([saved]) => saved.agentId === 'codex'),
    ).toBe(false);
  });

  it('keeps auto-pick gated while rescanning from an empty agent state', async () => {
    const codexAgent: AgentInfo = {
      id: 'codex',
      name: 'Codex CLI',
      bin: 'codex',
      available: true,
      version: '0.80.0',
      models: [{ id: 'default', label: 'Default' }],
    };
    const claudeAgent: AgentInfo = {
      id: 'claude',
      name: 'Claude Code',
      bin: 'claude',
      available: true,
      version: '1.0.0',
      models: [{ id: 'default', label: 'Default' }],
    };
    const initialProbe = deferred<AgentInfo[]>();
    const rescan = deferred<AgentInfo[]>();
    mockedLoadConfig.mockReturnValue({ ...baseConfig, agentId: null });
    mockedListProjects.mockResolvedValue([]);
    mockedFetchAgentsStream
      .mockReturnValueOnce(initialProbe.promise)
      .mockImplementationOnce(({ onAgent }) => {
        onAgent(codexAgent);
        return rescan.promise;
      });

    render(<App />);

    await waitFor(() => {
      expect(mockedFetchAgentsStream).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      initialProbe.resolve([]);
      await initialProbe.promise;
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Refresh agents' }));

    await waitFor(() => {
      expect(screen.getByTestId('entry-agent-codex').textContent).toBe(
        'Codex CLI',
      );
    });

    await act(async () => {
      rescan.resolve([codexAgent, claudeAgent]);
      await rescan.promise;
    });

    await waitFor(() => {
      expect(mockedSaveConfig).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: 'claude' }),
      );
    });
    expect(
      mockedSaveConfig.mock.calls.some(([saved]) => saved.agentId === 'codex'),
    ).toBe(false);
  });

  it('keeps a newly created project open when the initial project list resolves stale', async () => {
    const bootstrapProjects = deferred<Project[]>();
    mockedListProjects
      .mockReturnValueOnce(bootstrapProjects.promise)
      .mockResolvedValue([]);

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Create project' }));

    await waitFor(() => {
      expect(screen.getByTestId('project-title').textContent).toBe('Fresh project');
    });
    expect(window.location.pathname).toBe('/projects/project-new');

    await act(async () => {
      bootstrapProjects.resolve([]);
      await bootstrapProjects.promise;
    });

    expect(screen.getByTestId('project-title').textContent).toBe('Fresh project');
    expect(window.location.pathname).toBe('/projects/project-new');
  });

  it('stores the Home auto-send prompt outside the project projection before a refresh can drop it', async () => {
    mockedListProjects.mockResolvedValue([]);
    mockedCreateProject.mockResolvedValue({
      project: { ...freshProject, name: 'Prompted project' },
      conversationId: 'conv-new',
    });

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Create prompted project' }));

    await screen.findByTestId('project-view');
    expect(window.sessionStorage.getItem('od:auto-send-first:project-new')).toBe('1');
    expect(window.sessionStorage.getItem('od:auto-send-prompt:project-new')).toBe(
      'Build the retained artifact prompt',
    );
  });

  it('enters the project preparing surface before Home project creation settles', async () => {
    mockedListProjects.mockResolvedValue([]);
    const creation = deferred<{
      project: Project;
      conversationId: string;
    }>();
    let requestedProjectId: string | undefined;
    mockedCreateProject.mockImplementation((input) => {
      requestedProjectId = (input as typeof input & { id?: string }).id;
      return creation.promise;
    });

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Create prompted project' }));

    await screen.findByTestId('project-creation-pending-view');
    expect(requestedProjectId).toBeTruthy();
    expect(window.location.pathname).toBe(`/projects/${requestedProjectId}`);
    expect(screen.getByText('Build the retained artifact prompt')).toBeTruthy();
    expect(screen.getByText('Preparing...')).toBeTruthy();
    expect(screen.queryByTestId('entry-home-surface')).toBeNull();
    expect(screen.queryByTestId('project-view')).toBeNull();

    creation.resolve({
      project: {
        ...freshProject,
        id: requestedProjectId!,
        name: 'Prompted project',
        pendingPrompt: 'Build the retained artifact prompt',
      },
      conversationId: 'conv-new',
    });

    await screen.findByTestId('project-view');
    expect(window.location.pathname).toBe(`/projects/${requestedProjectId}`);
  });

  it('draws the staged Home attachments on the preparing surface without reading the project', async () => {
    // The bytes are already in the browser: the user picked those files on
    // Home and they are still `File` objects in memory. Showing them costs no
    // request, so the first project frame must not read as an empty project.
    //
    // The guard half of this spec is the reason the preparing surface exists:
    // the optimistic project is not persisted or authorized yet, so NOTHING
    // project-scoped may go out until POST /api/projects answers.
    mockedListProjects.mockResolvedValue([]);
    const creation = deferred<{ project: Project; conversationId: string }>();
    let requestedProjectId: string | undefined;
    mockedCreateProject.mockImplementation((input) => {
      requestedProjectId = (input as typeof input & { id?: string }).id;
      return creation.promise;
    });

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Create prompted project' }));

    await screen.findByTestId('project-creation-pending-view');

    const attachmentRow = screen.getByTestId('pending-attachment-row');
    expect(attachmentRow.textContent).toContain('brief');
    expect(attachmentRow.textContent).toContain('.txt');

    // Same shell as the frame that replaces it: the workspace tab strip docks
    // above the chat card, and the design-files column shows the centred empty
    // pill instead of a top-left caption.
    expect(screen.getByTestId('workspace-tabs-dock')).toBeTruthy();
    expect(screen.getByTestId('pending-design-files-empty').className).toContain('df-empty');

    // Exact call comparison, not `not.toHaveBeenCalledWith`: an added optional
    // argument would make a negative argument matcher vacuously true.
    const projectScopedCalls = vi
      .mocked(fetch)
      .mock.calls.filter(([input]) =>
        String(input).includes(`/api/projects/${requestedProjectId}`),
      );
    expect(projectScopedCalls).toHaveLength(0);
    expect(mockedUploadProjectFiles).toHaveBeenCalledTimes(0);
    expect(mockedReplaceProjectWorkingDir).toHaveBeenCalledTimes(0);

    creation.resolve({
      project: {
        ...freshProject,
        id: requestedProjectId!,
        name: 'Prompted project',
      },
      conversationId: 'conv-new',
    });
    await screen.findByTestId('project-view');
  });

  it('uploads staged Home attachments concurrently, after the working-dir handoff', async () => {
    // The in-project composer has uploaded one request per file at
    // STAGED_UPLOAD_CONCURRENCY (4) since the staged-attachment work; the Home
    // hand-off still sent one serialized 12-file batch. Six files must
    // therefore open exactly four requests before any of them settles.
    mockedListProjects.mockResolvedValue([]);
    mockedReplaceProjectWorkingDir.mockResolvedValue(undefined as never);
    const releases: Array<() => void> = [];
    mockedUploadProjectFiles.mockImplementation(
      () =>
        new Promise((resolve) => {
          releases.push(() => resolve({ uploaded: [], failed: [] }));
        }),
    );

    render(<App />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Create project with many attachments' }),
    );

    await waitFor(() => {
      expect(mockedUploadProjectFiles).toHaveBeenCalledTimes(4);
    });
    // One file per request, so a failure lands on a file instead of a batch.
    expect(
      mockedUploadProjectFiles.mock.calls.map(([, files]) => (files as File[]).length),
    ).toEqual([1, 1, 1, 1]);
    // The working dir still flips before the first byte goes up, otherwise the
    // files land in the managed root and vanish when baseDir moves.
    expect(mockedReplaceProjectWorkingDir.mock.invocationCallOrder[0]!).toBeLessThan(
      mockedUploadProjectFiles.mock.invocationCallOrder[0]!,
    );

    await act(async () => {
      for (const release of releases.splice(0)) release();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(mockedUploadProjectFiles).toHaveBeenCalledTimes(6);
    });
    await act(async () => {
      for (const release of releases.splice(0)) release();
      await Promise.resolve();
    });
    await screen.findByTestId('project-view');
  });

  it('reports a per-file Home attachment failure instead of swallowing it', async () => {
    mockedListProjects.mockResolvedValue([]);
    mockedReplaceProjectWorkingDir.mockResolvedValue(undefined as never);
    mockedUploadProjectFiles.mockImplementation(async (_projectId, files) => {
      const file = (files as File[])[0]!;
      if (file.name === 'shot-2.png') {
        return { uploaded: [], failed: [{ name: file.name, error: 'disk full' }], error: 'disk full' };
      }
      return {
        uploaded: [{ path: file.name, name: file.name, kind: 'image' as const, size: file.size }],
        failed: [],
      };
    });

    render(<App />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Create project with many attachments' }),
    );

    await screen.findByTestId('project-view');
    await waitFor(() => {
      expect(mockedUploadProjectFiles).toHaveBeenCalledTimes(6);
    });
    // The five that landed still travel with the first message.
    const staged = JSON.parse(
      window.sessionStorage.getItem('od:auto-send-attachments:project-new') ?? '[]',
    ) as Array<{ name: string }>;
    expect(staged.map((item) => item.name)).toEqual([
      'shot-0.png',
      'shot-1.png',
      'shot-3.png',
      'shot-4.png',
      'shot-5.png',
    ]);
  });

  it('stores the plugin-share prompt before its prepared project projection can refresh', async () => {
    mockedListProjects.mockResolvedValue([]);

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Create plugin share project' }));

    await waitFor(() => expect(mockedCreatePluginShareProject).toHaveBeenCalled());
    await screen.findByTestId('project-view');
    expect(window.sessionStorage.getItem('od:auto-send-first:project-plugin-share')).toBe('1');
    expect(window.sessionStorage.getItem('od:auto-send-prompt:project-plugin-share')).toBe(
      'Publish the retained plugin share prompt',
    );
  });

  it.each([
    ['Local CLI', { ...baseConfig, mode: 'daemon' as const, agentId: 'codex' }],
    ['BYOK', { ...baseConfig, mode: 'api' as const, agentId: 'amr' }],
  ])(
    'lets %s create an unscoped project without waiting for AMR identity discovery',
    async (_label, executionConfig) => {
      mockedLoadConfig.mockReturnValue(executionConfig);
      mockedListProjects.mockResolvedValue([]);
      vi.stubGlobal(
        'fetch',
        vi.fn(async (input: RequestInfo | URL) => {
          const pathname = new URL(String(input), 'http://d.local').pathname;
          if (pathname.endsWith('/integrations/vela/status')) {
            return new Promise<Response>(() => {});
          }
          if (pathname.endsWith('/workspace/directory')) {
            return new Promise<Response>(() => {});
          }
          return new Response('{}', {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }),
      );

      render(<App />);
      await screen.findByText('null', { selector: '[data-testid="amr-login-status"]' });
      fireEvent.click(await screen.findByRole('button', { name: 'Create project' }));

      await waitFor(() => {
        expect(mockedCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({ workspaceContext: null }),
        );
      });
      expect(screen.getByTestId('project-title').textContent).toBe('Fresh project');
    },
  );

  it('does not wait for directory identity while the richer Workspace context is still loading', async () => {
    const context = workspaceContext('ws-cold-create', 'wm-cold-create');
    const richContextRead = deferred<Response>();
    mockedLoadConfig.mockReturnValue({
      ...baseConfig,
      mode: 'daemon',
      agentId: 'amr',
    });
    mockedListProjects.mockResolvedValue([]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const pathname = new URL(String(input), 'http://d.local').pathname;
        if (pathname.endsWith('/integrations/vela/status')) {
          return new Response(JSON.stringify({
            loggedIn: true,
            profile: 'default',
            user: { id: 'account-team-member' },
            configPath: '/test/vela.json',
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
        if (pathname.endsWith('/workspace/directory')) {
          return new Response(
            JSON.stringify(workspaceDirectoryFixture([context])),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }
        if (pathname.endsWith('/workspace/context')) return richContextRead.promise;
        return new Response('{}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }),
    );

    render(<App />);
    await screen.findByText('true', { selector: '[data-testid="amr-login-status"]' });
    fireEvent.click(await screen.findByRole('button', { name: 'Create project' }));

    await waitFor(() => {
      expect(mockedCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceContext: null,
        }),
      );
    });
  });

  it.each([
    ['Local CLI', 'loading', { ...baseConfig, mode: 'daemon' as const, agentId: 'codex' }],
    ['BYOK', 'unavailable', { ...baseConfig, mode: 'api' as const, agentId: 'amr' }],
  ])(
    'lets %s create locally for a signed-in account while Team workspace discovery is %s',
    async (_label, discoveryState, executionConfig) => {
      mockedLoadConfig.mockReturnValue(executionConfig);
      mockedListProjects.mockResolvedValue([]);
      vi.stubGlobal(
        'fetch',
        vi.fn(async (input: RequestInfo | URL) => {
          const pathname = new URL(String(input), 'http://d.local').pathname;
          if (pathname.endsWith('/integrations/vela/status')) {
            return new Response(JSON.stringify({
              loggedIn: true,
              profile: 'default',
              user: { id: 'account-team-member' },
              configPath: '/test/vela.json',
            }), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            });
          }
          if (pathname.endsWith('/workspace/directory')) {
            if (discoveryState === 'loading') return new Promise<Response>(() => {});
            return new Response('{}', { status: 503 });
          }
          return new Response('{}', {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }),
      );

      render(<App />);
      await screen.findByText('true', { selector: '[data-testid="amr-login-status"]' });
      fireEvent.click(await screen.findByRole('button', { name: 'Create project' }));

      await waitFor(() => {
        expect(mockedCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({ workspaceContext: null }),
        );
      });
      expect(screen.getByTestId('project-title').textContent).toBe('Fresh project');
    },
  );

  it('allows an unbound local AMR project while workspace discovery is loading', async () => {
    mockedLoadConfig.mockReturnValue({
      ...baseConfig,
      mode: 'daemon',
      agentId: 'amr',
    });
    mockedListProjects.mockResolvedValue([]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const pathname = new URL(String(input), 'http://d.local').pathname;
        if (pathname.endsWith('/integrations/vela/status')) {
          return new Response(JSON.stringify({
            loggedIn: false,
            profile: 'default',
            user: null,
            configPath: '/test/vela.json',
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
        if (pathname.endsWith('/workspace/directory')) {
          return new Promise<Response>(() => {});
        }
        return new Response('{}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }),
    );

    render(<App />);
    await screen.findByText('false', { selector: '[data-testid="amr-login-status"]' });
    fireEvent.click(await screen.findByRole('button', { name: 'Create project' }));

    await waitFor(() => {
      expect(mockedCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceContext: null }),
      );
    });
  });

  it('routes "create with this design system" through the default design router, not a prototype', async () => {
    mockedListProjects.mockResolvedValue([existingProject]);

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Open Existing project' }));
    await screen.findByTestId('project-view');
    fireEvent.click(screen.getByRole('button', { name: 'Create design from design system' }));

    await waitFor(() => {
      expect(mockedCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Untitled',
          skillId: null,
          designSystemId: 'slack',
          // No prototype assumption: the click binds the hidden default
          // router so the agent asks (via the task-type question-form) what
          // to build, then auto-sends a preset prompt that names the system.
          pluginId: 'od-default',
          conversationMode: 'design',
          pendingPrompt: expect.stringContaining('Slack'),
          pluginInputs: expect.objectContaining({
            prompt: expect.stringContaining('Slack'),
          }),
          metadata: expect.objectContaining({
            kind: 'other',
          }),
        }),
      );
    });

    // The web-prototype scenario and prototype kind must NOT leak in.
    const call = mockedCreateProject.mock.calls.at(-1)?.[0] as
      | { pluginId?: string; metadata?: { kind?: string } }
      | undefined;
    expect(call?.pluginId).not.toBe('example-web-prototype');
    expect(call?.metadata?.kind).not.toBe('prototype');
    expect(window.sessionStorage.getItem('od:auto-send-first:project-new')).toBe('1');
    expect(window.sessionStorage.getItem('od:auto-send-prompt:project-new')).toContain('Slack');
  });

  it('stores the extraction prompt when converting an existing project into a design system', async () => {
    mockedListProjects.mockResolvedValue([existingProject]);

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open Existing project' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Extract design system project' }));

    await waitFor(() => {
      expect(mockedCreateDesignSystemProjectFromProject).toHaveBeenCalledWith(
        'project-existing',
        expect.objectContaining({
          pendingPrompt: 'Extract the retained design system prompt',
        }),
        null,
      );
    });
    expect(window.sessionStorage.getItem('od:auto-send-first:project-design-system')).toBe('1');
    expect(window.sessionStorage.getItem('od:auto-send-prompt:project-design-system')).toBe(
      'Extract the retained design system prompt',
    );
  });

  it('keeps a newly created project open when a post-create refresh resolves stale', async () => {
    const bootstrapProjects = deferred<Project[]>();
    const staleRefreshProjects = deferred<Project[]>();
    mockedListProjects
      .mockReturnValueOnce(bootstrapProjects.promise)
      .mockReturnValueOnce(staleRefreshProjects.promise)
      .mockResolvedValue([]);

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Create project' }));

    await waitFor(() => {
      expect(screen.getByTestId('project-title').textContent).toBe('Fresh project');
    });
    expect(window.location.pathname).toBe('/projects/project-new');

    fireEvent.click(screen.getByRole('button', { name: 'Refresh projects' }));

    await act(async () => {
      staleRefreshProjects.resolve([]);
      await staleRefreshProjects.promise;
    });

    expect(screen.getByTestId('project-title').textContent).toBe('Fresh project');
    expect(window.location.pathname).toBe('/projects/project-new');

    await act(async () => {
      bootstrapProjects.resolve([]);
      await bootstrapProjects.promise;
    });

    expect(screen.getByTestId('project-title').textContent).toBe('Fresh project');
    expect(window.location.pathname).toBe('/projects/project-new');
  });

  it('ignores an older stale project list after a newer response confirms the local project', async () => {
    const bootstrapProjects = deferred<Project[]>();
    const refreshedProjects = deferred<Project[]>();
    mockedListProjects
      .mockReturnValueOnce(bootstrapProjects.promise)
      .mockReturnValueOnce(refreshedProjects.promise)
      .mockResolvedValue([]);

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Create project' }));

    await waitFor(() => {
      expect(screen.getByTestId('project-title').textContent).toBe('Fresh project');
    });
    expect(window.location.pathname).toBe('/projects/project-new');

    fireEvent.click(screen.getByRole('button', { name: 'Refresh projects' }));

    await act(async () => {
      refreshedProjects.resolve([freshProject]);
      await refreshedProjects.promise;
    });

    expect(screen.getByTestId('project-title').textContent).toBe('Fresh project');
    expect(window.location.pathname).toBe('/projects/project-new');

    await act(async () => {
      bootstrapProjects.resolve([]);
      await bootstrapProjects.promise;
    });

    expect(screen.getByTestId('project-title').textContent).toBe('Fresh project');
    expect(window.location.pathname).toBe('/projects/project-new');
  });

  it('does not revive nonlocal projects from an older list after a newer empty refresh', async () => {
    const bootstrapProjects = deferred<Project[]>();
    const createRefreshProjects = deferred<Project[]>();
    mockedListProjects
      .mockReturnValueOnce(bootstrapProjects.promise)
      .mockReturnValueOnce(createRefreshProjects.promise)
      .mockResolvedValue([]);

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Create project' }));

    await waitFor(() => {
      expect(screen.getByTestId('project-title').textContent).toBe('Fresh project');
    });
    expect(window.location.pathname).toBe('/projects/project-new');

    fireEvent.click(screen.getByRole('button', { name: 'Refresh projects' }));
    expect(mockedListProjects).toHaveBeenCalledTimes(2);

    await act(async () => {
      createRefreshProjects.resolve([]);
      await createRefreshProjects.promise;
    });

    expect(screen.getByTestId('project-title').textContent).toBe('Fresh project');
    expect(window.location.pathname).toBe('/projects/project-new');

    await act(async () => {
      bootstrapProjects.resolve([existingProject]);
      await bootstrapProjects.promise;
    });

    expect(screen.getByTestId('project-title').textContent).toBe('Fresh project');
    expect(window.location.pathname).toBe('/projects/project-new');

    fireEvent.click(screen.getByRole('button', { name: 'Back to projects' }));

    await waitFor(() => {
      expect(screen.getByTestId('entry-home-surface')).toBeTruthy();
      expect(screen.getByTestId('entry-project-project-new').textContent).toContain(
        'Fresh project',
      );
    });
    expect(window.location.pathname).toBe('/');
    expect(screen.queryByTestId('entry-project-project-existing')).toBeNull();
  });

  it('keeps a host-imported project routable when getProject and the list lag behind', async () => {
    // Desktop import flow (handleImportFolderResponse fallback): the host
    // bridge has already POSTed the import, but `/api/projects/:id` and
    // `/api/projects` are both still catching up. Without a placeholder
    // the stale `[]` list response would drop the just-imported project
    // from state and the route-guard effect would bounce to Home.
    const bootstrapProjects = deferred<Project[]>();
    const importListProjects = deferred<Project[]>();
    mockedListProjects
      .mockReturnValueOnce(bootstrapProjects.promise)
      .mockReturnValueOnce(importListProjects.promise)
      .mockResolvedValue([]);
    mockedGetProject.mockResolvedValue(null);

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Host import folder' }));

    await act(async () => {
      importListProjects.resolve([]);
      await importListProjects.promise;
    });

    await waitFor(() => {
      expect(screen.getByTestId('project-view')).toBeTruthy();
    });
    expect(window.location.pathname).toBe('/projects/project-new');

    await act(async () => {
      bootstrapProjects.resolve([]);
      await bootstrapProjects.promise;
    });

    expect(screen.getByTestId('project-view')).toBeTruthy();
    expect(window.location.pathname).toBe('/projects/project-new');
  });

  it('hydrates a host-import placeholder from an older project list that contains the import', async () => {
    const bootstrapProjects = deferred<Project[]>();
    const importListProjects = deferred<Project[]>();
    mockedListProjects
      .mockReturnValueOnce(bootstrapProjects.promise)
      .mockReturnValueOnce(importListProjects.promise)
      .mockResolvedValue([]);
    mockedGetProject.mockResolvedValue(null);

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Host import folder' }));

    await act(async () => {
      importListProjects.resolve([]);
      await importListProjects.promise;
    });

    await waitFor(() => {
      expect(screen.getByTestId('project-view')).toBeTruthy();
    });
    expect(screen.getByTestId('project-title').textContent).toBe('');
    expect(window.location.pathname).toBe('/projects/project-new');

    await act(async () => {
      bootstrapProjects.resolve([freshProject]);
      await bootstrapProjects.promise;
    });

    expect(screen.getByTestId('project-title').textContent).toBe('Fresh project');
    expect(window.location.pathname).toBe('/projects/project-new');
  });

  it('does not revive unrelated projects from an older list that hydrates a host import', async () => {
    const bootstrapProjects = deferred<Project[]>();
    const importListProjects = deferred<Project[]>();
    mockedListProjects
      .mockReturnValueOnce(bootstrapProjects.promise)
      .mockReturnValueOnce(importListProjects.promise)
      .mockResolvedValue([]);
    mockedGetProject.mockResolvedValue(null);

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Host import folder' }));

    await act(async () => {
      importListProjects.resolve([]);
      await importListProjects.promise;
    });

    await waitFor(() => {
      expect(screen.getByTestId('project-view')).toBeTruthy();
    });
    expect(screen.getByTestId('project-title').textContent).toBe('');
    expect(window.location.pathname).toBe('/projects/project-new');

    await act(async () => {
      bootstrapProjects.resolve([freshProject, existingProject]);
      await bootstrapProjects.promise;
    });

    expect(screen.getByTestId('project-title').textContent).toBe('Fresh project');
    fireEvent.click(screen.getByRole('button', { name: 'Back to projects' }));

    await waitFor(() => {
      expect(screen.getByTestId('entry-project-project-new').textContent).toContain(
        'Fresh project',
      );
    });
    expect(screen.queryByTestId('entry-project-project-existing')).toBeNull();
  });

  it('persists Home context linked dirs into the project create metadata', async () => {
    mockedListProjects.mockResolvedValue([]);

    render(<App />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Create project with context dirs' }),
    );

    await waitFor(() => {
      expect(mockedCreateProject).toHaveBeenCalled();
    });
    expect(mockedCreateProject.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        metadata: expect.objectContaining({
          linkedDirs: [
            '/Users/me/existing',
            '/Users/me/reference',
            '/Users/me/local-code',
          ],
        }),
      }),
    );
  });

  it('short-circuits the upload + auto-send when the working-dir handoff fails', async () => {
    // Regression for the swallowed-failure case: the desktop working-dir token
    // has a ~60s TTL, so a slow user (or any rejected POST) makes
    // replaceProjectWorkingDir throw AFTER the project already exists. The old
    // code only logged a warning and then uploaded the staged attachments into
    // the managed root while the user believed their chosen folder was applied.
    // The fix surfaces a create-time error toast AND aborts the rest of the
    // submit path so the first run cannot proceed on a tree the user did not
    // choose.
    mockedListProjects.mockResolvedValue([]);
    mockedReplaceProjectWorkingDir.mockRejectedValue(
      new Error('working-dir token expired'),
    );

    render(<App />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Create project with working dir' }),
    );

    await waitFor(() => {
      expect(screen.getByText(/Couldn't apply the chosen folder/i)).toBeTruthy();
    });
    expect(mockedReplaceProjectWorkingDir).toHaveBeenCalledTimes(1);
    // The handoff failed, so the staged attachments must NOT be uploaded into
    // the managed `.od/projects/<id>` root the user did not pick.
    expect(mockedUploadProjectFiles).not.toHaveBeenCalled();
  });

  it('surfaces a toast instead of silently bouncing when opening a missing project', async () => {
    mockedListProjects.mockResolvedValue([]);
    mockedGetProject.mockResolvedValue(null);

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Open missing project' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'This project has been deleted or no longer exists.',
      );
    });
    expect(window.location.pathname).toBe('/');
    expect(screen.queryByTestId('project-view')).toBeNull();
  });

  it('opens a known unbound local project without waiting for cloud Workspace discovery', async () => {
    const directoryResponse = deferred<Response>();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const pathname = new URL(String(input), 'http://d.local').pathname;
        if (pathname.endsWith('/workspace/directory')) return directoryResponse.promise;
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        } as Response);
      }),
    );
    mockedListProjects.mockResolvedValue([existingProject]);

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open Existing project' }));

    await screen.findByTestId('project-view');
    expect(mockedGetProject).not.toHaveBeenCalled();
    expect(screen.getByTestId('project-workspace-id').textContent).toBe('unbound');
  });

  it('serializes list renames and rolls repeated failures back to the confirmed name', async () => {
    const firstPatch = deferred<Project | null>();
    const secondPatch = deferred<Project | null>();
    mockedListProjects.mockResolvedValue([existingProject]);
    mockedPatchProject
      .mockImplementationOnce(() => firstPatch.promise)
      .mockImplementationOnce(() => secondPatch.promise);

    render(<App />);
    await screen.findByTestId('entry-project-project-existing');
    fireEvent.click(screen.getByRole('button', { name: 'Rename first project A' }));
    await waitFor(() => expect(mockedPatchProject).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Rename first project B' }));
    await act(async () => Promise.resolve());
    expect(mockedPatchProject).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('entry-project-project-existing').textContent).toContain('Rename B');

    await act(async () => {
      firstPatch.resolve(null);
      await firstPatch.promise;
    });
    await waitFor(() => expect(mockedPatchProject).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('entry-project-project-existing').textContent).toContain('Rename B');

    await act(async () => {
      secondPatch.resolve(null);
      await secondPatch.promise;
    });
    await waitFor(() => {
      expect(screen.getByTestId('entry-project-project-existing').textContent).toContain(
        'Existing project',
      );
    });
  });


  it('keeps a newly created renamed project when the project route restores an older all snapshot', async () => {
    const context = workspaceContext('ws-1', 'wm-1');
    const olderProjects: Project[] = [
      {
        ...existingProject,
        id: 'project-old-a',
        name: 'Untitled A',
        workspaceId: context.workspaceId,
      },
      {
        ...existingProject,
        id: 'project-old-b',
        name: 'Untitled B',
        workspaceId: context.workspaceId,
      },
    ];
    const createdProject: Project = {
      ...freshProject,
      workspaceId: context.workspaceId,
    };
    mockedListProjects.mockResolvedValue(olderProjects);
    mockedCreateProject.mockResolvedValue({
      project: createdProject,
      conversationId: 'conv-new',
    });
    stubWorkspaceContext(context.workspaceId, context.workspaceMemberId);

    render(<App />);
    await screen.findByTestId('entry-project-project-old-a');

    // Project routes use the `all` projection. Reproduce the real browser
    // state where that projection predates the create performed on Home's
    // `recent` projection.
    writeProjectDisplaySnapshot({
      accountGeneration: currentWorkspaceAccountGeneration(),
      context,
      view: 'all',
    }, olderProjects);

    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));
    await screen.findByTestId('project-view');
    fireEvent.click(screen.getByRole('button', { name: 'Rename current project' }));
    await waitFor(() => {
      expect(screen.getByTestId('project-title').textContent).toBe('After local rename');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Back to projects' }));
    await screen.findByTestId('entry-home-surface');
    expect(screen.getByTestId('entry-project-project-new').textContent).toContain(
      'After local rename',
    );
  });

  it('returns from full-page Settings to the exact project conversation and file route', async () => {
    window.history.replaceState(
      null,
      '',
      '/projects/project-existing/conversations/conv-exact/files/nested%2Fartifact.html',
    );
    stubWorkspaceContext('ws-1', 'wm-1');
    mockedListProjects.mockResolvedValue([{
      ...existingProject,
      workspaceId: 'ws-1',
    }]);

    render(<App />);
    await screen.findByTestId('project-view');

    fireEvent.click(screen.getByRole('button', { name: 'Open settings from project' }));
    await screen.findByTestId('settings-surface');
    expect(window.location.pathname).toBe('/settings');

    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));

    await waitFor(() => {
      expect(window.location.pathname).toBe(
        '/projects/project-existing/conversations/conv-exact/files/nested/artifact.html',
      );
      expect(screen.getByTestId('project-route-conversation').textContent).toBe('conv-exact');
    });
  });

  it('returns home when full-page Settings was opened from home', async () => {
    mockedListProjects.mockResolvedValue([]);

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open settings from home' }));
    await screen.findByTestId('settings-surface');

    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/');
      expect(screen.getByTestId('entry-home-surface')).toBeTruthy();
    });
  });

  it('opens the seeded brand extraction conversation after creating a design system', async () => {
    const brandProject: Project = {
      id: 'brand-acme',
      name: 'acme.com Design System',
      skillId: null,
      designSystemId: null,
      createdAt: 1778244000000,
      updatedAt: 1778244000000,
      metadata: { kind: 'brand', importedFrom: 'brand-extraction', brandId: 'acme' },
    };
    window.history.replaceState(null, '', '/design-systems/create');
    mockedListProjects.mockResolvedValue([]);
    mockedGetProject.mockResolvedValue(brandProject);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: unknown, _init?: unknown) => {
        if (typeof input === 'string' && input === '/api/brands') {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: 'acme',
              projectId: brandProject.id,
              conversationId: 'conv-brand-acme',
              sourceUrl: 'https://acme.com/',
              status: 'extracting',
            }),
          } as unknown as Response;
        }
        return { ok: true, status: 200, json: async () => ({}) } as unknown as Response;
      }),
    );

    render(<App />);

    fireEvent.change(await screen.findByPlaceholderText('https://github.com/org/repo'), {
      target: { value: 'https://acme.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue to generation/i }));

    await waitFor(() => {
      expect(screen.getByTestId('project-route-conversation').textContent).toBe('conv-brand-acme');
    });
    expect(window.location.pathname).toBe(`/projects/${brandProject.id}/conversations/conv-brand-acme`);
  });
});
