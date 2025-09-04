import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, ChevronDown, User, ContactRound } from 'lucide-react';
import { useIsMobile, useIsTablet } from '../../hooks/use-mobile';
import { usePWA } from '@/hooks/usePWA';

interface AddCustomerDropdownProps {
  onAddNormalCustomer: () => void;
  onImportFromContacts: () => void;
}

const AddCustomerDropdown: React.FC<AddCustomerDropdownProps> = ({
  onAddNormalCustomer,
  onImportFromContacts
}) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { isInstalled, isRunningInBrowser } = usePWA();
  const isDesktop = !isMobile && !isTablet;
  const allowImportOnThisDevice = isInstalled && isMobile; // Only show import when installed PWA on phone

  if (isDesktop) {
    return (
      <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex-shrink-0" onClick={onAddNormalCustomer}>
        <Plus className="w-4 h-4 mr-1" />
        Add Customer
      </Button>
    );
  }

  const isBrowser = isRunningInBrowser();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex-shrink-0">
          <Plus className="w-4 h-4 mr-1" />
          {isMobile ? 'Add' : 'Add Customer'}
          <ChevronDown className="w-4 h-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background border border-border rounded-xl shadow-lg z-50">
        <DropdownMenuItem 
          onClick={onAddNormalCustomer}
          className="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer rounded-lg"
        >
          <User className="w-4 h-4 text-primary" />
          <span>Add Normal Customer</span>
        </DropdownMenuItem>
        {!isBrowser && allowImportOnThisDevice && (
          <DropdownMenuItem 
            onClick={onImportFromContacts}
            className="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer rounded-lg"
          >
            <ContactRound className="w-4 h-4 text-primary" />
            <span>Import from Contacts</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AddCustomerDropdown;