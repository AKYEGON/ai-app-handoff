
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/use-toast';

const UserMenu = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleSettingsClick = () => {
    navigate('/app/settings');
  };

  const handleLogoutClick = () => {
    console.log('UserMenu: Logout button clicked');
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    console.log('UserMenu: Logout confirmed, calling signOut');
    try {
      await signOut();
      console.log('UserMenu: SignOut completed successfully');
      setShowLogoutConfirm(false);
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error('UserMenu: SignOut failed:', error);
      toast({
        title: "Sign Out Failed",
        description: "There was an error signing out. Please try again.",
        variant: "destructive",
      });
      setShowLogoutConfirm(false);
    }
  };

  const shopName = user?.user_metadata?.shop_name || 'My Shop';

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 h-12 px-4 border-2 border-primary bg-transparent text-foreground hover:bg-primary/10 rounded-xl font-mono font-bold uppercase tracking-widest transition-all duration-200 focus:ring-2 focus:ring-primary/20"
          >
            <div className="w-6 h-6 border-2 border-primary rounded-full flex items-center justify-center bg-primary/10">
              <User size={14} className="text-primary" />
            </div>
            <span className="hidden sm:inline text-primary">{shopName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-72 sm:w-80 max-w-[90vw] border-2 border-primary rounded-xl bg-background shadow-2xl z-[9999]"
          sideOffset={8}
        >
          {/* User Profile Section */}
          <div className="border-2 border-primary/30 rounded-xl p-4 m-2 bg-primary/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 border-2 border-primary rounded-full flex items-center justify-center bg-card">
                <User size={16} className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm font-bold uppercase tracking-widest text-primary truncate">
                  {shopName}
                </p>
                <p className="font-mono text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
          
          {/* Menu Items */}
          <div className="px-2 pb-2 space-y-2">
            <DropdownMenuItem 
              onClick={handleSettingsClick}
              className="border-2 border-accent/50 rounded-xl p-3 bg-accent/10 hover:bg-accent/20 transition-all duration-200 cursor-pointer focus:bg-accent/20"
            >
              <div className="w-6 h-6 border-2 border-accent rounded-full flex items-center justify-center mr-3">
                <Settings size={14} className="text-accent-foreground" />
              </div>
              <span className="font-mono text-sm font-bold uppercase tracking-widest text-accent-foreground">
                Shop Settings
              </span>
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={handleLogoutClick} 
              className="border-2 border-destructive/50 rounded-xl p-3 bg-destructive/10 hover:bg-destructive/20 transition-all duration-200 cursor-pointer focus:bg-destructive/20"
            >
              <div className="w-6 h-6 border-2 border-destructive rounded-full flex items-center justify-center mr-3">
                <LogOut size={14} className="text-destructive" />
              </div>
              <span className="font-mono text-sm font-bold uppercase tracking-widest text-destructive">
                Sign Out
              </span>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="border-2 border-destructive/50 rounded-xl bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-mono font-bold uppercase tracking-widest">
              Confirm Sign Out
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-mono">
              Are you sure you want to sign out? You will be redirected to the landing page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel 
              onClick={handleCancelLogout}
              className="border-2 border-border bg-muted hover:bg-muted/80 text-foreground font-mono font-bold uppercase tracking-widest"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmLogout}
              className="border-2 border-destructive bg-destructive hover:bg-destructive/90 text-destructive-foreground font-mono font-bold uppercase tracking-widest"
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserMenu;
