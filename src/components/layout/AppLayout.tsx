
import React, { useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { BottomNavigation } from './BottomNavigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Moon, Sun, RefreshCw } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useUnifiedSyncManager } from '../../hooks/useUnifiedSyncManager';
import { useLocation } from 'react-router-dom';
import UserMenu from '../UserMenu';
import CubeLogo from '../branding/CubeLogo';

interface AppLayoutProps {
  children: React.ReactNode;
}

// Mobile TopBar with full desktop features
const MobileTopBar: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { isOnline, pendingOperations, syncPendingOperations } = useUnifiedSyncManager();

  const handleSync = () => {
    if (isOnline) {
      syncPendingOperations();
    }
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <CubeLogo size="sm" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent" 
              style={{ fontFamily: 'Caesar Dressing, cursive' }}>
            DukaFiti
          </h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Sync Button */}
          {pendingOperations > 0 && isOnline && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleThemeToggle}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>

          {/* User Menu */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
};

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const location = useLocation();

  // Reset scroll position when route changes
  useEffect(() => {
    // Reset main content scroll for both mobile and desktop
    const mainElements = document.querySelectorAll('[data-main-content="true"]');
    mainElements.forEach(element => {
      if (element.scrollTo) {
        element.scrollTo(0, 0);
      }
    });
  }, [location.pathname]);

  if (isMobile) {
    // Mobile layout with bottom navigation
    return (
      <div className="min-h-screen w-full bg-background flex flex-col">
        <MobileTopBar />
        <main className="flex-1 overflow-auto pb-20" data-main-content="true">
          <div className="h-full">
            {children}
          </div>
        </main>
        <div className="fixed bottom-0 left-0 right-0 z-50" data-bottom-nav>
          <BottomNavigation />
        </div>
      </div>
    );
  }

  // Desktop layout with sidebar
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full bg-background flex">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 overflow-auto" data-main-content="true">
            <div className="h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
