import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { isOnline } = useNetworkStatus();
  const navigate = useNavigate();
  const [lastKnownUser, setLastKnownUser] = useState(null);

  // Listen for auth state changes to clear cached user on logout
  useEffect(() => {
    const handleAuthStateChange = (event: CustomEvent) => {
      if (event.detail.event === 'SIGNED_OUT') {
        setLastKnownUser(null);
        localStorage.removeItem('lastKnownUser');
      }
    };

    window.addEventListener('auth-state-change', handleAuthStateChange as EventListener);
    return () => {
      window.removeEventListener('auth-state-change', handleAuthStateChange as EventListener);
    };
  }, []);

  // Store user info when online for offline access
  useEffect(() => {
    if (user && isOnline) {
      localStorage.setItem('lastKnownUser', JSON.stringify({
        id: user.id,
        email: user.email,
        timestamp: Date.now()
      }));
      setLastKnownUser(user);
    }
  }, [user, isOnline]);

  // Handle navigation based on auth state
  useEffect(() => {
    // Only navigate if not loading and online with no user
    if (!loading && isOnline && !user && !lastKnownUser) {
      console.log('[ProtectedRoute] No user found and online, redirecting to signin');
      navigate('/signin');
    }
  }, [user, loading, navigate, isOnline, lastKnownUser]);

  // Load last known user when offline or when user is null
  useEffect(() => {
    if (!user && !loading) {
      try {
        const stored = localStorage.getItem('lastKnownUser');
        if (stored) {
          const userData = JSON.parse(stored);
          // Allow access if user was authenticated within last 24 hours and they're offline
          const twentyFourHoursMs = 24 * 60 * 60 * 1000;
          if (Date.now() - userData.timestamp < twentyFourHoursMs && !isOnline) {
            console.log('[ProtectedRoute] Using cached user for offline access');
            setLastKnownUser(userData);
            return;
          } else if (isOnline) {
            // If online, clear cache and require fresh login
            console.log('[ProtectedRoute] Online - clearing cache and requiring fresh login');
            localStorage.removeItem('lastKnownUser');
            setLastKnownUser(null);
          } else {
            console.log('[ProtectedRoute] Cached user expired, clearing cache');
            localStorage.removeItem('lastKnownUser');
            setLastKnownUser(null);
          }
        }
      } catch (error) {
        console.error('[ProtectedRoute] Error loading cached user:', error);
        localStorage.removeItem('lastKnownUser');
      }
    }
  }, [user, loading, navigate, isOnline]);

  // Show loading state when needed
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl font-bold text-white">D</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">DukaFiti</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm font-medium">
            {isOnline ? 'Loading...' : 'Loading offline data...'}
          </p>
        </div>
      </div>
    );
  }

  // Allow access if user exists (online) or last known user exists (offline only)
  if (user || (lastKnownUser && !isOnline)) {
    console.log('[ProtectedRoute] Allowing access - user:', !!user, 'lastKnownUser (offline only):', !!lastKnownUser && !isOnline);
    return <>{children}</>;
  }

  // If we reach here and online, show loading while navigation happens
  if (isOnline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  // Offline with no cached user - show offline message
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 max-w-md">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Authentication Required</h2>
        <p className="text-muted-foreground mb-4">
          Please connect to the internet to sign in to DukaFiti.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

export default ProtectedRoute;