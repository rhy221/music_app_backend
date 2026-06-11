'use client';

import { Music2 } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
          <Music2 className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold">Muze</span>
      </Link>
      {children}
    </div>
  );
}
