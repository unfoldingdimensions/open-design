// @vitest-environment jsdom

import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceCollabContext } from '../../src/runtime/collab-contract';

import { DesignSystemPreviewModal } from '../../src/components/DesignSystemPreviewModal';
import { DesignSystemsTab } from '../../src/components/DesignSystemsTab';
import { BrandLogo } from '../../src/components/DesignKitView';
import { I18nProvider } from '../../src/i18n';
import type { DesignSystemDetail, DesignSystemSummary } from '../../src/types';
import { workspaceContextFixture } from '../helpers/workspace-context';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

const workspaceHarness = vi.hoisted(() => ({ state: null as any }));
const registryMocks = vi.hoisted(() => ({
  fetchDesignSystem: vi.fn(),
  fetchDesignSystemPreview: vi.fn(),
  fetchDesignSystemShowcase: vi.fn(),
  fetchProjectFileText: vi.fn(),
  updateDesignSystemDraft: vi.fn(),
}));




vi.mock('../../src/providers/registry', async () => {
  const actual = await vi.importActual<typeof import('../../src/providers/registry')>(
    '../../src/providers/registry',
  );
  return {
    ...actual,
    fetchDesignSystem: registryMocks.fetchDesignSystem,
    fetchDesignSystemPreview: registryMocks.fetchDesignSystemPreview,
    fetchDesignSystemShowcase: registryMocks.fetchDesignSystemShowcase,
    fetchProjectFileText: registryMocks.fetchProjectFileText,
    updateDesignSystemDraft: registryMocks.updateDesignSystemDraft,
    deleteDesignSystemDraft: vi.fn(async () => true),
    projectRawUrl: (
      projectId: string,
      filePath: string,
      context?: WorkspaceCollabContext | null,
    ) => `/raw/${projectId}/${filePath}?workspace=${context?.workspaceId ?? 'none'}`,
  };
});

const CONTEXT = workspaceContextFixture({
  workspaceId: 'ws-read',
  workspaceMemberId: 'member-read',
  workspaceType: 'personal',
});

const SYSTEM: DesignSystemSummary = {
  id: 'user:generation-fence',
  title: 'Generation Fence',
  summary: 'Generation scoped system',
  category: 'Custom',
  source: 'user',
  status: 'draft',
  isEditable: true,
  projectId: 'project-generation-fence',
};

function setWorkspaceGeneration(
  generation: string,
  verifiedContext: WorkspaceCollabContext | null = CONTEXT,
  readContext: WorkspaceCollabContext = CONTEXT,
) {
  workspaceHarness.state = {
    context: verifiedContext,
    resourceReadIdentity: { context: readContext, generation },
    loading: false,
    identityChangePending: false,
  };
}

function renderModal() {
  return render(
    <I18nProvider initial="en">
      <DesignSystemPreviewModal system={SYSTEM} onClose={() => {}} />
    </I18nProvider>,
  );
}

function renderTab() {
  return render(
    <I18nProvider initial="en">
      <DesignSystemsTab
        systems={[SYSTEM]}
        selectedId={null}
        onSelect={() => {}}
        onCreate={() => {}}
        onOpenSystem={() => {}}
      />
    </I18nProvider>,
  );
}

beforeEach(() => {
  setWorkspaceGeneration('generation-a');
  registryMocks.fetchDesignSystem.mockReset();
  registryMocks.fetchDesignSystemPreview.mockReset();
  registryMocks.fetchDesignSystemShowcase.mockReset();
  registryMocks.fetchProjectFileText.mockReset();
  registryMocks.updateDesignSystemDraft.mockReset();
  registryMocks.updateDesignSystemDraft.mockResolvedValue(null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('design-system resource read identity', () => {
  it('retries an unchanged logo URL when the read generation advances', () => {
    const view = render(
      <BrandLogo
        logoSrc="/same-logo.svg"
        name="Generation logo"
        faviconSize={64}
        readGeneration="generation-a"
      />,
    );
    fireEvent.error(view.container.querySelector('img')!);
    expect(view.container.querySelector('img')).toBeNull();

    view.rerender(
      <BrandLogo
        logoSrc="/same-logo.svg"
        name="Generation logo"
        faviconSize={64}
        readGeneration="generation-b"
      />,
    );

    expect(view.container.querySelector('img')?.getAttribute('src')).toBe('/same-logo.svg');
  });

});
