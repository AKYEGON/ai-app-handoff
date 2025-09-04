
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSettings } from '../../hooks/useSettings';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useTheme } from 'next-themes';
import { Moon, Sun, WifiOff } from 'lucide-react';

const AppearanceSettings = () => {
  const { settings, saveSettings, loading } = useSettings();
  const { isOnline } = useNetworkStatus();
  const { theme: currentTheme, setTheme } = useTheme();
  const [formData, setFormData] = useState({
    theme: 'light' as 'light' | 'dark',
  });

  // Use the current theme from next-themes instead of stored settings
  useEffect(() => {
    console.log('AppearanceSettings - Current active theme:', currentTheme);
    console.log('AppearanceSettings - Database stored theme:', settings.theme);
    console.log('AppearanceSettings - Using current active theme to prevent unwanted switches');
    setFormData({
      theme: (currentTheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark',
    });
  }, [currentTheme, settings]);

  const handleThemeToggle = (isDark: boolean) => {
    const newTheme = isDark ? 'dark' : 'light';
    console.log('Settings theme toggle - current theme:', formData.theme, 'new theme:', newTheme, 'Online:', isOnline);
    
    // Update local state immediately for instant UI feedback
    setFormData({ ...formData, theme: newTheme });
    
    // Always update theme immediately (works offline) - same as topbar
    setTheme(newTheme);
    
    // Only attempt to save to database when online
    if (isOnline) {
      // Fire and forget - don't await to avoid blocking UI
      saveSettings({ theme: newTheme }).catch(error => {
        console.error('Failed to save theme setting:', error);
        // Theme is already applied locally, so no need to revert
      });
    } else {
      console.log('Offline: Theme change applied locally only');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-10 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Theme Toggle Section */}
      <div className="space-y-4">
        <Label className="block text-sm font-medium text-foreground">
          Theme Preference
        </Label>
        
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <Sun className="w-5 h-5 text-amber-500" />
            <span className={`text-sm font-medium transition-colors ${formData.theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`}>
              Light Mode
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <Switch
              checked={formData.theme === 'dark'}
              onCheckedChange={handleThemeToggle}
              className="data-[state=checked]:bg-primary focus:ring-ring"
            />
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium transition-colors ${formData.theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`}>
                Dark Mode
              </span>
              <Moon className="w-5 h-5 text-indigo-500" />
            </div>
          </div>
        </div>
        
        {/* Offline indicator */}
        {!isOnline && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border border-dashed border-border">
            <WifiOff className="w-4 h-4" />
            <span>Theme changes work offline. Settings will sync when reconnected.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppearanceSettings;
