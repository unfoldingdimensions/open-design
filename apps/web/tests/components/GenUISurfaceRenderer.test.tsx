// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GenUISurfaceRenderer } from '../../src/components/GenUISurfaceRenderer';

afterEach(() => {
  cleanup();
});

describe('GenUISurfaceRenderer accessibility', () => {
  it('names the dialog by its prompt text, not the internal surface id', () => {
    render(
      <GenUISurfaceRenderer
        pending={{
          surface: {
            id: 'confirm-deploy-9f3a',
            kind: 'confirmation',
            persist: 'run',
            prompt: 'Deploy to production now?',
          },
          runId: 'run-1',
        }}
        onAnswered={() => undefined}
      />,
    );

    expect(
      screen.getByRole('dialog', { name: 'Deploy to production now?' }),
    ).toBeTruthy();
  });

  it('announces submission failures as alerts', async () => {
    render(
      <GenUISurfaceRenderer
        pending={{
          surface: {
            id: 'confirm-deploy-9f3a',
            kind: 'confirmation',
            persist: 'run',
            prompt: 'Deploy to production now?',
          },
          runId: 'run-1',
        }}
        onAnswered={() => Promise.reject(new Error('Daemon unreachable'))}
      />,
    );

    fireEvent.click(screen.getByTestId('genui-confirm'));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/Daemon unreachable/);
  });
});
