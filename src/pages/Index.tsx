import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [hasCheckedCache, setHasCheckedCache] = useState(false);

  // Add console logs for debugging
  useEffect(() => {
    console.log('[Index] Component mounted');
    console.log('[Index] Auth state:', { 
      user: !!user, 
      loading, 
      isOnline, 
      hasCheckedCache,
      userEmail: user?.email || 'none'
    });
  }, []);

  useEffect(() => {
    console.log('[Index] Auth state change:', { 
      user: !!user, 
      loading, 
      isOnline, 
      hasCheckedCache 
    });
    
    if (!loading && !hasCheckedCache) {
      setHasCheckedCache(true);
      
      // Route based on authentication status
      if (user) {
        console.log('[Index] Authenticated user detected, redirecting to dashboard');
        navigate('/app/dashboard', { replace: true });
      } else {
        console.log('[Index] No authenticated user, redirecting to landing');
        // Use modern-landing instead of landing for better compatibility
        navigate('/modern-landing', { replace: true });
      }
    }
  }, [user, loading, navigate, isOnline, hasCheckedCache]);

  // Improved loading state with better visibility
  if (loading || !hasCheckedCache) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-2xl font-bold text-primary-foreground">D</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground">DukaFiti</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground text-sm font-medium">
            {loading ? 'Loading DUKAFITI...' : 'Redirecting...'}
          </p>
          <p className="text-xs text-muted-foreground">
            Debug: Loading={loading.toString()}, HasChecked={hasCheckedCache.toString()}
          </p>
        </div>
      </div>
    );
  }

  // Fallback state - should rarely be seen
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto">
          <span className="text-2xl font-bold text-primary-foreground">D</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground">DukaFiti</h2>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground text-sm">Redirecting to dashboard...</p>
        <button 
          onClick={() => navigate('/modern-landing', { replace: true })}
          className="text-primary hover:underline text-sm"
        >
          Click here if not redirected automatically
        </button>
      </div>
    </div>
  );
};

export default Index;