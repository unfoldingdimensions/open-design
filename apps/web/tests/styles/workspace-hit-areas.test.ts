import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The workspace new-tab button renders at 30px but the repo's touch target
// is 44px (craft/accessibility-baseline.md). The visual stays 30px; an
// invisible ::after halo extends the hit area to 44px without changing
// the tab strip's geometry.
const shellCss = readFileSync(new URL('../../src/styles/shell.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

function cssBlock(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(shellCss);
  if (!match) throw new Error(`Missing CSS block for ${selector}`);
  return match[1] ?? '';
}

describe('workspace new-tab touch target', () => {
  it('keeps the 30px visual footprint', () => {
    const button = cssBlock('.workspace-tabs-new-btn');
    expect(blockValue(button, 'width')).toBe('30px');
    expect(blockValue(button, 'height')).toBe('30px');
  });

  it('expands the hit area to 44px through an invisible halo', () => {
    const halo = cssBlock('.workspace-tabs-new-btn::after');
    expect(blockValue(halo, 'content')).toBe("''");
    expect(blockValue(halo, 'position')).toBe('absolute');
    // 30px + 2 × 7px = 44px shared touch target.
    expect(blockValue(halo, 'inset')).toBe('-7px');
  });
});

function blockValue(block: string, property: string): string {
  const match = new RegExp(`(?:^|;)\\s*${property}:\\s*([^;]+);`).exec(block);
  if (!match) throw new Error(`Missing CSS property ${property}`);
  return match[1]!.trim();
}
