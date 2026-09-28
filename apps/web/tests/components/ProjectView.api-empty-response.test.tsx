// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useLayoutEffect, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectView } from '../../src/components/ProjectView';
import { streamViaDaemon } from '../../src/providers/daemon';
import type { DaemonStreamOptions } from '../../src/providers/daemon';
import {
  fetchProjectFilePreview,
  fetchProjectFileText,
  fetchProjectFiles,
  patchPreviewCommentStatus,
  writeProjectTextFile,
} from '../../src/providers/registry';
import { listMessages, saveMessage } from '../../src/state/projects';
import { playSound } from '../../src/utils/notifications';
import type {
  AgentEvent,
  AgentInfo,
  AppConfig,
  ChatAttachment,
  ChatCommentAttachment,
  ChatMessage,
  Conversation,
  DesignSystemSummary,
  Project,
  SkillSummary,
} from '../../src/types';

const chatPaneMockState = vi.hoisted(() => ({
  attachments: [] as ChatAttachment[],
  commentAttachments: [] as ChatCommentAttachment[],
  fireResizeObserverOnFocusedLayout: false,
  resizeObserverCallbacks: [] as ResizeObserverCallback[],
}));

vi.mock('../../src/router', () => ({
  navigate: vi.fn(),
}));

vi.mock('../../src/providers/anthropic', () => ({
  streamMessage: vi.fn(),
}));

vi.mock('../../src/providers/daemon', () => ({
  fetchChatRunStatus: vi.fn(),
  listActiveChatRuns: vi.fn().mockResolvedValue([]),
  listProjectRuns: vi.fn().mockResolvedValue([]),
  publishDaemonRunFinishedEvent: vi.fn(),
  reattachDaemonRun: vi.fn(),
  streamViaDaemon: vi.fn(),
}));

vi.mock('../../src/providers/project-events', () => ({
  useProjectFileEvents: vi.fn(),
}));

vi.mock('../../src/utils/notifications', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils/notifications')>(
    '../../src/utils/notifications',
  );
  return {
    ...actual,
    playSound: vi.fn(),
  };
});

vi.mock('../../src/providers/registry', async () => {
  const actual = await vi.importActual<typeof import('../../src/providers/registry')>(
    '../../src/providers/registry',
  );
  return {
    ...actual,
    deletePreviewComment: vi.fn(),
    fetchDesignSystem: vi.fn().mockResolvedValue(null),
    fetchLiveArtifacts: vi.fn().mockResolvedValue([]),
    fetchProjectFilePreview: vi.fn().mockResolvedValue(null),
    fetchProjectFileText: vi.fn().mockResolvedValue(null),
    fetchPreviewComments: vi.fn().mockResolvedValue([]),
    fetchProjectFiles: vi.fn().mockResolvedValue([]),
    fetchSkill: vi.fn().mockResolvedValue(null),
    patchPreviewCommentStatus: vi.fn(),
    upsertPreviewComment: vi.fn(),
    writeProjectTextFile: vi.fn(),
  };
});

vi.mock('../../src/state/projects', async () => {
  const actual = await vi.importActual<typeof import('../../src/state/projects')>(
    '../../src/state/projects',
  );
  const mockConversation = (projectId: string): Conversation => ({
    id: `conv-${projectId}`,
    projectId,
    title: null,
    createdAt: 1,
    updatedAt: 1,
  });
  return {
    ...actual,
    createConversation: vi.fn().mockImplementation(async (projectId: string) => mockConversation(projectId)),
    deleteConversation: vi.fn(),
    getTemplate: vi.fn().mockResolvedValue(null),
    listConversations: vi.fn().mockImplementation(async (projectId: string) => [mockConversation(projectId)]),
    listMessages: vi.fn().mockResolvedValue([]),
    loadTabs: vi.fn().mockResolvedValue({ tabs: [], active: null }),
    patchConversation: vi.fn(),
    patchProject: vi.fn(),
    saveMessage: vi.fn(),
    saveTabs: vi.fn(),
  };
});

vi.mock('../../src/components/AppChromeHeader', () => ({
  AppChromeHeader: ({ children }: { children: ReactNode }) => <header>{children}</header>,
}));

vi.mock('../../src/components/AvatarMenu', () => ({
  AvatarMenu: () => null,
}));

