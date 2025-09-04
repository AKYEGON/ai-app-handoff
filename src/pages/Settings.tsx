
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ShopProfileSettings from '@/components/settings/ShopProfileSettings';
import AppearanceSettings from '@/components/settings/AppearanceSettings';

import { Store, Monitor } from 'lucide-react';

const Settings = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-8 space-y-8">
        {/* Page Header */}
        <div className="bg-card rounded-3xl shadow-sm p-6 border border-border">
          <h1 className="text-3xl font-bold text-card-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your shop settings and preferences</p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="store" className="w-full">
          {/* Segmented Control Tabs */}
          <TabsList className="inline-flex bg-muted rounded-full p-1 border border-border h-auto">
            <TabsTrigger 
              value="store" 
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Store className="w-4 h-4" />
              Shop Info
            </TabsTrigger>
            <TabsTrigger 
              value="display" 
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Monitor className="w-4 h-4" />
              Display Settings
            </TabsTrigger>
          </TabsList>

          {/* Shop Info Tab Content */}
          <TabsContent value="store" className="mt-6">
            <Card className="bg-card rounded-3xl border border-border shadow-sm hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-2xl font-semibold text-card-foreground mb-2">
                  Shop Information
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Update your shop details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <ShopProfileSettings />
              </CardContent>
            </Card>
          </TabsContent>


          {/* Display Settings Tab Content */}
          <TabsContent value="display" className="mt-6">
            <Card className="bg-card rounded-3xl border border-border shadow-sm hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-2xl font-semibold text-card-foreground mb-2">
                  Display Settings
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Customize the appearance and theme of your application
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <AppearanceSettings />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
