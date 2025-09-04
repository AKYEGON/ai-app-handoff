import { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowLeft, Mail, Lock, Smartphone, Shield, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';

const SignIn = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState<{email: string} | null>(null);

  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for signup confirmation message
    const confirmationData = localStorage.getItem('signupConfirmation');
    if (confirmationData) {
      try {
        const parsed = JSON.parse(confirmationData);
        // Check if the confirmation is recent (within 5 minutes)
        if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          setConfirmationMessage({ email: parsed.email });
        }
        // Clear the confirmation data after checking
        localStorage.removeItem('signupConfirmation');
      } catch (error) {
        // Invalid data, remove it
        localStorage.removeItem('signupConfirmation');
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const { error } = await signIn(formData.email, formData.password);
      
      if (error) {
        setError(error.message);
      } else {
        navigate('/app/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError('');
    
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        if (error.message.includes('requested path is invalid') || error.message.includes('invalid_request')) {
          setError('Google authentication is not properly configured. Please contact support or use email login.');
        } else {
          setError(error.message);
        }
      }
    } catch (err) {
      setError('Failed to connect with Google. Please try again or use email login.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-accent/10 flex overflow-x-hidden">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 relative">
        {/* Back Button */}
        <Link 
          to="/" 
          className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>

        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <Link to="/" className="inline-flex items-center justify-center space-x-3 mb-8 group">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <img 
                  src="/lovable-uploads/bce2a988-3cd7-48e7-9d0d-e1cfc119a5c4.png" 
                  alt="DukaFiti Logo" 
                  className="w-8 h-8"
                />
              </div>
              <span className="text-2xl font-bold text-primary font-caesar">DukaFiti</span>
            </Link>
            
            <h1 className="text-4xl font-bold text-primary mb-2 font-caesar">
              Welcome Back
            </h1>
            <p className="text-lg text-muted-foreground">
              Sign in to continue managing your dukashop
            </p>
          </div>

          {/* Email Confirmation Message */}
          {confirmationMessage && (
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-2xl p-6 shadow-lg">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-full -translate-y-12 translate-x-8 opacity-50" />
              <div className="relative flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                      Verification Email Sent
                    </h3>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  </div>
                  <p className="text-emerald-800 dark:text-emerald-200 leading-relaxed">
                    We've sent a secure confirmation link to{' '}
                    <span className="font-semibold text-emerald-900 dark:text-emerald-100">
                      {confirmationMessage.email}
                    </span>
                  </p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed">
                    Please check your email and click the confirmation link to activate your account before signing in.
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <div className="w-1 h-1 bg-emerald-400 rounded-full" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      Check your spam folder if you don't see it in your inbox
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-destructive/20 flex items-center justify-center">
                <span className="text-xs">!</span>
              </div>
              {error}
            </div>
          )}

          {/* Google Sign In */}
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full py-3 text-base font-semibold rounded-xl border-2 hover:bg-muted/50 transition-all hover:scale-[1.02]"
          >
            {isGoogleLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                Connecting with Google...
              </div>
            ) : (
              <>
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC04" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-muted-foreground font-medium">Or sign in with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-foreground mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-12 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-white py-3 text-base font-semibold rounded-xl transition-all hover:scale-[1.02] disabled:hover:scale-100"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing In...
                </div>
              ) : (
                'Sign In'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline underline-offset-4 font-semibold">
                Sign Up
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Right Panel - Illustration */}
      <div className="hidden lg:block lg:flex-1">
        <div className="h-full bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center p-12">
            <div className="text-center text-white max-w-md">
              <h2 className="text-4xl font-bold mb-6 font-caesar">Welcome Back!</h2>
              <p className="text-xl opacity-90 leading-relaxed mb-8">
                Continue managing your dukashop with powerful POS features
              </p>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="bg-white/10 rounded-lg p-3 text-left flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold">Smart Inventory</div>
                    <div className="opacity-80">Track stock levels automatically</div>
                  </div>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-left flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold">M-Pesa Integration</div>
                    <div className="opacity-80">Accept payments seamlessly</div>
                  </div>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-left flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold">Business Analytics</div>
                    <div className="opacity-80">Make data-driven decisions</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
