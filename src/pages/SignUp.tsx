import { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';

const SignUp = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEmailConfirmationSent, setIsEmailConfirmationSent] = useState(false);

  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await signUp(formData.email, formData.password);
      
      if (error) {
        setError(error.message);
      } else {
        // Store confirmation state and redirect to sign-in
        localStorage.setItem('signupConfirmation', JSON.stringify({
          email: formData.email,
          timestamp: Date.now()
        }));
        navigate('/signin');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    setError('');
    
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        if (error.message.includes('requested path is invalid') || error.message.includes('invalid_request')) {
          setError('Google authentication is not properly configured. Please contact support or use email signup.');
        } else {
          setError(error.message);
        }
      }
    } catch (err) {
      setError('Failed to connect with Google. Please try again or use email signup.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-accent/10 flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pt-6 pb-8 md:pt-20 md:pb-12 lg:justify-center lg:pt-0 lg:pb-0 relative">
        {/* Back Button */}
        <Link 
          to="/" 
          className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group z-10"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>

        <div className="max-w-md w-full space-y-6 md:space-y-8 mt-16 sm:mt-20 lg:mt-0">
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
              Create Your Account
            </h1>
            <p className="text-lg text-muted-foreground">
              Join thousands of shop owners using DukaFiti
            </p>
          </div>

          {/* Email Confirmation Message */}
          {isEmailConfirmationSent && (
            <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-lg flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-success/20 flex items-center justify-center">
                <span className="text-xs">✓</span>
              </div>
              <div>
                <p className="font-medium">Check your email!</p>
                <p className="text-sm opacity-90">We've sent a confirmation link to {formData.email}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !isEmailConfirmationSent && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-destructive/20 flex items-center justify-center">
                <span className="text-xs">!</span>
              </div>
              {error}
            </div>
          )}

          {/* Google Sign Up */}
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleGoogleSignUp}
            disabled={isGoogleLoading || isEmailConfirmationSent}
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
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
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
              <span className="px-4 bg-background text-muted-foreground font-medium">Or sign up with email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  disabled={isEmailConfirmationSent}
                  className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  disabled={isEmailConfirmationSent}
                  className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-foreground mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    disabled={isEmailConfirmationSent}
                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50 pr-12 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Must be at least 6 characters</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-foreground mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    disabled={isEmailConfirmationSent}
                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50 pr-12 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isLoading || isEmailConfirmationSent}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 text-base font-semibold rounded-xl transition-all hover:scale-[1.02] disabled:hover:scale-100"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Account...
                </div>
              ) : isEmailConfirmationSent ? (
                'Check Your Email'
              ) : (
                'Create Account'
              )}
            </Button>

            <div className="text-center space-y-4">
              <p className="text-xs text-muted-foreground">
                By signing up you agree to our{' '}
                <Link to="#" className="text-primary hover:underlineoffset-4 hover:underline font-medium">Terms of Service</Link>
                {' '}and{' '}
                <Link to="#" className="text-primary hover:underline underline-offset-4 font-medium">Privacy Policy</Link>
              </p>

              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/signin" className="text-primary hover:underline underline-offset-4 font-semibold">
                  Sign In
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Right Panel - Illustration */}
      <div className="hidden lg:block lg:flex-1">
        <div className="h-full bg-gradient-to-br from-emerald-400 via-purple-500 to-pink-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center p-12">
            <div className="text-center text-white max-w-md">
              <h2 className="text-4xl font-bold mb-6 font-caesar">Join Thousands of Shop Owners</h2>
              <p className="text-xl opacity-90 leading-relaxed">
                Transform your dukashop with smart POS technology designed for Kenyan businesses
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="font-semibold">10,000+</div>
                  <div className="opacity-80">Active Shops</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="font-semibold">99.9%</div>
                  <div className="opacity-80">Uptime</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
