'use client';

import { useRef, useState } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { PageGradient } from '@/components/common/page-gradient';
import { LibraryPanel } from '@/components/layout/library-panel';
import { NowPlayingPanel } from '@/components/layout/now-playing-panel';
import { PlayerBar } from '@/components/layout/player-bar';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';

type PanelHandle = { collapse: () => void; expand: () => void };

const LEFT_COLLAPSED_SIZE = 4;
const RIGHT_COLLAPSED_SIZE = 3;

export function MainLayout({ children }: { children: React.ReactNode }) {
  const leftRef  = useRef<PanelHandle | null>(null);
  const rightRef = useRef<PanelHandle | null>(null);

  const [leftCollapsed,  setLeftCollapsed]  = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppHeader />
      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <ResizablePanelGroup orientation="horizontal">
          {/* ── Left: Library ── */}
          <ResizablePanel
            defaultSize="20%"
            minSize="15%"
            maxSize="30%"
            collapsible
            collapsedSize={`${LEFT_COLLAPSED_SIZE}%`}
            panelRef={leftRef as any}
            onResize={(size: { asPercentage: number }) =>
              setLeftCollapsed(size.asPercentage <= LEFT_COLLAPSED_SIZE)
            }
          >
            <div className="h-full px-2 pt-2">
              <LibraryPanel
                isCollapsed={leftCollapsed}
                onCollapse={() => leftRef.current?.collapse()}
                onExpand={() => leftRef.current?.expand()}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* ── Center: Main content ── */}
          <ResizablePanel defaultSize="55%" minSize="30%">
              <div className="h-full px-2 pt-2">
                <PageGradient>
                  {children}
                </PageGradient>
              </div>
            
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* ── Right: Now Playing ── */}
          <ResizablePanel
            defaultSize="25%"
            minSize="16%"
            maxSize="35%"
            collapsible
            collapsedSize={`${RIGHT_COLLAPSED_SIZE}%`}
            panelRef={rightRef as any}
            onResize={(size: { asPercentage: number }) =>
              setRightCollapsed(size.asPercentage <= RIGHT_COLLAPSED_SIZE)
            }
            
          >
            <div className="h-full px-2 pt-2">
              <NowPlayingPanel
                isCollapsed={rightCollapsed}
                onCollapse={() => rightRef.current?.collapse()}
                onExpand={() => rightRef.current?.expand()}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <PlayerBar />
    </div>
  );
}
