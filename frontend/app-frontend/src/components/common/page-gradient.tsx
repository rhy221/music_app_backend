'use client';

import { ReactNode, useState, useEffect } from 'react';

function useDominantColor(src: string | null): string | null {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    if (!src) { setColor(null); return; }

    let cancelled = false;
    const proxied = `/api/img-proxy?url=${encodeURIComponent(src)}`;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 10;
        canvas.height = 10;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 10, 10);

        const { data } = ctx.getImageData(0, 0, 10, 10);
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }
        const px = data.length / 4;
        r = Math.round(r / px);
        g = Math.round(g / px);
        b = Math.round(b / px);

        // boost saturation so muted thumbnails still produce vivid gradients
        const avg = (r + g + b) / 3;
        const k = 1.6;
        r = Math.min(255, Math.max(0, Math.round(avg + (r - avg) * k)));
        g = Math.min(255, Math.max(0, Math.round(avg + (g - avg) * k)));
        b = Math.min(255, Math.max(0, Math.round(avg + (b - avg) * k)));

        setColor(`${r},${g},${b}`);
      } catch {
        setColor(null);
      }
    };

    img.onerror = () => { if (!cancelled) setColor(null); };
    img.src = proxied;

    return () => { cancelled = true; img.onload = null; img.onerror = null; };
  }, [src]);

  return color;
}

interface PageGradientProps {
  src: string | null;
  children: ReactNode;
}

export function PageGradient({ src, children }: PageGradientProps) {
  const rgb = useDominantColor(src);

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
        {rgb ? (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, rgba(${rgb},0.65) 0%, rgba(${rgb},0.35) 50%, transparent 100%)`,
            }}
          />
        ) : src ? (
          <>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${src})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(90px) saturate(2.5)',
                transform: 'scale(1.4)',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
          </>
        ) : null}
      </div>
      <div className="relative z-10 space-y-8">{children}</div>
    </div>
  );
}
