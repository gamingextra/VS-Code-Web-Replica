'use client';

import { useState, useEffect } from 'react';

export function useWindowSize() {
  const [size, setSize] = useState({ width: typeof window !== 'undefined' ? window.innerWidth : 1280, height: typeof window !== 'undefined' ? window.innerHeight : 800 });

  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return size;
}

export function useBreakpoint() {
  const { width, height } = useWindowSize();
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;
  const isDesktop = width >= 1024;
  const isSmallMobile = width < 380;
  const isLandscape = width > height;
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  return { width, height, isMobile, isTablet, isDesktop, isSmallMobile, isLandscape, isTouchDevice };
}
