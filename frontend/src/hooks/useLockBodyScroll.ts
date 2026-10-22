import { useEffect } from 'react';

let lockCount = 0;
let originalOverflow = '';

export function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount++;
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = originalOverflow || '';
  }
}

/**
 * React hook that locks document body scrolling when a modal or overlay is open,
 * and ensures scrolling only occurs within the active modal component.
 */
export function useLockBodyScroll(isLocked: boolean = true) {
  useEffect(() => {
    if (!isLocked) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isLocked]);
}
