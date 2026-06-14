'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { storageUrl } from '@/lib/constants';

interface CoverImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
}

export function CoverImage({ src, alt, className, sizes = '(max-width: 768px) 100vw, 200px' }: CoverImageProps) {
  const resolvedSrc = storageUrl(src);
  const [errored, setErrored] = useState(false);

  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      {resolvedSrc && !errored ? (
        <Image
          src={resolvedSrc}
          alt={alt}
          fill
          className="object-cover"
          sizes={sizes}
          onError={() => setErrored(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Music2 className="h-1/3 w-1/3 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
