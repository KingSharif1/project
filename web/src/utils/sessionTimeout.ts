import { useEffect, useRef, useCallback } from 'react';

const TIMEOUT_DURATION = 15 * 60 * 1000;
const WARNING_DURATION = 2 * 60 * 1000;

export function useSessionTimeout(onTimeout: () => void, onWarning?: () => void) {
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  const warningId = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
      timeoutId.current = null;
    }
    if (warningId.current) {
      clearTimeout(warningId.current);
      warningId.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearTimers();

    if (onWarning) {
      warningId.current = setTimeout(() => {
        onWarning();
      }, TIMEOUT_DURATION - WARNING_DURATION);
    }

    timeoutId.current = setTimeout(() => {
      onTimeout();
    }, TIMEOUT_DURATION);
  }, [onTimeout, onWarning, clearTimers]);

  useEffect(() => {
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    resetTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearTimers();
    };
  }, [resetTimer, clearTimers]);

  return { resetTimer, clearTimers };
}

export function getRemainingTime(lastActivity: Date): number {
  const now = new Date().getTime();
  const lastActivityTime = lastActivity.getTime();
  const elapsed = now - lastActivityTime;
  const remaining = TIMEOUT_DURATION - elapsed;
  return Math.max(0, remaining);
}

export function formatRemainingTime(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
