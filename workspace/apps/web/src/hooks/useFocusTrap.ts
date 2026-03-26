import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean
) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !ref.current) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const focusableElements = Array.from(
      ref.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    );
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    firstEl?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl?.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl?.focus();
        }
      }
    };

    ref.current.addEventListener('keydown', handleKeyDown);
    return () => {
      ref.current?.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [ref, active]);
}
