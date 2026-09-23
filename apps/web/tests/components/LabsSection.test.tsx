// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  OdNextRolloutControlStatus,
  OdNextRolloutMode,
  OdNextRolloutModeSource,
} from '@capydesign/contracts';

import { LabsSection } from '../../src/components/LabsSection';
import { I18nProvider } from '../../src/i18n';

const track = vi.fn();

function status(overrides: {
  requestedMode?: OdNextRolloutMode;
  requestedModeSource?: OdNextRolloutModeSource;
} = {}): OdNextRolloutControlStatus {
  const requestedMode = overrides.requestedMode ?? 'off';
  return {
    strategyId: 'od-next-strategy',
    scope: 'daemon_instance',
    requestedMode,
    requestedModeSource: overrides.requestedModeSource ?? 'default',
    effectiveMode: requestedMode,
  };
}

interface Stub {
  rolloutStatus?: OdNextRolloutControlStatus;
  rolloutFails?: boolean;
  writeFails?: boolean;
  /** Held open to keep a PUT in flight while the section unmounts. */
  writeGate?: Promise<void>;
}

function stubFetch(options: Stub = {}) {
  const writes: unknown[] = [];
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url === '/api/strategies/od-next/rollout') {
      if (options.rolloutFails) return new Response('{}', { status: 500 });
      return new Response(
        JSON.stringify({ status: options.rolloutStatus ?? status() }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url === '/api/app-config') {
      writes.push(JSON.parse(String(init?.body ?? '{}')));
      if (options.writeGate) await options.writeGate;
      if (options.writeFails) return new Response('{}', { status: 500 });
      return new Response('{"config":{}}', { status: 200 });
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return { writes, fetchMock };
}

/**
 * Stands in for `SettingsDialog`, which owns one shared save indicator for
 * every section. `supersede()` is another section taking it over.
 */
function autosaveHost(onAutosaveStatus?: (s: 'saving' | 'saved' | 'error' | 'idle') => void) {
  let epoch = 0;
  return {
    supersede: () => { epoch += 1; },
    controller: {
      claim: () => {
        epoch += 1;
        onAutosaveStatus?.('saving');
        return epoch;
      },
      settle: (claim: number, status: 'saved' | 'error' | 'idle') => {
        if (claim !== epoch) return;
        onAutosaveStatus?.(status);
      },
    },
  };
}

function renderSection(onAutosaveStatus?: (s: 'saving' | 'saved' | 'error' | 'idle') => void) {
  const host = autosaveHost(onAutosaveStatus);
  return {
    ...render(
      <I18nProvider initial="en">
        <LabsSection autosave={host.controller} />
      </I18nProvider>,
    ),
    host,
  };
}

function switchEl(): HTMLButtonElement {
  return screen.getByTestId('labs-harness-switch') as HTMLButtonElement;
}

describe('LabsSection', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    track.mockClear();
  });

  it('renders the harness row off and operable on a machine that never configured it', async () => {
    stubFetch();
    renderSection();
    await waitFor(() => expect(switchEl().getAttribute('aria-disabled')).toBe('false'));
    expect(switchEl().getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText('Design Harness')).toBeTruthy();
    expect(
      screen.getByText(
        "Your next generation will use CapyDesign's latest strategy, with noticeably more polished results (beta)",
      ),
    ).toBeTruthy();
  });

  it('renders on when the installation saved active', async () => {
    stubFetch({ rolloutStatus: status({ requestedMode: 'active', requestedModeSource: 'app_config' }) });
    renderSection();
    await waitFor(() => expect(switchEl().getAttribute('aria-checked')).toBe('true'));
    expect(switchEl().getAttribute('aria-disabled')).toBe('false');
  });

  it('shows observe as off without rewriting it', async () => {
    const { writes } = stubFetch({
      rolloutStatus: status({ requestedMode: 'observe', requestedModeSource: 'app_config' }),
    });
    renderSection();
    await waitFor(() => expect(switchEl().getAttribute('aria-disabled')).toBe('false'));
    expect(switchEl().getAttribute('aria-checked')).toBe('false');
    expect(writes).toEqual([]);
  });

  it('writes active on the first turn-on and reports it on the autosave surface', async () => {
    const { writes } = stubFetch();
    const onAutosaveStatus = vi.fn();
    renderSection(onAutosaveStatus);
    await waitFor(() => expect(switchEl().getAttribute('aria-disabled')).toBe('false'));

    fireEvent.click(switchEl());

    await waitFor(() => expect(writes).toEqual([{ odNextStrategyMode: 'active' }]));
    expect(switchEl().getAttribute('aria-checked')).toBe('true');
    await waitFor(() => expect(onAutosaveStatus.mock.calls.map((c) => c[0])).toEqual(['saving', 'saved']));
  });

  it('writes an explicit off rather than clearing the key', async () => {
    const { writes } = stubFetch({
      rolloutStatus: status({ requestedMode: 'active', requestedModeSource: 'app_config' }),
    });
    renderSection();
    await waitFor(() => expect(switchEl().getAttribute('aria-checked')).toBe('true'));

    fireEvent.click(switchEl());

    await waitFor(() => expect(writes).toEqual([{ odNextStrategyMode: 'off' }]));
  });

  it('rolls the switch back and reports an error when the write fails', async () => {
    stubFetch({ writeFails: true });
    const onAutosaveStatus = vi.fn();
    renderSection(onAutosaveStatus);
    await waitFor(() => expect(switchEl().getAttribute('aria-disabled')).toBe('false'));

    fireEvent.click(switchEl());

    await waitFor(() => expect(onAutosaveStatus).toHaveBeenCalledWith('error'));
    expect(switchEl().getAttribute('aria-checked')).toBe('false');
    expect(switchEl().getAttribute('aria-disabled')).toBe('false');
  });

  it('starts one write for a burst of clicks in the same tick', async () => {
    // `busy` is state, so a second click in the same tick still sees the
    // pre-render closure: `busy` false and the old `on`. Without a guard that
    // flips synchronously, each click in the burst starts its own write from a
    // stale baseline.
    const { writes } = stubFetch();
    renderSection();
    await waitFor(() => expect(switchEl().getAttribute('aria-disabled')).toBe('false'));

    const target = switchEl();
    target.click();
    target.click();
    target.click();

    await waitFor(() => expect(writes.length).toBeGreaterThan(0));
    expect(writes).toEqual([{ odNextStrategyMode: 'active' }]);
    await waitFor(() => expect(switchEl().getAttribute('aria-checked')).toBe('true'));
  });

  it('accepts a second toggle once the first write has settled', async () => {
    const { writes } = stubFetch();
    renderSection();
    await waitFor(() => expect(switchEl().getAttribute('aria-disabled')).toBe('false'));

    fireEvent.click(switchEl());
    await waitFor(() => expect(writes).toEqual([{ odNextStrategyMode: 'active' }]));
    await waitFor(() => expect(switchEl().getAttribute('aria-disabled')).toBe('false'));

    fireEvent.click(switchEl());
    await waitFor(() => expect(writes).toEqual([
      { odNextStrategyMode: 'active' },
      { odNextStrategyMode: 'off' },
    ]));
    expect(switchEl().getAttribute('aria-checked')).toBe('false');
  });

  it('reports nothing when the write fails', async () => {
    // The switch rolls back, so the install does not hold the preference the
    // event would have asserted.
    stubFetch({ writeFails: true });
    const onAutosaveStatus = vi.fn();
    renderSection(onAutosaveStatus);
    await waitFor(() => expect(switchEl().getAttribute('aria-disabled')).toBe('false'));

    fireEvent.click(switchEl());

    await waitFor(() => expect(onAutosaveStatus).toHaveBeenCalledWith('error'));
    expect(track).not.toHaveBeenCalled();
  });

  describe('left while the write is still in flight', () => {
    function heldWrite() {
      let release = () => {};
      const gate = new Promise<void>((resolve) => {
        release = () => resolve();
      });
      return { gate, release };
    }

    it('settles the dialog autosave pill instead of leaving it on saving', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const { gate, release } = heldWrite();
        const { writes } = stubFetch({ writeGate: gate });
        const onAutosaveStatus = vi.fn();
        renderSection(onAutosaveStatus);
        await waitFor(() => expect(switchEl().getAttribute('aria-disabled')).toBe('false'));

        fireEvent.click(switchEl());
        await waitFor(() => expect(writes).toHaveLength(1));
        expect(onAutosaveStatus).toHaveBeenCalledWith('saving');
        cleanup();
        release();

        await waitFor(() => expect(onAutosaveStatus).toHaveBeenCalledWith('saved'));
        await vi.advanceTimersByTimeAsync(3_000);
        await waitFor(() => expect(onAutosaveStatus).toHaveBeenCalledWith('idle'));
      } finally {
        vi.useRealTimers();
      }
    });

    it('reports the failed write as an error rather than stranding the pill', async () => {
      const { gate, release } = heldWrite();
      const { writes } = stubFetch({ writeGate: gate, writeFails: true });
      const onAutosaveStatus = vi.fn();
      renderSection(onAutosaveStatus);
      await waitFor(() => expect(switchEl().getAttribute('aria-disabled')).toBe('false'));

      fireEvent.click(switchEl());
      await waitFor(() => expect(writes).toHaveLength(1));
      cleanup();
      release();

      await waitFor(() => expect(onAutosaveStatus).toHaveBeenCalledWith('error'));
      expect(track).not.toHaveBeenCalled();
    });

  });

  it('locks the switch and explains when an environment variable owns the mode', async () => {
    stubFetch({
      rolloutStatus: status({ requestedMode: 'active', requestedModeSource: 'env' }),
    });
    renderSection();
    await waitFor(() => expect(switchEl().getAttribute('aria-disabled')).toBe('true'));
    expect(switchEl().getAttribute('aria-checked')).toBe('true');
    expect(
      screen.getByText('An environment variable is controlling this setting, so it cannot be changed here.'),
    ).toBeTruthy();
  });

  it('keeps the page usable when the daemon cannot be reached', async () => {
    const { writes } = stubFetch({ rolloutFails: true });
    renderSection();
    await waitFor(() => expect(switchEl().getAttribute('aria-disabled')).toBe('true'));
    expect(screen.getByText('Design Harness')).toBeTruthy();
    expect(
      screen.getByText('Could not read this setting. Check that the local daemon is running.'),
    ).toBeTruthy();

    fireEvent.click(switchEl());
    expect(writes).toEqual([]);
  });

  it('reveals the explanation on hover and on keyboard focus, and never toggles from it', async () => {
    const { writes } = stubFetch();
    renderSection();
    await waitFor(() => expect(switchEl().getAttribute('aria-disabled')).toBe('false'));

    const trigger = screen.getByLabelText('About Design Harness');
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.mouseEnter(trigger);
    expect(screen.getByRole('tooltip').textContent).toContain('agent harness');
    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.focus(trigger);
    expect(screen.getByRole('tooltip').textContent).toContain('Hyperframes');
    fireEvent.blur(trigger);
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.click(trigger);
    expect(writes).toEqual([]);
    expect(switchEl().getAttribute('aria-checked')).toBe('false');
  });

  it('lets a failed status read be retried from the switch itself', async () => {
    // The state this guards against: the read fails once, the row renders
    // locked, and nothing the user can do inside Settings clears it. That is
    // only survivable while some other control exists, and for a packaged
    // install this switch is the only one.
    let attempt = 0;
    const status = {
      strategyId: 'od-next-strategy' as const,
      scope: 'daemon_instance' as const,
      requestedMode: 'active' as const,
      requestedModeSource: 'default' as const,
      effectiveMode: 'active' as const,
    };
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/api/strategies/od-next/rollout')) {
        attempt += 1;
        if (attempt === 1) return new Response('nope', { status: 500 });
        return new Response(JSON.stringify({ status }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('{}', { status: 200 });
    }));

    render(<I18nProvider><LabsSection /></I18nProvider>);
    const control = await screen.findByRole('switch');
    await waitFor(() => expect(control).toHaveAttribute('aria-disabled', 'true'));

    fireEvent.click(control);

    await waitFor(() => expect(control).toHaveAttribute('aria-disabled', 'false'));
    expect(attempt).toBe(2);
  });
});
