import { describe, expect, it } from 'vitest';

import { formatWholeSeconds } from '../src/components/AssistantMessage';
import { formatToolDurationMs } from '../src/components/ToolCard';

// Rounding the remainder can produce a full minute (119.6s -> m=1, rem=60);
// both formatters must roll over instead of rendering "1m 60s".
describe.each([
  ['run total', formatWholeSeconds],
  ['tool duration', formatToolDurationMs],
])('%s formatting', (_name, format) => {
  it('renders whole seconds under a minute', () => {
    expect(format(42_000)).toBe('42s');
  });

  it('renders minutes with zero-padded seconds', () => {
    expect(format(62_000)).toBe('1m 02s');
  });

  it('rolls a rounded-up remainder over instead of rendering 60s', () => {
    expect(format(119_600)).toBe('2m');
    expect(format(179_600)).toBe('3m');
  });
});
