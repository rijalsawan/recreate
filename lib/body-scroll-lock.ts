let activeLocks = 0;
let originalOverflow = '';
let originalPaddingRight = '';

function notifyLockState(): void {
  if (!canUseDom()) return;

  if (activeLocks > 0) {
    document.body.dataset.scrollLockCount = String(activeLocks);
  } else {
    delete document.body.dataset.scrollLockCount;
  }

  window.dispatchEvent(
    new CustomEvent('app:body-scroll-lock-change', {
      detail: {
        locked: activeLocks > 0,
        lockCount: activeLocks,
      },
    }),
  );
}

function canUseDom(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function lockBodyScroll(): void {
  if (!canUseDom()) return;

  activeLocks += 1;
  if (activeLocks > 1) {
    notifyLockState();
    return;
  }

  const { body, documentElement } = document;
  originalOverflow = body.style.overflow;
  originalPaddingRight = body.style.paddingRight;

  const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

  body.style.overflow = 'hidden';
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }

  notifyLockState();
}

export function unlockBodyScroll(): void {
  if (!canUseDom() || activeLocks === 0) return;

  activeLocks -= 1;
  if (activeLocks > 0) {
    notifyLockState();
    return;
  }

  const { body } = document;
  body.style.overflow = originalOverflow;
  body.style.paddingRight = originalPaddingRight;

  notifyLockState();
}

export function resetBodyScrollLock(): void {
  if (!canUseDom()) return;

  activeLocks = 0;
  const { body } = document;
  body.style.overflow = '';
  body.style.paddingRight = '';

  notifyLockState();
}
