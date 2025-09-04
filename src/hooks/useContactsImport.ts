import { useState, useCallback } from 'react';
import { useToast } from './use-toast';

export interface ContactData {
  id: string;
  name: string;
  phone: string;
  email?: string;
  selected: boolean;
}

export interface ImportedCustomerData {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalPurchases: number;
  outstandingDebt: number;
  creditLimit: number;
  riskRating: 'low' | 'medium' | 'high';
  lastPurchaseDate?: string | null;
}

export const useContactsImport = () => {
  const { toast } = useToast();

  // Direct contact selection using native Contact Picker API
  const selectContacts = useCallback(async (): Promise<ContactData[]> => {
    try {
      // Check if Contact Picker API is supported
      if (!('contacts' in navigator)) {
        console.log('Contact Picker API not supported, using mock data for demo');
        
        // Fallback mock data for demo purposes
        const mockContacts: ContactData[] = [
          {
            id: '1',
            name: 'John Doe',
            phone: '+254701234567',
            email: 'john.doe@example.com',
            selected: true,
          },
          {
            id: '2',
            name: 'Jane Smith',
            phone: '+254708765432',
            email: 'jane.smith@example.com',
            selected: true,
          },
          {
            id: '3',
            name: 'Mike Johnson',
            phone: '+254703456789',
            selected: true,
          },
        ];
        
        toast({
          title: "Demo Mode",
          description: "Using demo contacts (Contact Picker API not available)",
        });
        
        return mockContacts;
      }

      // Check supported properties
      const supportedProperties = await (navigator as any).contacts.getProperties();
      console.log('Supported contact properties:', supportedProperties);

      // Request contact properties we need
      const propsToRequest = ['name', 'tel'];
      if (supportedProperties.includes('email')) {
        propsToRequest.push('email');
      }

      // Select contacts with multiple selection enabled
      const contacts = await (navigator as any).contacts.select(propsToRequest, { multiple: true });
      
      // Transform contacts to our format
      const transformedContacts: ContactData[] = contacts.map((contact: any, index: number) => ({
        id: `native_${index}`,
        name: contact.name?.[0] || 'Unknown',
        phone: contact.tel?.[0] || '',
        email: contact.email?.[0] || undefined,
        selected: true,
      }));

      console.log('Selected contacts from native picker:', transformedContacts);
      
      return transformedContacts;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Contact selection was cancelled by user');
        toast({
          title: "Cancelled",
          description: "Contact selection was cancelled",
        });
        return [];
      }
      
      console.error('Error selecting contacts:', error);
      toast({
        title: "Error",
        description: "Failed to access contacts. Please try again.",
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  // Convert selected contacts directly to customer format
  const convertContactsToCustomers = useCallback((selectedContacts: ContactData[]): ImportedCustomerData[] => {
    return selectedContacts.map(contact => ({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || undefined,
      address: undefined,
      totalPurchases: 0,
      outstandingDebt: 0,
      creditLimit: 1000, // Default credit limit
      riskRating: 'low' as const,
      lastPurchaseDate: null,
    }));
  }, []);

  // Main function to select and import contacts directly
  const importContactsDirectly = useCallback(async (): Promise<ImportedCustomerData[]> => {
    const selectedContacts = await selectContacts();
    if (selectedContacts.length === 0) {
      return [];
    }
    
    return convertContactsToCustomers(selectedContacts);
  }, [selectContacts, convertContactsToCustomers]);

  return {
    selectContacts,
    convertContactsToCustomers,
    importContactsDirectly,
  };
};