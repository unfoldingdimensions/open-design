// @vitest-environment jsdom
// Visual-direction preview loading contract.
//
// CapyDesign is local-only: the style catalog ships no hosted preview assets,
// so cards render the drawn per-variant preview and no <img> is fetched at
// all. These tests lock that absence — if a hosted preview origin ever
// returns, the lazy-loading guarantees below must return with it.

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { QuestionForm } from '../../src/artifacts/question-form';
import { QuestionFormView } from '../../src/components/QuestionForm';
import { VISUAL_STYLE_BATCH_SIZE } from '../../src/runtime/visual-style-deck';

afterEach(cleanup);

const form = {
  id: 'visual-direction-loading',
  title: 'Choose a direction',
  questions: [
    {
      id: 'direction',
      label: 'Visual direction',
      type: 'direction-cards',
      required: true,
      cards: [{ id: 'fallback', label: 'Fallback' }],
    },
  ],
} as QuestionForm;

describe('visual-direction preview loading', () => {
  it('renders the first batch eagerly with no hosted image fetches', () => {
    render(
      <QuestionFormView
        form={form}
        interactive
        visualStyleContext="deck"
        onSubmit={vi.fn()}
      />,
    );

    // The batch size contract still governs how many cards render.
    const cards = document.querySelectorAll('.qf-visual-stack .qf-visual-card');
    expect(cards).toHaveLength(VISUAL_STYLE_BATCH_SIZE);

    // No hosted preview assets exist: zero <img> elements, drawn previews only.
    const images = screen.queryAllByRole('img');
    expect(
      images.filter((image) => (image.getAttribute('src') ?? '').includes('open-design.ai')),
    ).toHaveLength(0);
  });

  it('keeps historical locked forms free of hosted image fetches too', () => {
    render(
      <QuestionFormView
        form={form}
        interactive={false}
        visualStyleContext="deck"
        onSubmit={vi.fn()}
      />,
    );

    const images = screen.queryAllByRole('img');
    expect(
      images.filter((image) => (image.getAttribute('src') ?? '').includes('open-design.ai')),
    ).toHaveLength(0);
  });
});
