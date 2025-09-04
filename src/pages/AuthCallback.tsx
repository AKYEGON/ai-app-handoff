import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('AuthCallback: Starting auth callback handling');
        console.log('AuthCallback: Current URL:', window.location.href);
        console.log('AuthCallback: Hash:', window.location.hash);
        console.log('AuthCallback: Search:', window.location.search);
        
        // Check for error in URL params (both hash and search params)
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const authError = urlParams.get('error') || hashParams.get('error');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');

        if (authError) {
          console.error('Auth callback error:', authError, errorDescription);
          setStatus('error');
          setMessage(errorDescription || 'Authentication failed');
          setTimeout(() => navigate('/signin'), 3000);
          return;
        }

        // Wait a moment for Supabase to process the OAuth callback
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Handle auth callback from OAuth providers
        const { data, error } = await supabase.auth.getSession();
        
        console.log('AuthCallback: Session data:', data);
        console.log('AuthCallback: Session error:', error);

        if (error) {
          console.error('Session error:', error);
          setStatus('error');
          setMessage('Failed to establish session');
          setTimeout(() => navigate('/signin'), 3000);
          return;
        }

        if (data.session && data.session.user) {
          console.log('AuthCallback: Valid session found, redirecting to dashboard');
          setStatus('success');
          setMessage('Authentication successful! Redirecting to your dashboard...');
          
          // Clean up the URL by removing hash/search params
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Give the auth state time to update and redirect
          setTimeout(() => {
            window.location.href = '/app/dashboard';
          }, 1500);
        } else {
          console.log('AuthCallback: No valid session found');
          setStatus('error');
          setMessage('No valid authentication found. Please try signing in again.');
          setTimeout(() => navigate('/signin'), 3000);
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setMessage('An unexpected error occurred during authentication');
        setTimeout(() => navigate('/signin'), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-accent/10 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-background rounded-xl shadow-lg p-8 text-center">
        <div className="mb-6">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Completing sign in...
              </h1>
              <p className="text-muted-foreground">
                Please wait while we complete your authentication.
              </p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-500" />
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Sign In Successful!
              </h1>
              <p className="text-muted-foreground">
                {message}
              </p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Sign In Failed
              </h1>
              <p className="text-muted-foreground">
                {message}
              </p>
            </>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground">
          You will be redirected automatically...
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;