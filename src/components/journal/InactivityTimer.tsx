'use client';

import { signOutInactiveAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/provider';
import { useCallback, useEffect, useRef, useState } from 'react';

const TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_BEFORE_MS = 60 * 1000;
const COUNTDOWN_SECONDS = WARNING_BEFORE_MS / 1000;

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'click',
] as const;

export function InactivityTimer() {
  const d = useI18n();
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [warningVisible, setWarningVisible] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  // Start timers without touching React state — safe to call from an effect body
  const startTimers = useCallback(() => {
    warningTimerRef.current = setTimeout(() => {
      setWarningVisible(true);
      setCountdown(COUNTDOWN_SECONDS);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }, TIMEOUT_MS - WARNING_BEFORE_MS);

    logoutTimerRef.current = setTimeout(() => {
      signOutInactiveAction();
    }, TIMEOUT_MS);
  }, []);

  // Called by activity events — resets state then restarts timers
  const resetTimer = useCallback(() => {
    clearAllTimers();
    setWarningVisible(false);
    setCountdown(COUNTDOWN_SECONDS);
    startTimers();
  }, [clearAllTimers, startTimers]);

  useEffect(() => {
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    startTimers(); // no setState on mount — state is already at defaults
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, resetTimer));
      clearAllTimers();
    };
  }, [resetTimer, clearAllTimers, startTimers]);

  if (!warningVisible) return null;

  const warning = d.nav.inactivity.body(countdown);

  return (
    <div className='fixed bottom-4 right-4 z-50 w-72 rounded-xl border border-border bg-card p-4 shadow-2xl animate-in slide-in-from-bottom-2 duration-300'>
      <div className='space-y-3'>
        <div className='space-y-1'>
          <p className='text-sm font-semibold'>{d.nav.inactivity.title}</p>
          {/* Tabular figures keep the sentence from shifting as the number
              ticks down; the language decides where in it the number falls. */}
          <p className='text-xs text-muted-foreground'>
            {warning.before}
            <span className='font-medium tabular-nums text-foreground'>{warning.emphasis}</span>
            {warning.after}
          </p>
        </div>
        <div className='flex gap-2'>
          <Button onClick={resetTimer} size='sm' className='flex-1'>
            {d.nav.inactivity.stayLoggedIn}
          </Button>
          <Button onClick={() => signOutInactiveAction()} size='sm' variant='ghost'>
            {d.nav.signOut}
          </Button>
        </div>
      </div>
    </div>
  );
}

