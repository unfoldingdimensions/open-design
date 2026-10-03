// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import { openFirstPartyExternalLinkFromClick } from '../src/first-party-external-link';

describe('openFirstPartyExternalLinkFromClick', () => {
  it('does not intercept links when no first-party host is configured', () => {
    // The fork ships no hosted site, so `open-design.ai` is no longer a
    // first-party host: the bridge must leave the click alone and let the
    // browser handle the navigation.
    const opened = vi.fn();
    const anchor = document.createElement('a');
    anchor.href = 'https://open-design.ai/console';
    document.body.append(anchor);
    const listener = (event: MouseEvent) => openFirstPartyExternalLinkFromClick(event, opened);
    document.addEventListener('click', listener);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);
    document.removeEventListener('click', listener);

    expect(event.defaultPrevented).toBe(false);
    expect(opened).not.toHaveBeenCalled();
  });
});