vi.mock('../../src/components/FileWorkspace', () => ({
  DESIGN_SYSTEM_TAB: '__design_system__',
  FileWorkspace: ({
    openRequest,
    focusMode = false,
    onFocusModeChange,
  }: {
    openRequest?: { name: string; nonce: number } | null;
    focusMode?: boolean;
    onFocusModeChange?: (focused: boolean) => void;
  }) => {
    useLayoutEffect(() => {
      if (!focusMode || !chatPaneMockState.fireResizeObserverOnFocusedLayout) return;
      for (const callback of chatPaneMockState.resizeObserverCallbacks) {
        callback([], {} as ResizeObserver);
      }
    }, [focusMode]);

    return (
      <div data-testid="file-workspace" data-open-request-name={openRequest?.name ?? ''}>
        {focusMode ? (
          <button
            type="button"
            data-testid="workspace-focus-toggle"
            onClick={() => onFocusModeChange?.(false)}
          >
            show chat
          </button>
        ) : null}
      </div>
    );
  },
}));

vi.mock('../../src/components/Loading', () => ({
  CenteredLoader: () => <div data-testid="loader" />,
}));

vi.mock('../../src/components/ChatPane', () => ({
  ChatPane: ({
    messages,
    onSend,
    onRetry,
    error,
    projectHeader,
    onCollapse,
    collapseControlLifted,
  }: {
    messages: ChatMessage[];
    onSend: (
      prompt: string,
      attachments: ChatAttachment[],
      commentAttachments: ChatCommentAttachment[],
    ) => void;
    onRetry?: (assistantMessage: ChatMessage) => void;
    error?: string | null;
    projectHeader?: ReactNode;
    onCollapse?: () => void;
    collapseControlLifted?: boolean;
  }) => {
    const lastMessage = messages[messages.length - 1];
    const retryMessage =
      lastMessage?.role === 'assistant' &&
      (
        lastMessage.runStatus === 'failed' ||
        lastMessage.resultDeliveryState === 'no_result' ||
        lastMessage.resultDeliveryState === 'delivery_failed'
      )
      ? lastMessage
      : null;
    return (
      <div>
        {projectHeader}
        {error ? <div>{error}</div> : null}
        {error && retryMessage && onRetry ? (
          <button type="button" onClick={() => onRetry(retryMessage)}>
            retry
          </button>
        ) : null}
      <button
        type="button"
        onClick={() => onSend('Create a login page', chatPaneMockState.attachments, chatPaneMockState.commentAttachments)}
      >
        send
      </button>
      {/* Mirrors the real ChatPane: when the collapse control is lifted into
          the tabs dock, the header slot renders nothing — otherwise two
          controls would share this testid. */}
      {collapseControlLifted ? null : (
        <button type="button" data-testid="chat-collapse-toggle" onClick={onCollapse}>
          collapse chat
        </button>
      )}
      {messages.map((message) => (
        <article key={message.id} data-testid={`message-${message.role}`}>
          <span>{message.content}</span>
          <span>{message.runStatus ?? 'no-run-status'}</span>
          {(message.events ?? []).map((event, index) => (
            <span key={index}>
              {event.kind === 'status' ? `${event.label}:${event.detail ?? ''}` : ''}
              {event.kind === 'text' ? event.text : ''}
            </span>
          ))}
        </article>
      ))}
      </div>
    );
  },
}));

const mockedStreamViaDaemon = vi.mocked(streamViaDaemon);
const mockedFetchProjectFilePreview = vi.mocked(fetchProjectFilePreview);
const mockedFetchProjectFileText = vi.mocked(fetchProjectFileText);
const mockedFetchProjectFiles = vi.mocked(fetchProjectFiles);
const mockedListMessages = vi.mocked(listMessages);
const mockedSaveMessage = vi.mocked(saveMessage);
const mockedWriteProjectTextFile = vi.mocked(writeProjectTextFile);
const mockedPatchPreviewCommentStatus = vi.mocked(patchPreviewCommentStatus);
const mockedPlaySound = vi.mocked(playSound);

const config: AppConfig = {
  mode: 'api',
  apiProtocol: 'openai',
  apiKey: 'byok-test-key',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  agentId: null,
  skillId: null,
  designSystemId: null,
  notifications: {
    soundEnabled: true,
    successSoundId: 'success-sound',
    failureSoundId: 'failure-sound',
    desktopEnabled: false,
  },
};

const project: Project = {
  id: 'project-1',
  name: 'Project',
  skillId: null,
  designSystemId: null,
  createdAt: 1,
  updatedAt: 1,
};

