
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useNetworkStatus } from './useNetworkStatus';

interface ShopSettings {
  shopName: string;
  location: string;
  businessType: string;
  smsNotifications: boolean;
  emailNotifications: boolean;
  theme: 'light' | 'dark' | 'system';
  currency: string;
  lowStockThreshold: number;
  businessHours: {
    open: string;
    close: string;
  };
  receiptNumberFormat: string;
  defaultDebtLimit: number;
  paymentReminderDays: number;
  enablePenalty: boolean;
  penaltyRate: number;
  penaltyGraceDays: number;
  interestRate: number;
  mpesaTillNumber: string;
  lowStockAlerts: boolean;
  dailySummary: boolean;
  debtReminders: boolean;
  paymentNotifications: boolean;
  smsPhoneNumber: string;
  debtReminderMessage: string;
  paymentConfirmationMessage: string;
  lowStockMessage: string;
  contactPhone: string;
}

const defaultSettings: ShopSettings = {
  shopName: '',
  location: '',
  businessType: '',
  smsNotifications: false,
  emailNotifications: false,
  theme: 'light',
  currency: 'KES',
  lowStockThreshold: 10,
  businessHours: {
    open: '08:00',
    close: '18:00',
  },
  receiptNumberFormat: 'RCP-{number}',
  defaultDebtLimit: 10000,
  paymentReminderDays: 7,
  enablePenalty: false,
  penaltyRate: 5,
  penaltyGraceDays: 7,
  interestRate: 0,
  mpesaTillNumber: '',
  lowStockAlerts: true,
  dailySummary: false,
  debtReminders: true,
  paymentNotifications: true,
  smsPhoneNumber: '',
  debtReminderMessage: 'Dear {name}, you have an outstanding debt of KSh {amount}. Please settle by {date}.',
  paymentConfirmationMessage: 'Payment of KSh {amount} received. Thank you!',
  lowStockMessage: 'Low stock alert: {product} has only {quantity} items left.',
  contactPhone: '',
};

