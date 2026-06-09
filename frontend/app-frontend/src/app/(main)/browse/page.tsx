import Link from 'next/link';
import { Music2, Disc3, Mic2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const categories = [
  { href: '/browse/tracks', label: 'Tracks', icon: Music2, description: 'Browse all available tracks' },
  { href: '/browse/albums', label: 'Albums', icon: Disc3, description: 'Explore albums from artists' },
  { href: '/browse/artists', label: 'Artists', icon: Mic2, description: 'Discover artists' },
];

export default function BrowsePage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Browse</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {categories.map(({ href, label, icon: Icon, description }) => (
          <Link key={href} href={href}>
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{label}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
