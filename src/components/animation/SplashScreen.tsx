'use client';

import { useEffect, useState, ReactNode } from 'react';
import Lottie from 'lottie-react';

export default function SplashScreenWrapper({ children }: { children: ReactNode }) {
  const [fadeOut, setFadeOut] = useState(false);
  const [showSplash, setShowSplash] = useState(true); // Always true on mount
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    // Load animation JSON
    fetch('/animation/splash.json')
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((err) => console.error('Failed to load splash animation', err));

    // Start fade at 5s
    const fadeTimer = setTimeout(() => setFadeOut(true), 5000);
    // Hide after 6s
    const removeTimer = setTimeout(() => setShowSplash(false), 6000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (showSplash) {
    return (
      <div
        className={`fixed top-0 left-0 w-screen h-screen z-50 flex items-center justify-center bg-white dark:bg-black transition-opacity duration-1000 ${
          fadeOut ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {animationData && (
          <Lottie animationData={animationData} loop={false} style={{ width: 200, height: 200 }} />
        )}
      </div>
    );
  }

  return <>{children}</>;
}
