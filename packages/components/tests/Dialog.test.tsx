// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../src/dialog';

afterEach(() => {
  cleanup();
});

describe('Dialog', () => {
  it('wires labelled dialogs consistently', () => {
    render(
      <Dialog ariaLabelledBy="dialog-title">
        <h2 id="dialog-title">Rename design</h2>
      </Dialog>,
    );

    expect(screen.getByRole('dialog', { name: 'Rename design' })).toBeTruthy();
  });

  it('closes on backdrop click when enabled', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Dialog onClose={onClose}>
        <h2>Backdrop close</h2>
      </Dialog>,
    );

    fireEvent.click(container.querySelector('.modal-backdrop') as HTMLElement);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape when enabled', () => {
    const onClose = vi.fn();
    render(
      <Dialog onClose={onClose} closeOnEscape>
        <h2>Escape close</h2>
      </Dialog>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('moves focus into the dialog, traps Tab, and restores the opener', () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open dialog';
    document.body.appendChild(opener);
    opener.focus();

    const { unmount } = render(
      <Dialog ariaLabel="Rename design">
        <button type="button">Cancel</button>
        <button type="button">Save</button>
      </Dialog>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Rename design' });
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const save = screen.getByRole('button', { name: 'Save' });

    expect(document.activeElement).toBe(cancel);
    expect(dialog.getAttribute('aria-modal')).toBe('true');

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(save);

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(cancel);

    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('preserves prior inert state on background siblings', () => {
    const app = document.createElement('main');
    app.textContent = 'Background app';
    document.body.appendChild(app);
    app.setAttribute('inert', '');

    const { unmount } = render(
      <Dialog ariaLabel="Settings">
        <button type="button">Close</button>
      </Dialog>,
    );

    expect(app.hasAttribute('inert')).toBe(true);

    unmount();
    expect(app.hasAttribute('inert')).toBe(true);
    app.remove();
  });

  it('lets custom panels opt out of the shared modal chrome class', () => {
    const { container } = render(
      <Dialog className="plugin-details-modal" includeChromeClassName={false}>
        <h2>Plugin details</h2>
      </Dialog>,
    );

    const panel = container.querySelector('.plugin-details-modal');

    expect(panel).toBeTruthy();
    expect(panel?.className).toBe('plugin-details-modal');
    expect(panel?.classList.contains('modal')).toBe(false);
  });

  it('keeps caller variant sizing overrides ahead of shared dialog defaults', () => {
    const variantStyles = document.createElement('style');
    variantStyles.textContent = '.modal-rename { width: 420px; gap: 14px; }';
    document.head.insertBefore(variantStyles, document.head.firstChild);

    try {
      const { container } = render(
        <Dialog className="modal-rename">
          <h2>Rename design</h2>
        </Dialog>,
      );

      const panel = container.querySelector('.modal-rename') as HTMLElement;
      const panelStyles = getComputedStyle(panel);

      expect(panelStyles.width).toBe('420px');
      expect(panelStyles.gap).toBe('14px');
    } finally {
      variantStyles.remove();
    }
  });

  it('supports sectioned layouts with shared header/body/footer primitives', () => {
    const { container } = render(
      <Dialog layout="sectioned" ariaLabelledBy="dialog-title">
        <DialogHeader>
          <DialogTitle id="dialog-title">Sketch text</DialogTitle>
          <DialogDescription>Add a note to the canvas.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <label>
            <span>Text</span>
            <input type="text" />
          </label>
        </DialogBody>
        <DialogFooter>
          <button type="button">Cancel</button>
          <button type="button">Save</button>
        </DialogFooter>
      </Dialog>,
    );

    expect(screen.getByRole('dialog', { name: 'Sketch text' })).toBeTruthy();
    expect(container.querySelector('[class*="dialogSectioned"]')).toBeTruthy();
    expect(container.querySelector('[class*="header"]')).toBeTruthy();
    expect(container.querySelector('[class*="body"]')).toBeTruthy();
    expect(container.querySelector('[class*="footer"]')).toBeTruthy();
  });
});
