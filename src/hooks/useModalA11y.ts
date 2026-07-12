import { useEffect, useRef } from 'react';

/**
 * Shared accessibility behavior for every modal/dialog in the app:
 * - Moves focus into the dialog when it opens, and restores it to whatever
 *   was focused before on close.
 * - Traps Tab/Shift+Tab focus cycling within the dialog while it's open.
 * - Closes the dialog on Escape.
 *
 * Returns a ref to attach to the dialog's outermost element
 * (the one carrying `role="dialog"`).
 *
 * @param isOpen - Whether the dialog is currently open.
 * @param onClose - Called when Escape is pressed while the dialog is open.
 */
export function useModalA11y<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<T | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusFirst = () => {
      const focusable = container?.querySelectorAll<HTMLElement>(focusableSelector);
      (focusable && focusable.length > 0 ? focusable[0] : container)?.focus();
    };
    // Defer so the dialog's contents (often just-mounted via AnimatePresence) exist in the DOM.
    const raf = requestAnimationFrame(focusFirst);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !container) return;

      const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKeyDown, true);
      previouslyFocused.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return containerRef;
}
