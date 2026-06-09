import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { PlayerBar } from '@/components/layout/player-bar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto pb-24 px-6 py-4">{children}</main>
      </SidebarInset>
      <PlayerBar />
    </SidebarProvider>
  );
}
