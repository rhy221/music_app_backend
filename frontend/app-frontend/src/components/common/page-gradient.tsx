'use client';

import { ReactNode, useState, useEffect, createContext, useContext, useCallback } from 'react';

/* ── Context ── */

interface PageGradientContextValue {
  setSrc: (src: string | null) => void;
}

function noopSetSrc(_src: string | null) { return; }
const PageGradientContext = createContext<PageGradientContextValue>({ setSrc: noopSetSrc });

export function usePageGradient() {
  return useContext(PageGradientContext);
}

/* ── Dominant-color hook ── */

export function useDominantColor(src: string | null): string | null {
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
          r += data[i]; g += data[i + 1]; b += data[i + 2];
        }
        const px = data.length / 4;
        r = Math.round(r / px); g = Math.round(g / px); b = Math.round(b / px);

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

/* ── Component ── */

export function PageGradient({ children }: { children: ReactNode }) {
  const [src, setSrcState] = useState<string | null>(null);
  const rgb = useDominantColor(src);
  const setSrc = useCallback((s: string | null) => setSrcState(s), []);

  return (
    <PageGradientContext.Provider value={{ setSrc }}>
      <div className="relative h-full bg-secondary overflow-y-auto rounded-md">
        {/* Gradient overlay — absolute so it doesn't push content */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-120 overflow-hidden rounded-md">
          {rgb ? (
            <div
              className="absolute inset-0 "
              style={{
                background: `linear-gradient(to bottom, rgba(${rgb},0.65) 0%, rgba(${rgb},0.35) 70%, transparent 100%)`,
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
              <div className="absolute inset-0 bg-linear-to-b from-transparent to-secondary" />
            </>
          ) : (
            <div className="absolute inset-0 bg-linear-to-b from-transparent to-secondary" />
          )}
        </div>

        <div className="relative z-10 h-full">{children}</div>
      </div>
    </PageGradientContext.Provider>
  );
}
