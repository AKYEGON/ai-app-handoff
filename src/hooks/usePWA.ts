
import { useState, useEffect } from 'react';

interface PWAState {
  isOnline: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  serviceWorkerReady: boolean;
}

export const usePWA = () => {
  const [pwaState, setPwaState] = useState<PWAState>({
    isOnline: navigator.onLine,
    isInstallable: false,
    isInstalled: false,
    serviceWorkerReady: false,
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    console.log('[PWA] Hook initialized');
    
    // Check if service worker is already registered by index.html
    if ('serviceWorker' in navigator) {
      // Wait for the service worker registered in index.html
      navigator.serviceWorker.ready
        .then((registration) => {
          console.log('[PWA] Using existing SW registration:', registration.scope);
          setPwaState(prev => ({ ...prev, serviceWorkerReady: true }));
          
          // Force a check for install prompt after SW is ready
          setTimeout(() => {
            checkInstallPrompt();
          }, 1000);
        })
        .catch((error) => {
          console.error('[PWA] SW not ready:', error);
        });
    }

    // Check if app is installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone;
    const isAndroidInstalled = document.referrer.includes('android-app://');
    const isInstalled = isStandalone || isIOSStandalone || isAndroidInstalled;
    
    console.log('[PWA] Installation check:', { isStandalone, isIOSStandalone, isAndroidInstalled, isInstalled });
    setPwaState(prev => ({ ...prev, isInstalled }));

    // Listen for install prompt - but don't rely on development mode
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      setPwaState(prev => ({ ...prev, isInstallable: true }));
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('[PWA] App was installed');
      setPwaState(prev => ({ ...prev, isInstalled: true, isInstallable: false }));
      setDeferredPrompt(null);
    };

    // Listen for online/offline status
    const handleOnline = () => {
      setPwaState(prev => ({ ...prev, isOnline: true }));
      // Trigger sync when coming back online
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SYNC_NOW' });
      }
    };
    
    const handleOffline = () => {
      setPwaState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check for install prompt availability
    checkInstallPrompt();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkInstallPrompt = () => {
    // Rely solely on 'beforeinstallprompt' to set installable state
  };

  const installApp = async () => {
    console.log('[PWA] Install button clicked');
    
    // If app is already installed, don't show install prompt
    if (pwaState.isInstalled) {
      console.log('[PWA] App is already installed');
      return;
    }
    
    // Try to trigger install prompt
    const success = await triggerInstallPrompt();
    
    if (!success) {
      console.log('[PWA] Native install prompt not available');
      showManualInstallGuide();
    }
  };

  const showManualInstallGuide = () => {
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isEdge = /Edg/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isChrome) {
      instructions = 'Look for the install icon (⬇️) in your address bar, or click the menu (⋮) → "Install DukaFiti"';
    } else if (isEdge) {
      instructions = 'Look for the install icon (⬇️) in your address bar, or click the menu (...) → "Apps" → "Install this site as an app"';
    } else if (isSafari) {
      instructions = 'Tap the Share button (⬆️) → "Add to Home Screen" → "Add"';
    } else {
      instructions = 'Look for an "Install" option in your browser menu or address bar';
    }
    
    // Create a more subtle notification
    const toast = document.createElement('div');
    toast.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: hsl(var(--card));
        color: hsl(var(--card-foreground));
        border: 1px solid hsl(var(--border));
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px hsl(var(--shadow));
        z-index: 9999;
        max-width: 90vw;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        animation: slideUp 0.3s ease-out;
      ">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>💡</span>
          <span>${instructions}</span>
        </div>
      </div>
      <style>
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(100%); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      </style>
    `;
    document.body.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = 'slideUp 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
      }
    }, 5000);
  };

  const triggerInstallPrompt = async () => {
    console.log('[PWA] Attempting to trigger install prompt...');
    
    // First priority: Use deferred prompt if available
    if (deferredPrompt) {
      try {
        console.log('[PWA] Using deferred prompt');
        const result = await deferredPrompt.prompt();
        console.log('[PWA] Prompt result:', result);
        
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] User choice:', outcome);
        
        if (outcome === 'accepted') {
          console.log('[PWA] User accepted the install prompt');
          setPwaState(prev => ({ ...prev, isInstallable: false, isInstalled: true }));
        }
        
        setDeferredPrompt(null);
        return true;
      } catch (error) {
        console.error('[PWA] Error with deferred prompt:', error);
      }
    }
    
    // Second priority: Try to manually trigger browser install
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isEdge = /Edg/.test(navigator.userAgent);
    
    if (isChrome || isEdge) {
      console.log('[PWA] Chromium browser detected, checking for manual trigger options');
      
      // For production apps, try to check if PWA criteria are met
      if ('serviceWorker' in navigator && 'caches' in window) {
        try {
          // Check if all PWA requirements are met
          const registration = await navigator.serviceWorker.ready;
          if (registration && registration.active) {
            console.log('[PWA] Service Worker active, PWA should be installable');
            
            // Try to create a synthetic install event
            const syntheticEvent = new Event('beforeinstallprompt');
            window.dispatchEvent(syntheticEvent);
            
            // Wait a moment and check if prompt was captured
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (deferredPrompt) {
              return triggerInstallPrompt(); // Recursive call with new prompt
            }
          }
        } catch (error) {
          console.error('[PWA] Error checking PWA requirements:', error);
        }
      }
    }
    
    // Fallback: Guide user to manual installation
    return false;
  };


  const isRunningInBrowser = () => {
    // Check if running in browser (not in installed app)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone;
    return !isStandalone && !isIOSStandalone;
  };

  const requestPersistentStorage = async () => {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const persistent = await navigator.storage.persist();
      console.log(`[PWA] Persistent storage: ${persistent ? 'granted' : 'denied'}`);
      return persistent;
    }
    return false;
  };

  return {
    ...pwaState,
    installApp,
    isRunningInBrowser,
    requestPersistentStorage,
  };
};
