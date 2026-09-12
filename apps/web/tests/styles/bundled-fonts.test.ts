import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 捆绑字体围栏 —— 商业字体不可再分发。
 *
 * `JiduMonoPro-Regular.otf`(CoType Foundry,Copyright (c) 2020,无分发许可)
 * 曾随仓库以 Apache-2.0 一起发布,已删除。本文件挡的是它经由上游合并或
 * 手误回来的三条路:文件本身、字体二进制里的厂商名、源码里的字族引用。
 * 文件名检查另有 `scripts/check-attribution-notices.ts`(经 `pnpm guard`)
 * 兜底;这里再查内容与源码,是一道独立的、可定位的红。
 */

const WEB_ROOT = join(import.meta.dirname, '../..');
const FONTS_DIR = join(WEB_ROOT, 'public/fonts');
const SRC_DIR = join(WEB_ROOT, 'src');

/** 只认这两份 SIL OFL 1.1 的 Albert Sans,其余一切字体文件都算回归。 */
const EXPECTED_FONTS = [
  'AlbertSans-VariableFont_wght.ttf',
  'AlbertSans-Italic-VariableFont_wght.ttf',
] as const;

/** latin1 逐字节转字符串后去 `\0`:同时盖住 ASCII 与 UTF-16BE 的 name 表嵌入。 */
function fontCarriesCotype(filePath: string): boolean {
  const flat = readFileSync(filePath).toString('latin1').replaceAll('\0', '');
  return flat.includes('CoType');
}

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

describe('bundled fonts: no proprietary face', () => {
  it('fonts 目录里只有两份 Albert Sans', () => {
    const actual = readdirSync(FONTS_DIR)
      .filter((name) => /\.(ttf|otf|woff2?)$/i.test(name))
      .sort();
    expect(actual).toEqual([...EXPECTED_FONTS].sort());
  });

  it('没有任何字体文件以 Jidu 命名', () => {
    for (const name of readdirSync(FONTS_DIR)) {
      expect(name, `${name} 疑似商业字体回来`).not.toMatch(/jidu/i);
    }
  });

  it('没有任何字体二进制携带 CoType Foundry 厂商串', () => {
    for (const name of readdirSync(FONTS_DIR)) {
      if (!/\.(ttf|otf|woff2?)$/i.test(name)) continue;
      expect(fontCarriesCotype(join(FONTS_DIR, name)), `${name} 的 name 表里有 CoType`).toBe(false);
    }
  });

  it('src 里没有任何 @font-face 或 font-family 点名 JiduMono', () => {
    const offenders = walkFiles(SRC_DIR)
      .filter((file) => /\.(css|ts|tsx)$/.test(file))
      .filter((file) => /jidu\s*mono|jidumono/i.test(readFileSync(file, 'utf8')));
    expect(offenders, `这些源码仍在引用已删除的商业字体:\n${offenders.join('\n')}`).toEqual([]);
  });
});
