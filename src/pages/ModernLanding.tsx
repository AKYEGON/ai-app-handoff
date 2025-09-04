
import { useState } from 'react';
import { ArrowRight, Check, ChevronDown, Eye, EyeOff, Clock, Store, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

const ModernLanding = () => {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [signUpData, setSignUpData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [signUpError, setSignUpError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    setSignUpError('');
    
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        if (error.message.includes('requested path is invalid') || error.message.includes('invalid_request')) {
          setSignUpError('Google authentication is not properly configured. Please contact support or use email signup.');
        } else {
          setSignUpError(error.message);
        }
      }
    } catch (err) {
      setSignUpError('Failed to connect with Google. Please try again or use email signup.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError('');
    
    if (!signUpData.name || !signUpData.email || !signUpData.password || !signUpData.confirmPassword) {
      setSignUpError('Please fill in all fields');
      return;
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      setSignUpError('Passwords do not match');
      return;
    }

    if (signUpData.password.length < 6) {
      setSignUpError('Password must be at least 6 characters');
      return;
    }

    setIsSigningUp(true);
    
    try {
      const { error } = await signUp(signUpData.email, signUpData.password);
      
      if (error) {
        setSignUpError(error.message);
      } else {
        // Store confirmation state and redirect to sign-in
        localStorage.setItem('signupConfirmation', JSON.stringify({
          email: signUpData.email,
          timestamp: Date.now()
        }));
        navigate('/signin');
      }
    } catch (err) {
      setSignUpError('An unexpected error occurred');
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignUpData({
      ...signUpData,
      [e.target.name]: e.target.value
    });
  };

  const features = [
    {
      title: "Simplified Inventory & Sales",
      description: "Track stock levels, process sales quickly, and manage your products with ease.",
      icon: "📦"
    },
    {
      title: "M-Pesa & Credit Support", 
      description: "Accept M-Pesa payments instantly and manage customer credit seamlessly.",
      icon: "💳"
    },
    {
      title: "Offline Mode & Real-time Sync",
      description: "Continue working without internet and sync automatically when connected.",
      icon: "🔄"
    }
  ];

  const steps = [
    {
      title: "How DukaFiti works?",
      description: "DukaFiti is a modern POS system designed specifically for Kenyan dukashops. It helps you manage inventory, process sales, track customers, and grow your business with powerful analytics and reporting tools."
    },
    {
      title: "Complete business management",
      description: "The most important part of DukaFiti is its comprehensive approach. You get inventory management, sales tracking, customer management, M-Pesa integration, and detailed reports all in one simple platform."
    },
    {
      title: "Variety of payment options",
      description: "Accept cash, M-Pesa, and customer credit. Track all transactions automatically and provide customers with multiple convenient payment methods."
    }
  ];


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <img 
                  src="/lovable-uploads/bce2a988-3cd7-48e7-9d0d-e1cfc119a5c4.png" 
                  alt="DukaFiti Logo" 
                  className="w-8 h-8"
                />
              </div>
              <span className="text-2xl font-bold text-primary font-caesar">DukaFiti</span>
            </div>
            
            <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
              <a 
                href="#hero" 
                onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap px-2 py-1"
              >
                Intro
              </a>
              <a 
                href="#how-it-works" 
                className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap px-2 py-1"
              >
                How it Works
              </a>
              <a 
                href="#features" 
                className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap px-2 py-1"
              >
                Features
              </a>
              <a 
                href="#signup"
                className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap px-2 py-1"
              >
                Sign Up
              </a>
            </nav>

            <div className="flex items-center space-x-4">
              <Button asChild variant="outline" className="hidden sm:flex">
                <Link to="/signin">Login</Link>
              </Button>
              <Button asChild className="bg-primary hover:bg-primary/90 hidden sm:flex">
                <Link to="/signup">Get Started</Link>
              </Button>
              
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-background">
            <div className="px-4 py-4 space-y-4">
              <a 
                href="#hero" 
                onClick={(e) => { 
                  e.preventDefault(); 
                  window.scrollTo({ top: 0, behavior: 'smooth' }); 
                  setIsMobileMenuOpen(false);
                }}
                className="block text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Intro
              </a>
              <a 
                href="#how-it-works"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                How it Works
              </a>
              <a 
                href="#features"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Features
              </a>
              <a 
                href="#signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Sign Up
              </a>
              <div className="pt-4 border-t border-border space-y-3">
                <Button asChild variant="outline" className="w-full">
                  <Link to="/signin" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
                </Button>
                <Button asChild className="w-full bg-primary hover:bg-primary/90">
                  <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="hero" className="py-20 lg:py-32 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                We've Got Your Duka Covered
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                DukaFiti ni POS rahisi kabisa kwa maduka ya Kenya. Hakuna maneno mengi—usimamia stoko, uziuze kwa haraka na upokee malipo ya M‑Pesa, na wafuate wateja wako kwa urahisi. DukaFiti ni mshirika wako wa kila siku kwa biashara yako!
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                  <a href="/signup">
                    Get Started
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="relative group">
              <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl border border-border/50 overflow-hidden transition-all duration-500 hover:shadow-3xl hover:scale-[1.02]">
                <div className="relative bg-background rounded-2xl overflow-hidden shadow-xl border border-border">
                  <img 
                    src="/lovable-uploads/12cd02b6-65aa-4b9e-a161-60a389e46fa9.png" 
                    alt="DukaFiti Dashboard Preview" 
                    className="w-full h-auto object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    style={{ aspectRatio: '16/10' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                
                {/* Floating elements for premium feel */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary/20 rounded-full blur-sm animate-pulse" />
                <div className="absolute -bottom-3 -left-3 w-8 h-8 bg-accent/20 rounded-full blur-sm animate-pulse delay-1000" />
                
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Easy Steps Section */}
      <section id="how-it-works" className="py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-foreground mb-16">Easy steps</h2>
          
          <div className="space-y-8">
            {steps.map((step, index) => (
              <Card key={index} className="p-6 border-l-4 border-l-primary bg-background">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-primary font-semibold">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <button
                      onClick={() => setExpandedStep(expandedStep === index ? null : index)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <h3 className="text-xl font-semibold text-foreground font-caesar">{step.title}</h3>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${
                        expandedStep === index ? 'rotate-180' : ''
                      }`} />
                    </button>
                    {expandedStep === index && (
                      <p className="mt-4 text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    )}
                    {index === 1 && expandedStep === index && (
                      <div className="mt-8">
                        <div className="relative group bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-4 sm:p-6 shadow-xl border border-border/50 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
                          <div className="relative bg-background rounded-xl overflow-hidden shadow-lg border border-border">
                            <img 
                              src="/lovable-uploads/5a4a9f99-fe44-4c73-be88-82a9cf80749d.png" 
                              alt="DukaFiti Sales Point Interface" 
                              className="w-full h-auto object-cover object-top transition-transform duration-700 group-hover:scale-105"
                              style={{ aspectRatio: '16/10' }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          </div>
                          
                          {/* Floating elements */}
                          <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary/30 rounded-full blur-sm animate-pulse" />
                          <div className="absolute -bottom-2 -left-2 w-5 h-5 bg-accent/30 rounded-full blur-sm animate-pulse delay-700" />
                          
                          {/* Glow effect */}
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                        </div>
                        
                        <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
                          <h4 className="font-semibold text-primary font-caesar text-lg mb-2">Smart POS Design</h4>
                          <p className="text-muted-foreground leading-relaxed">
                            DukaFiti contains powerful components which can easily be integrated into almost any shop workflow. Our intuitive sales interface makes processing transactions, managing inventory, and tracking customers effortless.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 font-caesar">Spend Less Time Managing</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground p-6">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 font-caesar">{feature.title}</h3>
                <p className="text-primary-foreground/80">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Sign Up Section */}
      <section id="signup" className="py-20 bg-gradient-to-br from-muted/20 to-accent/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl font-bold text-foreground mb-4 font-caesar">
                  Ready to Transform Your Business?
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Join thousands of Kenyan shop owners who trust DukaFiti to manage their business efficiently.
                </p>
              </div>

              <div className="bg-background rounded-2xl p-8 shadow-lg border border-border">
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-semibold text-foreground mb-2 font-caesar">Get Started Today</h3>
                  </div>

                  {/* Google Sign Up */}
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleGoogleSignUp}
                    disabled={isGoogleLoading}
                    className="w-full py-3 text-base font-semibold rounded-xl border-2 hover:bg-muted/50 transition-all hover:scale-[1.02]"
                  >
                    {isGoogleLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                        Connecting...
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
                      <span className="px-3 bg-background text-muted-foreground">Or</span>
                    </div>
                  </div>

                  {signUpError && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                      {signUpError}
                    </div>
                  )}
                  
                  <form onSubmit={handleSignUpSubmit} className="space-y-4">
                    <div>
                      <input 
                        type="text" 
                        name="name"
                        value={signUpData.name}
                        onChange={handleInputChange}
                        placeholder="Full Name"
                        className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all bg-background text-foreground"
                        required
                      />
                    </div>
                    
                    <div>
                      <input 
                        type="email" 
                        name="email"
                        value={signUpData.email}
                        onChange={handleInputChange}
                        placeholder="Email Address"
                        className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all bg-background text-foreground"
                        required
                      />
                    </div>
                    
                    <div className="relative">
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={signUpData.password}
                        onChange={handleInputChange}
                        placeholder="Password (min. 6 characters)"
                        className="w-full px-4 py-3 pr-12 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all bg-background text-foreground"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>

                    <div className="relative">
                      <input 
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={signUpData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Confirm Password"
                        className="w-full px-4 py-3 pr-12 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all bg-background text-foreground"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    
                    <Button 
                      type="submit" 
                      disabled={isSigningUp}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 text-base font-semibold rounded-xl transition-all hover:scale-[1.02] disabled:hover:scale-100"
                    >
                      {isSigningUp ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Creating Account...
                        </div>
                      ) : (
                        'Get Started'
                      )}
                    </Button>
                  </form>

                  <p className="text-center text-xs text-muted-foreground">
                    Already have an account?{' '}
                    <Link to="/signin" className="text-primary hover:underline underline-offset-4 font-medium">
                      Sign In
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-emerald-400 via-purple-500 to-pink-500 rounded-3xl aspect-square relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <div className="text-center text-white">
                    <div className="flex items-center justify-center mb-6">
                      <div className="relative">
                        <Store className="w-16 h-16" />
                        <div className="absolute -top-2 -right-2 bg-white text-black rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold">
                          24
                        </div>
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-4 font-caesar">Your Success Story Starts Here</h3>
                    <div className="space-y-2 text-lg opacity-90">
                      <p>✓ 10,000+ Successful Duka Owners</p>
                      <p>✓ 99.9% Reliable Service</p>
                      <p>✓ 24/7 Duka Support</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <img 
                  src="/lovable-uploads/bce2a988-3cd7-48e7-9d0d-e1cfc119a5c4.png" 
                  alt="DukaFiti Logo" 
                  className="w-6 h-6"
                />
              </div>
              <span className="text-xl font-bold font-caesar">DukaFiti</span>
            </div>
            <p className="text-muted">Smart POS for Kenyan Dukashops</p>
            <p className="text-sm text-muted mt-4">&copy; 2025 DukaFiti. Built for Kenyan entrepreneurs.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ModernLanding;
