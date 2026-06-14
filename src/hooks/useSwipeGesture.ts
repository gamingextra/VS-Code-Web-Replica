'use client';

import { useRef, useCallback, useEffect } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  /** Minimum distance in px to trigger a swipe (default: 50) */
  minDistance?: number;
  /** Minimum velocity in px/ms to distinguish swipe from scroll (default: 0.3) */
  minVelocity?: number;
  /** Edge zone width in px for left-edge swipe detection (default: 20) */
  leftEdgeZone?: number;
  /** Whether to enable left-edge swipe detection (default: true) */
  enableLeftEdge?: boolean;
}

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
  isEdgeSwipe: boolean;
}

export function useSwipeGesture(
  ref: React.RefObject<HTMLElement | null>,
  options: SwipeGestureOptions = {}
) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    minDistance = 50,
    minVelocity = 0.3,
    leftEdgeZone = 20,
    enableLeftEdge = true,
  } = options;

  const stateRef = useRef<SwipeState | null>(null);
  const callbacksRef = useRef({ onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown });

  // Update callbacks ref on each render to avoid stale closures
  useEffect(() => {
    callbacksRef.current = { onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown };
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      stateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        isEdgeSwipe: enableLeftEdge && touch.clientX <= leftEdgeZone,
      };
    },
    [enableLeftEdge, leftEdgeZone]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!stateRef.current) return;

      const touch = e.changedTouches[0];
      if (!touch) return;

      const { startX, startY, startTime, isEdgeSwipe } = stateRef.current;
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const elapsed = Date.now() - startTime;
      const velocity = elapsed > 0 ? Math.sqrt(deltaX * deltaX + deltaY * deltaY) / elapsed : 0;

      stateRef.current = null;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Must meet minimum distance or velocity threshold
      const isHorizontal = absX > absY;
      const distanceMet = isHorizontal ? absX >= minDistance : absY >= minDistance;
      const velocityMet = velocity >= minVelocity;

      if (!distanceMet && !velocityMet) return;

      if (isHorizontal) {
        if (deltaX > 0) {
          // Swipe right
          if (isEdgeSwipe) {
            callbacksRef.current.onSwipeRight?.();
          } else {
            callbacksRef.current.onSwipeRight?.();
          }
        } else {
          // Swipe left
          callbacksRef.current.onSwipeLeft?.();
        }
      } else {
        if (deltaY > 0) {
          // Swipe down
          callbacksRef.current.onSwipeDown?.();
        } else {
          // Swipe up
          callbacksRef.current.onSwipeUp?.();
        }
      }
    },
    [minDistance, minVelocity]
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, handleTouchStart, handleTouchEnd]);
}

/**
 * Global swipe gesture hook that attaches to the document body.
 * Useful for edge-swipe detection from anywhere on screen.
 */
export function useGlobalSwipeGesture(options: SwipeGestureOptions = {}) {
  const bodyRef = useRef<HTMLElement | null>(null);

  // Only set up on client
  useEffect(() => {
    bodyRef.current = document.body;
  }, []);

  useSwipeGesture(bodyRef, { ...options, enableLeftEdge: true });
}
