import Image from 'next/image';
import { Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoverImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
}

export function CoverImage({ src, alt, className, sizes = '(max-width: 768px) 100vw, 200px' }: CoverImageProps) {
  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover" sizes={sizes} />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Music2 className="h-1/3 w-1/3 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
