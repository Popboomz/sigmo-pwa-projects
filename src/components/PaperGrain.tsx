'use client';

import React from 'react';

interface PaperGrainProps {
  opacity?: number;
  className?: string;
  blendMode?: React.CSSProperties['mixBlendMode'];
  zIndex?: number;
}

/**
 * Paper Grain Texture Component
 * Adds a subtle paper grain texture overlay to create an organic, natural feel.
 * Works with both light and dark themes.
 */
export function PaperGrain({
  opacity = 0.03,
  className = '',
  blendMode = 'overlay',
  zIndex = 1,
}: PaperGrainProps) {
  return (
    <div
      className={`pointer-events-none fixed inset-0 h-full w-full ${className}`}
      style={{
        opacity,
        mixBlendMode: blendMode,
        zIndex,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }}
      aria-hidden="true"
    />
  );
}
