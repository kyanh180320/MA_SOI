import { describe, expect, it } from 'vitest';

const NATIVE_DIALOG_PATTERN = /(?:\bwindow\.(?:alert|confirm|prompt)|(?<![.\w])(?:alert|confirm|prompt))\s*\(/;
const SOURCE_MODULES = import.meta.glob('../../**/*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

describe('native browser dialogs', () => {
  it('không dùng alert, confirm hoặc prompt native trong mã nguồn ứng dụng', () => {
    const offenders = Object.entries(SOURCE_MODULES)
      .filter(([path, source]) => !path.endsWith('.test.ts') && NATIVE_DIALOG_PATTERN.test(source))
      .map(([path]) => path.replace('../../', ''));

    expect(offenders).toEqual([]);
  });
});
