// ImageAgentPicker — per-project "image & vision agent" selector.
//
// Sits beside the chat agent/model picker (AvatarMenu) in the composer's
// execution controls. Picks the chat-agent CLI (from the detected runtime
// library: agy, claude, codex, …) that the project routes image-generation
// and vision-review work to — see daemon `metadata.imageAgentId` and the
// image-vision-router. Choosing "Main chat agent" (null) leaves image work on
// the project's normal chat agent (today's behavior).
//
// Presentational: the parent owns the project record + patch, so this calls
// `onSelect(imageAgentId)` and lets the parent merge metadata + persist.
//
// The popover is rendered through a portal to <body> with fixed positioning
// (computed from the trigger rect), matching AvatarMenu. An inline popover
// inside the composer DOM can unmount between mousedown and click when the
// composer re-renders on blur/draft change — which made agent rows
// unclickable in the composer footer.

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { AgentInfo } from '../types';
import { useT } from '../i18n';
import { AgentIcon } from './AgentIcon';
import { Icon } from './Icon';

interface Props {
  /** Currently selected image-agent id (null = route to main chat agent). */
  value: string | null;
  agents: AgentInfo[];
  onSelect: (imageAgentId: string | null) => void;
  placement?: 'up' | 'down';
  disabled?: boolean;
}

export function ImageAgentPicker({
  value,
  agents,
  onSelect,
  placement = 'up',
  disabled = false,
}: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties | null>(null);
  const currentAgent = value ? agents.find((a) => a.id === value) : null;

  const close = useCallback(() => setOpen(false), []);

  // Outside click / Escape close — checks BOTH the trigger wrapper and the
  // portal popover so a click inside either keeps the menu open.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (ev: MouseEvent) => {
      const target = ev.target as Node;
      if (wrapRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Position the portal popover under/over the trigger, clamped to viewport.
  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const margin = 16;
      const gap = 8;
      const width = Math.min(300, window.innerWidth - margin * 2);
      const left = Math.min(
        Math.max(rect.left, margin),
        window.innerWidth - width - margin,
      );
      if (placement === 'up') {
        const available = Math.max(160, rect.top - margin - gap);
        setPopoverStyle({
          position: 'fixed',
          top: 'auto',
          bottom: Math.max(margin, window.innerHeight - rect.top + gap),
          left,
          right: 'auto',
          width,
          maxHeight: Math.min(520, available),
          overflowY: 'auto',
          zIndex: 1000,
        });
        return;
      }
      const top = rect.bottom + gap;
      const available = Math.max(160, window.innerHeight - top - margin);
      setPopoverStyle({
        position: 'fixed',
        top,
        bottom: 'auto',
        left,
        right: 'auto',
        width,
        maxHeight: Math.min(520, available),
        overflowY: 'auto',
        zIndex: 1000,
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, placement]);

  const label = currentAgent
    ? currentAgent.name
    : value
      ? value
      : t('project.imageAgentAuto');

  const choose = (agentId: string | null) => {
    setOpen(false);
    if (agentId === value) return;
    onSelect(agentId);
  };

  return (
    <div className="image-agent-picker" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="image-agent-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        data-tooltip={t('project.imageAgentTooltip')}
        title={t('project.imageAgentTooltip')}
        aria-label={t('project.imageAgentTooltip')}
        disabled={disabled}
      >
        <span className="image-agent-trigger__icon" aria-hidden>
          <Icon name={currentAgent ? 'sparkles' : 'image'} size={16} />
        </span>
        <span className="image-agent-trigger__label">{label}</span>
        <Icon name="chevron-down" size={14} />
      </button>
      {open && popoverStyle && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={popoverRef}
              className="image-agent-popover"
              role="menu"
              aria-label={t('project.imageAgentTooltip')}
              style={popoverStyle}
            >
              <div className="image-agent-popover__title">{t('project.imageAgentSection')}</div>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={value === null}
                className={`image-agent-option${value === null ? ' is-selected' : ''}`}
                onClick={() => choose(null)}
              >
                <span className="image-agent-option__icon" aria-hidden>
                  <Icon name="robot" size={14} />
                </span>
                <span className="image-agent-option__copy">
                  <span className="image-agent-option__name">{t('project.imageAgentAuto')}</span>
                  <span className="image-agent-option__desc">{t('project.imageAgentAutoHint')}</span>
                </span>
                {value === null ? <Icon name="check" size={14} /> : null}
              </button>
              <div className="image-agent-popover__divider" />
              {agents.map((agent) => {
                const selected = value === agent.id;
                const disabledRow = !agent.available;
                return (
                  <button
                    key={agent.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    aria-disabled={disabledRow}
                    disabled={disabledRow}
                    className={`image-agent-option${selected ? ' is-selected' : ''}${
                      disabledRow ? ' is-disabled' : ''
                    }`}
                    onClick={() => choose(agent.id)}
                  >
                    <span className="image-agent-option__icon" aria-hidden>
                      <AgentIcon id={agent.id} size={16} />
                    </span>
                    <span className="image-agent-option__copy">
                      <span className="image-agent-option__name">{agent.name}</span>
                      <span className="image-agent-option__desc">
                        {agent.available
                          ? t('project.imageAgentInstalled')
                          : t('project.imageAgentNotInstalled')}
                      </span>
                    </span>
                    {selected ? <Icon name="check" size={14} /> : null}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
