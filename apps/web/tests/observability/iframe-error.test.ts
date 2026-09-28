// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { PREVIEW_OBSERVABILITY_MESSAGE_TYPE } from '@capydesign/contracts/runtime/preview-observability';

const { reportSafetyEvent } = vi.hoisted(() => ({
  reportSafetyEvent: vi.fn(),
}));


import {
  installPreviewIframeMessageObserver,
  reportPreviewIframeMessage,
  reportPreviewTransportRecovery,
  subscribePreviewIframeMessages,
} from '../../src/observability/iframe-error';

afterEach(() => {
  reportSafetyEvent.mockReset();
});

describe('preview iframe observability', () => {
  it('buffers boot-time iframe messages until FileViewer subscribes', () => {
    const teardown = installPreviewIframeMessageObserver();
    const source = window;
    window.dispatchEvent(new MessageEvent('message', {
      source,
      data: {
        type: PREVIEW_OBSERVABILITY_MESSAGE_TYPE,
        version: 1,
        event: 'runtime_error',
        message: 'early boot failure',
      },
    }));

    const subscriber = vi.fn();
    const unsubscribe = subscribePreviewIframeMessages(subscriber);
    expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({
      source,
      data: expect.objectContaining({ message: 'early boot failure' }),
    }));

    unsubscribe();
    const laterSubscriber = vi.fn();
    const unsubscribeLater = subscribePreviewIframeMessages(laterSubscriber);
    expect(laterSubscriber).not.toHaveBeenCalled();

    unsubscribeLater();
    teardown();
  });

  it('does not replay messages delivered to a live subscriber', () => {
    const teardown = installPreviewIframeMessageObserver();
    const source = window;
    const subscriber = vi.fn();
    const unsubscribe = subscribePreviewIframeMessages(subscriber);
    window.dispatchEvent(new MessageEvent('message', {
      source,
      data: {
        type: PREVIEW_OBSERVABILITY_MESSAGE_TYPE,
        version: 1,
        event: 'runtime_error',
        message: 'live failure',
      },
    }));
    expect(subscriber).toHaveBeenCalledTimes(1);

    unsubscribe();
    const replacementSubscriber = vi.fn();
    const unsubscribeReplacement = subscribePreviewIframeMessages(replacementSubscriber);
    expect(replacementSubscriber).not.toHaveBeenCalled();

    unsubscribeReplacement();
    teardown();
  });
});
