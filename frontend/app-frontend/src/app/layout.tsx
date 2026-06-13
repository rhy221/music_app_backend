import './global.css';
import { Montserrat } from 'next/font/google';
import { cn } from '@/lib/utils';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { NotificationWsProvider } from '@/providers/notification-ws-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', display: 'swap' });

export const metadata = {
  title: 'Muze — Music Streaming',
  description: 'Stream music, discover artists, share playlists',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', montserrat.variable)} suppressHydrationWarning>
      <body>
        <QueryProvider>
          <ThemeProvider>
            <AuthProvider>
              <NotificationWsProvider>
                <TooltipProvider delayDuration={300}>
                  {children}
                  <Toaster richColors closeButton />
                </TooltipProvider>
              </NotificationWsProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