function renderProjectView(
  renderProject: Project = project,
  agents: AgentInfo[] = [
    {
      id: 'byok-opencode',
      name: 'BYOK OpenCode',
      bin: 'opencode',
      available: true,
      models: [],
    } as AgentInfo,
  ],
) {
  return render(
    <ProjectView
      project={renderProject}
      routeFileName={null}
      config={config}
      agents={agents}
      skills={[] as SkillSummary[]}
      designTemplates={[] as SkillSummary[]}
      designSystems={[] as DesignSystemSummary[]}
      daemonLive
      onModeChange={vi.fn()}
      onAgentChange={vi.fn()}
      onAgentModelChange={vi.fn()}
      onRefreshAgents={vi.fn()}
      onOpenSettings={vi.fn()}
      onBack={vi.fn()}
      onClearPendingPrompt={vi.fn()}
      onTouchProject={vi.fn()}
      onProjectChange={vi.fn()}
      onProjectsRefresh={vi.fn()}
    />,
  );
}

describe('ProjectView API empty response handling', () => {
  beforeEach(() => {
    chatPaneMockState.attachments = [];
    chatPaneMockState.commentAttachments = [];
    chatPaneMockState.fireResizeObserverOnFocusedLayout = false;
    chatPaneMockState.resizeObserverCallbacks = [];
    mockedStreamViaDaemon.mockReset();
    mockedFetchProjectFilePreview.mockReset();
    mockedFetchProjectFileText.mockReset();
    mockedFetchProjectFiles.mockReset();
    mockedFetchProjectFilePreview.mockResolvedValue(null);
    mockedFetchProjectFileText.mockResolvedValue(null);
    mockedFetchProjectFiles.mockResolvedValue([]);
    mockedWriteProjectTextFile.mockResolvedValue({
      name: 'landing-page.html',
      path: 'landing-page.html',
      kind: 'html',
      mime: 'text/html',
      size: 1,
      mtime: 1,
    });
    mockedListMessages.mockClear();
    mockedSaveMessage.mockClear();
    mockedPatchPreviewCommentStatus.mockClear();
    mockedPlaySound.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the workspace without the removed project action toolbar', async () => {
    renderProjectView();

    expect(screen.getByTestId('file-workspace')).toBeTruthy();
    expect(screen.queryByRole('toolbar', { name: 'Project actions' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Finalize design package' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Continue in CLI' })).toBeNull();
  });

  it('keeps an empty project workspace visible across repeated chat collapse cycles', async () => {
    class MockResizeObserver implements ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        chatPaneMockState.resizeObserverCallbacks.push(callback);
      }

      disconnect() {}
      observe() {}
      unobserve() {}
    }

    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    chatPaneMockState.fireResizeObserverOnFocusedLayout = true;
    renderProjectView();

    await waitFor(() => expect(chatPaneMockState.resizeObserverCallbacks.length).toBeGreaterThan(0));

    for (let round = 0; round < 3; round += 1) {
      fireEvent.click(screen.getByTestId('chat-collapse-toggle'));

      const split = document.querySelector<HTMLDivElement>('.split');
      expect(split).not.toBeNull();
      expect(split?.classList.contains('split-focus')).toBe(true);
      expect(screen.getByTestId('file-workspace')).toBeTruthy();
      expect(screen.getByTestId('workspace-focus-toggle')).toBeTruthy();
      expect(split?.style.getPropertyValue('--project-chat-panel-width')).toBe('');
      expect(split?.style.getPropertyValue('--project-chat-handle-width')).toBe('');
      expect(split?.style.getPropertyValue('--project-workspace-panel-track')).toBe('');

      const chatSlot = split?.querySelector<HTMLDivElement>('.split-chat-slot');
      expect(chatSlot).not.toBeNull();
      fireEvent.transitionEnd(split!, { propertyName: '--project-chat-panel-width' });
      await waitFor(() => expect(chatSlot).toHaveAttribute('aria-hidden', 'true'));
      expect(chatSlot).not.toHaveAttribute('hidden');

      fireEvent.click(screen.getByTestId('workspace-focus-toggle'));
      expect(split?.classList.contains('split-focus')).toBe(false);
      expect(chatSlot).not.toHaveAttribute('aria-hidden');
    }
  });

  it('does not expose the project instructions editor from the project header', async () => {
    const view = renderProjectView();

    await screen.findByTestId('project-title');

    expect(screen.queryByTestId('project-instructions-add')).toBeNull();
    expect(view.container.querySelector('.project-instructions-chip')).toBeNull();
    expect(view.container.querySelector('.project-instructions-modal-backdrop')).toBeNull();
  });

});

async function sendTestPrompt() {
  await waitFor(() => {
    expect(mockedListMessages).toHaveBeenCalledWith(project.id, 'conv-project-1', null);
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  await waitFor(() => expect(screen.getByRole('button', { name: 'send' })).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: 'send' }));
}

function hasSavedAssistantMessage(predicate: (message: ChatMessage) => boolean): boolean {
  return mockedSaveMessage.mock.calls.some((call) => {
    const message = call[2] as ChatMessage;
    return message.role === 'assistant' && predicate(message);
  });
}
