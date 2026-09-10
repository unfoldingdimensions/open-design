import { expect, test } from 'vitest';

import { imageReferencesForAgent, resolveSafePromptImagePaths, selectPromptImagePaths } from '../src/server.js';

test('selectPromptImagePaths uses staged AMR paths in prompt text', () => {
  expect(
    selectPromptImagePaths(
      'amr',
      ['/tmp/od-uploads/original.png'],
      ['/project/.amr-attachments/staged.png'],
    ),
  ).toEqual(['/project/.amr-attachments/staged.png']);
});

test('selectPromptImagePaths keeps original paths for non-AMR agents', () => {
  expect(
    selectPromptImagePaths(
      'opencode',
      ['/tmp/od-uploads/original.png'],
      ['/project/.amr-attachments/staged.png'],
    ),
  ).toEqual(['/tmp/od-uploads/original.png']);
});

test('resolveSafePromptImagePaths rejects images larger than 1 MB', () => {
  const result = resolveSafePromptImagePaths(
    ['/tmp/od-uploads/too-large.png', '/tmp/od-uploads/ok.png'],
    {
      uploadDir: '/tmp/od-uploads',
      existsSync: () => true,
      statSync: (inputPath: string) => ({
        isFile: () => true,
        size: inputPath.endsWith('too-large.png') ? 1024 * 1024 + 1 : 1024,
      }),
    },
  );

  expect(result.safeImages).toEqual(['/tmp/od-uploads/ok.png']);
  expect(result.oversizedImages).toEqual([
    { path: '/tmp/od-uploads/too-large.png', sizeBytes: 1024 * 1024 + 1 },
  ]);
});

test('resolveSafePromptImagePaths keeps images at or below 1 MB', () => {
  const result = resolveSafePromptImagePaths(
    ['/tmp/od-uploads/exactly-1mb.png'],
    {
      uploadDir: '/tmp/od-uploads',
      existsSync: () => true,
      statSync: () => ({
        isFile: () => true,
        size: 1024 * 1024,
      }),
    },
  );

  expect(result.safeImages).toEqual(['/tmp/od-uploads/exactly-1mb.png']);
  expect(result.oversizedImages).toEqual([]);
});

test('resolveSafePromptImagePaths surfaces stat failures instead of dropping the image', () => {
  const result = resolveSafePromptImagePaths(['/tmp/od-uploads/unreadable.png'], {
    uploadDir: '/tmp/od-uploads',
    existsSync: () => true,
    statSync: () => {
      throw Object.assign(new Error('EACCES: permission denied'), {
        code: 'EACCES',
      });
    },
  });

  expect(result.safeImages).toEqual([]);
  expect(result.oversizedImages).toEqual([]);
  expect(result.failedImages).toEqual([
    { path: '/tmp/od-uploads/unreadable.png', error: 'EACCES: permission denied' },
  ]);
});

test('imageReferencesForAgent keeps @refs for image-capable runtimes', () => {
  expect(imageReferencesForAgent(true, 'zcode', ['/u/a.png', '/u/b.png'])).toBe('@/u/a.png @/u/b.png');
});

test('imageReferencesForAgent warns instead of referencing when the runtime drops images', () => {
  // command-code sends `imagePaths: []` at the transport gate; a bare `@path`
  // in the prompt would make the agent answer as if it saw the pictures.
  const note = imageReferencesForAgent(false, 'command-code', ['/u/hero.png']);
  expect(note).not.toContain('@/u/hero.png');
  expect(note).toContain('/u/hero.png');
  expect(note).toContain('command-code');
  expect(note).toContain('NOT delivered');
  expect(note).toContain('Do not answer as if you saw them.');
});

test('imageReferencesForAgent pluralizes and treats unknown flags as dropping', () => {
  const note = imageReferencesForAgent(undefined, 'x', ['/u/a.png', '/u/b.png']);
  expect(note).toContain('2 images');
  expect(imageReferencesForAgent(true, 'zcode', [])).toBe('');
  expect(imageReferencesForAgent(false, 'command-code', [])).toBe('');
});
