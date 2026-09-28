// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement, type ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceCollabContext } from '../../src/runtime/collab-contract';

import { DesignSystemPreviewModal } from '../../src/components/DesignSystemPreviewModal';
import { I18nProvider } from '../../src/i18n';
import type { DesignSystemSummary } from '../../src/types';

const {
  fetchDesignSystemMock,
  fetchDesignSystemShowcaseMock,
  fetchProjectFileTextMock,
  projectRawUrlMock,
  workspaceContextState,
} = vi.hoisted(() => ({
  fetchDesignSystemMock: vi.fn(async () => ({
    id: 'claymorphism',
    title: 'Claymorphism',
    summary: 'Bundled design system',
    category: 'style',
    body: '# Claymorphism',
  })),
  fetchDesignSystemShowcaseMock: vi.fn(async () => '<!doctype html><p>showcase</p>'),
  fetchProjectFileTextMock: vi.fn(async (_projectId: string, filePath: string) =>
    filePath === 'brand.json'
      ? JSON.stringify({
          name: 'Claymorphism',
          logo: { primary: 'logos/mark.svg', alternates: [], notes: '' },
          colors: [],
          typography: {},
        })
      : null),
  projectRawUrlMock: vi.fn((projectId: string, filePath: string, context?: WorkspaceCollabContext | null) =>
    context
      ? `/raw/${projectId}/${filePath}?workspaceId=${context.workspaceId}&workspaceMemberId=${context.workspaceMemberId}`
      : `/raw/${projectId}/${filePath}`),
  workspaceContextState: {
    context: null as WorkspaceCollabContext | null,
    resourceReadIdentity: null as { context: WorkspaceCollabContext; generation: string } | null,
    loading: false,
  },
}));

vi.mock('../../src/providers/registry', () => ({
  designSystemStaticUrl: (id: string, filePath: string) => `/design-systems/${id}/${filePath}`,
  fetchDesignSystem: fetchDesignSystemMock,
  fetchDesignSystemPreview: vi.fn(async () => '<!doctype html><p>tokens</p>'),
  fetchDesignSystemShowcase: fetchDesignSystemShowcaseMock,
  fetchProjectFileText: fetchProjectFileTextMock,
  openExternalUrl: vi.fn(),
  projectRawUrl: projectRawUrlMock,
}));


const SYSTEM = {
  id: 'claymorphism',
  title: 'Claymorphism',
  summary: 'Bundled design system',
  category: 'style',
  source: 'built-in',
} as DesignSystemSummary;

const PROJECT_WORKSPACE_CONTEXT: WorkspaceCollabContext = {
  workspaceId: 'workspace-project',
  workspaceType: 'team',
  workspaceMemberId: 'member-viewer',
  role: 'member',
  memberStatus: 'active',
  lifecycleState: 'active',
  billingState: 'active',
  planId: null,
  providerMode: 'platform_credits',
  seatSummary: { seatLimit: 3, usedSeats: 2, availableSeats: 1, isSeatFull: false },
  permissions: {
    canManageMembers: false,
    canManageBilling: false,
    canInviteMembers: false,
    canManageAutoRecharge: false,
    canShareProjects: true,
    canWriteSyncedFiles: false,
    canViewWorkspaceSettings: false,
    canManageSharedResources: false,
  },
};

function renderInsideStackingContext() {
  const host = document.createElement('div');
  host.className = 'composer';
  document.body.appendChild(host);

  render(
    <I18nProvider>
      <div className="composer-shell">
        <DesignSystemPreviewModal system={SYSTEM} onClose={() => {}} />
      </div>
    </I18nProvider>,
    { container: host },
  );

  return host;
}

describe('DesignSystemPreviewModal layering', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    fetchDesignSystemShowcaseMock.mockReset();
    fetchDesignSystemShowcaseMock.mockResolvedValue('<!doctype html><p>showcase</p>');
    fetchDesignSystemMock.mockClear();
    fetchProjectFileTextMock.mockClear();
    projectRawUrlMock.mockClear();
    workspaceContextState.context = null;
    workspaceContextState.resourceReadIdentity = null;
    workspaceContextState.loading = false;
  });

  it('portals the preview to document.body so composer overlays cannot cover it', () => {
    const host = renderInsideStackingContext();

    const backdrop = document.body.querySelector('.ds-modal-backdrop');
    expect(backdrop).toBeTruthy();
    expect(backdrop?.parentElement).toBe(document.body);
    expect(host.querySelector('.ds-modal-backdrop')).toBeNull();
  });

  it('opens chip previews on the rich kit tab while keeping Showcase HTML-backed', async () => {
    render(
      <I18nProvider>
        <DesignSystemPreviewModal
          system={{ ...SYSTEM, projectId: 'project-clay' }}
          initialViewId="kit"
          onClose={() => {}}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole('tab', { name: 'Visualize' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Showcase' }).getAttribute('aria-selected')).toBe('false');
    expect(screen.getByTestId('design-system-modal-kit')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Showcase' }));

    await waitFor(() => {
      expect(fetchDesignSystemShowcaseMock).toHaveBeenCalledWith('claymorphism', null);
    });
    expect(screen.getByRole('tab', { name: 'Showcase' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('button', { name: 'Share' })).toBeTruthy();
  });
});