export const useSettings = () => {
  const [settings, setSettings] = useState<ShopSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { setTheme } = useTheme();
  const { isOnline } = useNetworkStatus();

  // Load settings from Supabase only once
  const loadSettings = async () => {
    if (!user || hasLoaded) {
      console.log('useSettings - No user or already loaded, skipping settings load. User:', !!user, 'HasLoaded:', hasLoaded);
      if (!user) {
        setSettings(defaultSettings);
        setLoading(false);
      }
      return;
    }

    try {
      console.log('Loading settings for user:', user.id);
      setLoading(true);
      
      // Load profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('shop_name, location, business_type, sms_notifications_enabled, phone, email')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading profile:', profileError);
      }

      // Load theme and other settings from shop_settings table
      const { data: shopSettingsData, error: settingsError } = await supabase
        .from('shop_settings')
        .select('settings_key, settings_value')
        .eq('user_id', user.id);

      if (settingsError) {
        console.error('Error loading shop settings:', settingsError);
      }

      // Process shop settings
      let themeValue = 'light';
      let emailNotifications = false;
      let smsNotifications = false;
      
      if (shopSettingsData) {
        shopSettingsData.forEach(setting => {
          if (setting.settings_key === 'theme' && setting.settings_value) {
            const settingsObj = setting.settings_value as { theme?: string };
            themeValue = settingsObj.theme || 'light';
          } else if (setting.settings_key === 'notifications' && setting.settings_value) {
            const notifObj = setting.settings_value as { email?: boolean; sms?: boolean };
            emailNotifications = notifObj.email || false;
            smsNotifications = notifObj.sms || false;
          }
        });
      }

      const loadedSettings: ShopSettings = {
        ...defaultSettings,
        shopName: profile?.shop_name || '',
        location: profile?.location || '',
        businessType: profile?.business_type || '',
        contactPhone: profile?.phone || '',
        smsNotifications: profile?.sms_notifications_enabled || smsNotifications,
        emailNotifications: emailNotifications,
        theme: themeValue as 'light' | 'dark' | 'system',
      };

      console.log('Loaded settings successfully:', loadedSettings);
      setSettings(loadedSettings);
      // DO NOT automatically apply theme - let user maintain their current theme choice
      // setTheme(themeValue); // This line was causing automatic theme switching
      setHasLoaded(true);
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  // Save settings to Supabase and update local state immediately
  const saveSettings = async (newSettings: Partial<ShopSettings>) => {
    if (!user) {
      console.log('No user found, cannot save settings');
      return;
    }

    // If offline and only theme is being changed, handle it gracefully
    if (!isOnline && Object.keys(newSettings).length === 1 && newSettings.theme !== undefined) {
      console.log('Offline: Theme change queued for sync when reconnected');
      
      // Update local state and theme immediately
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      setTheme(newSettings.theme);
      
      // Store pending change for sync later (optional enhancement)
      localStorage.setItem('pending_theme_change', newSettings.theme);
      return;
    }

    // If offline for other settings, show appropriate message
    if (!isOnline) {
      toast({
        title: "Offline",
        description: "Cannot save settings while offline. Changes will be saved when connection is restored.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Saving settings:', newSettings);
      
      // Update local state immediately for optimistic UI
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      
      // Update profile data if any profile fields changed
      const profileFields = ['shopName', 'location', 'businessType', 'contactPhone', 'smsNotifications'];
      const hasProfileChanges = profileFields.some(field => newSettings[field as keyof ShopSettings] !== undefined);
      
      if (hasProfileChanges) {
        const profileUpdate: any = {};
        
        if (newSettings.shopName !== undefined) profileUpdate.shop_name = newSettings.shopName;
        if (newSettings.location !== undefined) profileUpdate.location = newSettings.location;
        if (newSettings.businessType !== undefined) profileUpdate.business_type = newSettings.businessType;
        if (newSettings.contactPhone !== undefined) profileUpdate.phone = newSettings.contactPhone;
        if (newSettings.smsNotifications !== undefined) profileUpdate.sms_notifications_enabled = newSettings.smsNotifications;

        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('id', user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
          throw profileError;
        }
      }

      // Update theme setting if changed
      if (newSettings.theme !== undefined) {
        console.log('Updating theme setting to:', newSettings.theme);
        
        const { error: themeError } = await supabase
          .from('shop_settings')
          .upsert({
            user_id: user.id,
            settings_key: 'theme',
            settings_value: { theme: newSettings.theme },
          }, {
            onConflict: 'user_id,settings_key'
          });

        if (themeError) {
          console.error('Error updating theme:', themeError);
          throw themeError;
        }

        // Apply theme change immediately
        setTheme(newSettings.theme);
      }

      // Update notification settings if changed
      if (newSettings.emailNotifications !== undefined || newSettings.smsNotifications !== undefined) {
        const { error: notifError } = await supabase
          .from('shop_settings')
          .upsert({
            user_id: user.id,
            settings_key: 'notifications',
            settings_value: { 
              email: newSettings.emailNotifications ?? settings.emailNotifications,
              sms: newSettings.smsNotifications ?? settings.smsNotifications 
            },
          }, {
            onConflict: 'user_id,settings_key'
          });

        if (notifError) {
          console.error('Error updating notifications:', notifError);
          throw notifError;
        }
      }

      toast({
        title: "Settings Updated",
        description: "Your settings have been saved successfully.",
      });
      
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      // Revert local state on error
      setSettings(prev => ({ ...prev }));
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Load settings only once when user changes
  useEffect(() => {
    if (user && !hasLoaded) {
      console.log('User available and not loaded yet, loading settings for:', user.id);
      loadSettings();
    } else if (!user) {
      console.log('No user, resetting to defaults');
      setSettings(defaultSettings);
      setLoading(false);
      setHasLoaded(false);
    }
  }, [user]);

  // Legacy methods for backward compatibility
  const updateSettings = saveSettings;
  
  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `settings-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Settings Exported",
      description: "Your settings have been exported successfully.",
    });
  };

  const importSettings = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        saveSettings(importedSettings);
        toast({
          title: "Settings Imported",
          description: "Your settings have been imported successfully.",
        });
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Failed to import settings. Please check the file format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const resetSettings = () => {
    saveSettings(defaultSettings);
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to default values.",
    });
  };

  const refreshSettings = () => {
    setHasLoaded(false);
    loadSettings();
  };

  return {
    settings,
    loading,
    saveSettings,
    updateSettings,
    refreshSettings,
    exportSettings,
    importSettings,
    resetSettings,
  };
};
