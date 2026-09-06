// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ImageAgentPicker } from '../../src/components/ImageAgentPicker';
import type { AgentInfo } from '../../src/types';

vi.mock('../../src/i18n', () => ({
  useT: () => (key: string) => key,
}));

const AGENTS: AgentInfo[] = [
  { id: 'command-code', name: 'Command Code', available: true, models: [] } as unknown as AgentInfo,
  { id: 'antigravity', name: 'Antigravity', available: true, models: [] } as unknown as AgentInfo,
  { id: 'claude', name: 'Claude', available: false, models: [] } as unknown as AgentInfo,
];

function renderPicker(value: string | null, onSelect = vi.fn()) {
  return render(
    <ImageAgentPicker value={value} agents={AGENTS} onSelect={onSelect} />,
  );
}

describe('ImageAgentPicker', () => {
  afterEach(() => cleanup());

  it('shows "Main chat agent" when no image agent is set', () => {
    renderPicker(null);
    expect(screen.getByRole('button', { name: 'project.imageAgentTooltip' })).toBeTruthy();
    expect(screen.getByText('project.imageAgentAuto')).toBeTruthy();
  });

  it('shows the selected agent name when one is set', () => {
    renderPicker('antigravity');
    expect(screen.getByText('Antigravity')).toBeTruthy();
  });

  it('opens the menu and lists agents + the main-chat-agent option', () => {
    renderPicker(null);
    fireEvent.click(screen.getByRole('button', { name: 'project.imageAgentTooltip' }));
    expect(screen.getByText('Command Code')).toBeTruthy();
    expect(screen.getByText('Antigravity')).toBeTruthy();
    expect(screen.getByText('Claude')).toBeTruthy();
    // Appears in the trigger chip AND the popover option row.
    expect(screen.getAllByText('project.imageAgentAuto').length).toBeGreaterThanOrEqual(2);
  });

  it('calls onSelect with the chosen agent id', () => {
    const onSelect = vi.fn();
    renderPicker(null, onSelect);
    fireEvent.click(screen.getByRole('button', { name: 'project.imageAgentTooltip' }));
    fireEvent.click(screen.getByText('Antigravity'));
    expect(onSelect).toHaveBeenCalledWith('antigravity');
  });

  it('calls onSelect(null) for the main-chat-agent option', () => {
    const onSelect = vi.fn();
    renderPicker('antigravity', onSelect);
    fireEvent.click(screen.getByRole('button', { name: 'project.imageAgentTooltip' }));
    // The "main chat agent" row: click the option whose name is the auto label.
    const options = screen.getAllByRole('menuitemradio');
    const autoOption = options.find((o) => o.getAttribute('aria-checked') === 'false'
      && o.textContent?.includes('project.imageAgentAuto'));
    expect(autoOption).toBeTruthy();
    if (autoOption) fireEvent.click(autoOption);
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('marks the selected agent row as checked', () => {
    renderPicker('command-code');
    fireEvent.click(screen.getByRole('button', { name: 'project.imageAgentTooltip' }));
    const selected = screen.getByRole('menuitemradio', { name: /Command Code/ });
    expect(selected.getAttribute('aria-checked')).toBe('true');
  });

  it('disables unavailable agents and ignores their clicks', () => {
    const onSelect = vi.fn();
    renderPicker(null, onSelect);
    fireEvent.click(screen.getByRole('button', { name: 'project.imageAgentTooltip' }));
    // Disabled rows are excluded from the a11y tree, so locate via text.
    const claude = screen.getByText('Claude').closest('button');
    expect(claude).toBeTruthy();
    expect(claude?.hasAttribute('disabled')).toBe(true);
    expect(claude?.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(claude as HTMLElement);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('keeps installed agents clickable', () => {
    const onSelect = vi.fn();
    renderPicker(null, onSelect);
    fireEvent.click(screen.getByRole('button', { name: 'project.imageAgentTooltip' }));
    const ag = screen.getByRole('menuitemradio', { name: /Antigravity/ });
    expect(ag.hasAttribute('disabled')).toBe(false);
    fireEvent.click(ag);
    expect(onSelect).toHaveBeenCalledWith('antigravity');
  });

  it('renders the popover through a portal onto document.body', () => {
    renderPicker(null);
    fireEvent.click(screen.getByRole('button', { name: 'project.imageAgentTooltip' }));
    // The popover (role=menu) must be a direct child of <body> via the portal,
    // not nested inside the component's own DOM tree — mirroring AvatarMenu.
    const popover = document.body.querySelector('.image-agent-popover');
    expect(popover).toBeTruthy();
    expect(popover?.closest('.image-agent-picker')).toBeNull();
  });
});
