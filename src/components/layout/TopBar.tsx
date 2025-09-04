
import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { 
  Moon, 
  Sun, 
  RefreshCw
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useUnifiedSyncManager } from '../../hooks/useUnifiedSyncManager';
import UserMenu from '../UserMenu';

export function TopBar() {
  const { theme, setTheme } = useTheme();
  const { isOnline, pendingOperations, syncPendingOperations } = useUnifiedSyncManager();

  const handleSync = () => {
    if (isOnline) {
      syncPendingOperations();
    }
  };

  const handleThemeToggle = () => {
    console.log('TopBar theme toggle - current theme:', theme);
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    console.log('TopBar setting theme to:', newTheme);
    setTheme(newTheme);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        </div>

        <div className="flex items-center gap-3">
          {/* Sync Button */}
          {pendingOperations > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={!isOnline}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden md:inline">
                Sync
              </span>
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
}
