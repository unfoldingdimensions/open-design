import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const packageCssImports = new Map([
  ['@open-design/components/styles.css', join(process.cwd(), '../../packages/components/src/styles.css')],
]);

function expandCssFile(filePath: string, seen = new Set<string>()): string {
  const key = filePath;
  if (seen.has(key)) {
    return '';
  }
  seen.add(key);

  const css = readFileSync(filePath, 'utf8');
  return css.replace(/@import\s+(?:url\(([^)]+)\)|(['"])([^'"]+)\2);/g, (_match, urlImport, _quote, quotedImport) => {
    const specifier = (quotedImport ?? urlImport ?? '').trim().replace(/^['"]|['"]$/g, '');
    if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
      const packageCssPath = packageCssImports.get(specifier);
      return packageCssPath == null ? '' : expandCssFile(packageCssPath, seen);
    }
    return expandCssFile(join(dirname(filePath), specifier), seen);
  });
}

const CRLF = String.fromCharCode(13) + String.fromCharCode(10);

export function readExpandedIndexCss(): string {
  // Windows checkouts carry CRLF (core.autocrlf); the style specs join
  // multi-line selectors with LF. Normalize once here so every consumer
  // sees the same bytes on every OS — CSS semantics are unaffected.
  // (Spelled without a regex literal: a literal CR in this source would
  // not survive the Windows checkout round-trip.)
  return expandCssFile(join(process.cwd(), 'src/index.css')).split(CRLF).join('\n');
}
