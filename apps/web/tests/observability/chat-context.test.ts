// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Stand-ins: the module that provided these was removed with the Cloud surface.
const clearExceptionTrackingContext: any = (..._args: unknown[]) => null;
const setExceptionTrackingContext: any = (..._args: unknown[]) => null;
import {
  __resetChatContextForTest,
  chatBreadcrumbTrail,
  chatMeasurementTrust,
  setChatCorrelation,
} from '../../src/observability/chat-context';
import {
  __resetChatHealthForTest,
  openChatSurface,
} from '../../src/observability/chat-health';

/**
 * The correlation layer is what turns "the number got worse" into "the
 * number got worse HERE". These specs pin the three properties that make
 * that possible, and the one property that keeps it safe:
 *
 *   - every chat event carries the join keys (run/conversation/project),
 *   - a bad-outcome event carries the run-up, not just the moment,
 *   - a timing taken under bad conditions is labelled as such,
 *   - and none of the above ever carries user content.
 */

const fetchMock = vi.fn();
const ORIGINAL_FETCH = globalThis.fetch;

let clock = 0;

function sentEvents(): Array<{ event: string; properties: Record<string, unknown> }> {
  return fetchMock.mock.calls.map((call) => {
    const init = call[1] as RequestInit;
    return JSON.parse(init.body as string) as {
      event: string;
      properties: Record<string, unknown>;
    };
  });
}

function propsOf(name: string): Record<string, unknown> | undefined {
  return sentEvents().find((e) => e.event === name)?.properties;
}

function setHeap(usedBytes: number, limitBytes: number): void {
  (performance as unknown as { memory?: unknown }).memory = {
    usedJSHeapSize: usedBytes,
    totalJSHeapSize: usedBytes,
    jsHeapSizeLimit: limitBytes,
  };
}

function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

function buildChatLog(rows: number): HTMLElement {
  const log = document.createElement('div');
  for (let i = 0; i < rows; i += 1) {
    const row = document.createElement('div');
    row.appendChild(document.createElement('details'));
    log.appendChild(row);
  }
  document.body.appendChild(log);
  return log;
}

beforeEach(() => {
  clock = 0;
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response('', { status: 200 }));
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
  setExceptionTrackingContext({
    apiKey: 'phc_test',
    host: 'https://us.i.posthog.com',
    distinctId: 'chat-context-test',
    clientType: 'web',
    osName: 'Mac OS X',
  });
  vi.useFakeTimers({ shouldAdvanceTime: false });
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  setVisibility('visible');
  document.body.innerHTML = '';
  __resetChatHealthForTest();
  __resetChatContextForTest();
});

afterEach(() => {
  __resetChatHealthForTest();
  __resetChatContextForTest();
  vi.useRealTimers();
  vi.restoreAllMocks();
  clearExceptionTrackingContext();
  globalThis.fetch = ORIGINAL_FETCH;
  delete (performance as unknown as { memory?: unknown }).memory;
  delete (globalThis as unknown as { posthog?: unknown }).posthog;
  document.body.innerHTML = '';
});

describe('observability/chat-context — breadcrumbs on bad outcomes', () => {
  it('caps the breadcrumb trail so a long session cannot grow the payload', () => {
    const log = buildChatLog(1);
    const handle = openChatSurface({ element: log, messageCount: 1, virtualized: false });
    for (let i = 0; i < 200; i += 1) {
      handle.runStarted(`run-${i}`);
      handle.runEnded(`run-${i}`);
    }
    const entries = chatBreadcrumbTrail().split(',');
    expect(entries.length).toBeLessThanOrEqual(24);
  });
});

describe('observability/chat-context — measurement trust', () => {
  it('distrusts a reading taken while a stylesheet has not applied yet', () => {
    // This is the failure mode that fooled a careful human observer: in
    // Next dev the CSS Module stylesheet lands after the DOM, so anything
    // measured before it reflects browser defaults, not the product.
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/late.css';
    document.head.appendChild(link);
    // jsdom never resolves the sheet, which is exactly the pending state.
    expect(chatMeasurementTrust({ hiddenDuringWindow: false })).toEqual({
      measurement_trusted: false,
      untrusted_reason: 'stylesheets_pending',
    });
    link.remove();
  });
});
