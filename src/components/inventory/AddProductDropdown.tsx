import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export type ProductMode = 'normal' | 'bulk' | 'uncountable' | 'variation';

interface AddProductDropdownProps {
  onModeSelect: (mode: ProductMode) => void;
  className?: string;
}

const AddProductDropdown: React.FC<AddProductDropdownProps> = ({ onModeSelect, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const modes = [
    { id: 'normal' as ProductMode, label: 'Normal', description: 'Add single product' },
    { id: 'bulk' as ProductMode, label: 'Bulk', description: 'Add multiple products at once' },
    { id: 'uncountable' as ProductMode, label: 'Uncountable', description: 'Items sold by scoops, cups, etc.' },
    { id: 'variation' as ProductMode, label: 'Variation', description: 'Product with different sizes/units' },
  ];

  const handleModeSelect = (mode: ProductMode) => {
    setIsOpen(false);
    onModeSelect(mode);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          className={cn(
            "bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex-shrink-0",
            className
          )}
          size="sm"
        >
          <Plus className="w-4 h-4" />
          {isMobile ? 'Add' : 'Add Product'}
          <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-56 bg-background border border-border rounded-xl shadow-lg z-50"
      >
        {modes.map((mode) => (
          <DropdownMenuItem
            key={mode.id}
            onClick={() => handleModeSelect(mode.id)}
            className="flex flex-col items-start p-3 hover:bg-muted cursor-pointer rounded-lg"
          >
            <span className="font-medium text-foreground">{mode.label}</span>
            <span className="text-xs text-muted-foreground mt-1">{mode.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AddProductDropdown;