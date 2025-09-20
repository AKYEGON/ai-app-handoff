import React from 'react';

const ShopProfileSettings = () => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="shopName" className="block text-sm font-medium text-foreground mb-2">
            Shop Name
          </label>
          <input
            type="text"
            id="shopName"
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            placeholder="Enter shop name"
          />
        </div>
        <div>
          <label htmlFor="ownerName" className="block text-sm font-medium text-foreground mb-2">
            Owner Name
          </label>
          <input
            type="text"
            id="ownerName"
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            placeholder="Enter owner name"
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-foreground mb-2">
          Address
        </label>
        <textarea
          id="address"
          rows={3}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
          placeholder="Enter shop address"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            placeholder="Enter phone number"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            placeholder="Enter email address"
          />
        </div>
      </div>
      
      <div className="flex justify-end">
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default ShopProfileSettings;
