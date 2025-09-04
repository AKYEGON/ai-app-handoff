import { Download, Chrome } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/usePWA';
import { useEffect, useState } from 'react';

const PWADownloadButton = () => {
  const { installApp, isRunningInBrowser, isInstallable } = usePWA();
  const [isChrome, setIsChrome] = useState(false);

  useEffect(() => {
    // Check if browser is Chrome/Edge (Chromium-based)
    const isChromeBrowser = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isEdge = /Edg/.test(navigator.userAgent);
    setIsChrome(isChromeBrowser || isEdge);
  }, []);

  // Hide button if running in the installed app
  if (!isRunningInBrowser()) {
    return null;
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission if inside form
    e.stopPropagation(); // Stop event bubbling
    installApp();
  };

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <Button 
        onClick={handleDownload}
        type="button"
        variant="outline"
        disabled={!isInstallable && !isChrome}
        className="w-full bg-gradient-to-r from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 border-primary/20 text-foreground font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        Download App
      </Button>
      <div className="flex items-center justify-center gap-1 mt-2">
        {isChrome ? (
          <>
            <Chrome className="w-3 h-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Chrome supported</p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Chrome recommended for best experience</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground text-center mt-1">
        Install the app for a better experience and offline access
      </p>
    </div>
  );
};

export default PWADownloadButton;