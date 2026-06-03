'use client';

import { cn } from '@/lib/utils';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

// Minimum horizontal travel (px) to count as a swipe, and how much it must
// dominate the vertical travel so ordinary scrolling never switches months.
const MIN_DISTANCE = 50;
const HORIZONTAL_RATIO = 1.5;

interface MonthSwipeProps {
  /** URL for the previous month — navigated to on a right swipe. */
  prevHref: Route;
  /** URL for the next month — navigated to on a left swipe. */
  nextHref: Route;
  className?: string;
  children: React.ReactNode;
}

/**
 * Wraps the calendar so a horizontal swipe (touch) switches months — left for
 * next, right for previous — mirroring the chevron links for touch devices.
 */
export function MonthSwipe({ prevHref, nextHref, className, children }: MonthSwipeProps) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number } | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const origin = start.current;
    start.current = null;
    if (!origin) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - origin.x;
    const dy = t.clientY - origin.y;
    if (Math.abs(dx) < MIN_DISTANCE) return;
    if (Math.abs(dx) < Math.abs(dy) * HORIZONTAL_RATIO) return;
    router.push(dx < 0 ? nextHref : prevHref);
  }

  return (
    <div className={cn(className)} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {children}
    </div>
  );
}

