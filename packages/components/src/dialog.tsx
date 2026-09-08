import {
  useRef,
  useEffect,
  type ComponentPropsWithoutRef,
  type FormEventHandler,
  type MouseEvent,
  type ReactNode,
} from 'react';

import { joinClassNames } from './class-names';
import styles from './dialog.module.css';

type DialogTag = 'div' | 'form';

type DialogLayout = 'default' | 'sectioned';

export interface DialogProps {
  children: ReactNode;
  onClose?: () => void;
  className?: string;
  backdropClassName?: string;
  includeChromeClassName?: boolean;
  id?: string;
  role?: 'dialog' | 'alertdialog';
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  layout?: DialogLayout;
  as?: DialogTag;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  [key: `data-${string}`]: string | number | undefined;
}

type DialogSectionProps = ComponentPropsWithoutRef<'div'>;

type DialogHeadingProps = ComponentPropsWithoutRef<'h2'>;

type DialogDescriptionProps = ComponentPropsWithoutRef<'p'>;

export function Dialog({
  children,
  onClose,
  className,
  backdropClassName,
  includeChromeClassName = true,
  id,
  role = 'dialog',
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  closeOnBackdrop = true,
  closeOnEscape = false,
  layout = 'default',
  as = 'div',
  onSubmit,
  ...dataAttributes
}: DialogProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const setPanelRef = (node: HTMLElement | null) => {
    panelRef.current = node;
  };

  useEffect(() => {
    const panel = panelRef.current;
    const backdrop = panel?.parentElement;
    if (!panel || !backdrop || typeof document === 'undefined') return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const addedInert = Array.from(document.body.children).filter(
      (element) => element !== backdrop && !element.hasAttribute('inert'),
    );
    for (const element of addedInert) element.setAttribute('inert', '');

    const focusable = () => Array.from(panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => (
      !element.hasAttribute('hidden')
      && element.getAttribute('aria-hidden') !== 'true'
    ));

    panel.tabIndex = -1;
    (focusable()[0] ?? panel).focus({ preventScroll: true });

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (elements.length === 0) {
        event.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }
      const first = elements[0]!;
      const last = elements[elements.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleTab);

    return () => {
      document.removeEventListener('keydown', handleTab);
      for (const element of addedInert) element.removeAttribute('inert');
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  useEffect(() => {
    if (!onClose || !closeOnEscape) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose?.();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeOnEscape, onClose]);

  const sharedProps = {
    id,
    className: joinClassNames(
      includeChromeClassName ? styles.dialog : undefined,
      includeChromeClassName && layout === 'sectioned' ? styles.dialogSectioned : undefined,
      includeChromeClassName ? 'modal' : undefined,
      className,
    ),
    onClick: (event: MouseEvent<HTMLElement>) => event.stopPropagation(),
    role,
    'aria-modal': 'true' as const,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    ...dataAttributes,
  };

  // Callback refs with per-element casts: the shared base above stays
  // ref-free so the same object spreads onto both <div> and <form>.
  const divRef = setPanelRef as unknown as (node: HTMLDivElement | null) => void;
  const formRef = setPanelRef as unknown as (node: HTMLFormElement | null) => void;

  return (
    <div
      className={joinClassNames(
        includeChromeClassName ? styles.backdrop : undefined,
        includeChromeClassName ? 'modal-backdrop' : undefined,
        backdropClassName,
      )}
      onClick={closeOnBackdrop ? onClose : undefined}
      role="presentation"
    >
      {as === 'form' ? (
        <form {...sharedProps} ref={formRef} onSubmit={onSubmit}>
          {children}
        </form>
      ) : (
        <div {...sharedProps} ref={divRef}>{children}</div>
      )}
    </div>
  );
}

export function DialogHeader({ className, ...props }: DialogSectionProps) {
  return <div className={joinClassNames(styles.header, className)} {...props} />;
}

export function DialogBody({ className, ...props }: DialogSectionProps) {
  return <div className={joinClassNames(styles.body, className)} {...props} />;
}

export function DialogFooter({ className, ...props }: DialogSectionProps) {
  return <div className={joinClassNames(styles.footer, className)} {...props} />;
}

export function DialogTitle({ className, ...props }: DialogHeadingProps) {
  return <h2 className={joinClassNames(styles.title, className)} {...props} />;
}

export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return <p className={joinClassNames(styles.description, className)} {...props} />;
}
