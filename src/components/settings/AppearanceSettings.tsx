import React from 'react';

const AppearanceSettings = () => {
  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <div>
        <h3 className="text-lg font-medium text-foreground mb-3">Theme</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-border rounded-lg p-4 cursor-pointer hover:bg-accent">
            <div className="w-8 h-8 bg-primary rounded-full mb-2"></div>
            <span className="text-sm font-medium text-foreground">Light</span>
          </div>
          <div className="border border-border rounded-lg p-4 cursor-pointer hover:bg-accent">
            <div className="w-8 h-8 bg-gray-800 rounded-full mb-2"></div>
            <span className="text-sm font-medium text-foreground">Dark</span>
          </div>
        </div>
      </div>

      {/* Font Size */}
      <div>
        <h3 className="text-lg font-medium text-foreground mb-3">Font Size</h3>
        <select className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground">
          <option value="small">Small</option>
          <option value="medium" selected>Medium</option>
          <option value="large">Large</option>
        </select>
      </div>

      {/* Language */}
      <div>
        <h3 className="text-lg font-medium text-foreground mb-3">Language</h3>
        <select className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground">
          <option value="en" selected>English</option>
          <option value="sw">Swahili</option>
        </select>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          Save Preferences
        </button>
      </div>
    </div>
  );
};

export default AppearanceSettings;
