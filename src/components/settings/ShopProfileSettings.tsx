
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettings } from '../../hooks/useSettings';
import { Save } from 'lucide-react';
import PWADownloadButton from './PWADownloadButton';

const ShopProfileSettings = () => {
  const { settings, saveSettings, loading } = useSettings();
  const [formData, setFormData] = useState({
    shopName: '',
    location: '',
    businessType: '',
    contactPhone: '',
  });

  // Initialize form data when settings are loaded
  useEffect(() => {
    if (!loading && settings) {
      console.log('Settings loaded, updating form data:', settings);
      setFormData({
        shopName: settings.shopName || '',
        location: settings.location || '',
        businessType: settings.businessType || '',
        contactPhone: settings.contactPhone || '',
      });
    }
  }, [loading, settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Saving shop profile settings:', formData);
    
    try {
      await saveSettings(formData);
      console.log('Shop profile settings saved successfully');
    } catch (error) {
      console.error('Error saving shop profile settings:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    console.log(`Updating ${field} to:`, value);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const businessTypes = [
    'Retail Store',
    'Grocery Store',
    'Restaurant',
    'Pharmacy',
    'Electronics Store',
    'Clothing Store',
    'Hardware Store',
    'Other'
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-10 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="shopName" className="block text-sm font-medium text-foreground">
            Shop Name
          </Label>
          <Input
            id="shopName"
            value={formData.shopName}
            onChange={(e) => handleInputChange('shopName', e.target.value)}
            placeholder="Enter your shop name"
            className="w-full bg-muted text-foreground rounded-xl p-4 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 placeholder:text-muted-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessType" className="block text-sm font-medium text-foreground">
            Business Type
          </Label>
          <Select
            value={formData.businessType}
            onValueChange={(value) => handleInputChange('businessType', value)}
          >
            <SelectTrigger className="w-full bg-muted text-foreground rounded-xl p-4 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200">
              <SelectValue placeholder="Select business type" className="text-muted-foreground" />
            </SelectTrigger>
            <SelectContent className="bg-popover text-popover-foreground rounded-xl shadow-lg border border-border">
              {businessTypes.map(type => (
                <SelectItem key={type} value={type} className="hover:bg-accent hover:text-accent-foreground rounded-lg">
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="contactPhone" className="block text-sm font-medium text-foreground">
            Contact Phone
          </Label>
          <Input
            id="contactPhone"
            value={formData.contactPhone}
            onChange={(e) => handleInputChange('contactPhone', e.target.value)}
            placeholder="+254 XXX XXX XXX"
            className="w-full bg-muted text-foreground rounded-xl p-4 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 placeholder:text-muted-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location" className="block text-sm font-medium text-foreground">
            Location
          </Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            placeholder="City, County"
            className="w-full bg-muted text-foreground rounded-xl p-4 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button 
          type="submit" 
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-6 rounded-xl transition-colors duration-200 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Profile
        </Button>
      </div>
      
      {/* PWA Download Button */}
      <PWADownloadButton />
    </form>
  );
};

export default ShopProfileSettings;
