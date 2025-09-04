import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from '@/components/ui/button';
import { X, Package2, Grid3X3, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BulkAddProvider, useBulkAdd } from './BulkAddProvider';
import SpreadsheetView from './SpreadsheetView';
import TemplatesView from './TemplatesView';
import { Product } from '../../../types';

interface BulkAddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (products: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
}

// Custom DialogContent without the built-in close button
const CustomDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
CustomDialogContent.displayName = "CustomDialogContent";

const BulkAddProductModalContent: React.FC<BulkAddProductModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const {
    activeView,
    stats,
    clearAll,
    getValidProducts,
    initializeSpreadsheet,
    setActiveView,
  } = useBulkAdd();

  const [showConfirmClose, setShowConfirmClose] = React.useState(false);

  // Initialize spreadsheet when modal opens
  useEffect(() => {
    if (isOpen) {
      initializeSpreadsheet();
    }
  }, [isOpen, initializeSpreadsheet]);

  const handleSave = () => {
    const products = getValidProducts();
    if (products.length > 0) {
      onSave(products);
      clearAll();
      onClose();
    }
  };

  const handleClose = () => {
    if (stats.totalCount > 0) {
      setShowConfirmClose(true);
      return;
    }
    clearAll();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { if (stats.totalCount > 0) { setShowConfirmClose(true); } else { clearAll(); onClose(); } } }}>
      <CustomDialogContent className="max-w-7xl w-[98vw] max-h-[95vh] p-0 flex flex-col bg-background">
        <DialogTitle className="sr-only">Bulk Add Products</DialogTitle>
        {/* Header */}
        <div className="flex items-center justify-between p-2 sm:p-4 border-b border-border bg-muted/30 flex-shrink-0 z-10">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Package2 className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-lg font-semibold truncate">Bulk Add Products</h2>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {stats.selectedCount > 0 && `${stats.selectedCount} selected • `}
                {stats.validCount > 0 && `${stats.validCount} ready • `}
                {stats.totalCount} total
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* View Toggle */}
            <div className="flex flex-col items-center">
              <div className="flex items-center bg-muted rounded-lg p-0.5 sm:p-1">
                <Button
                  variant={activeView === 'spreadsheet' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('spreadsheet')}
                  className="h-6 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
                  aria-pressed={activeView === 'spreadsheet'}
                  aria-current={activeView === 'spreadsheet' ? 'page' : undefined}
                >
                  <Grid3X3 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Spreadsheet</span>
                </Button>
                <Button
                  variant={activeView === 'templates' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('templates')}
                  className="h-6 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
                  aria-pressed={activeView === 'templates'}
                  aria-current={activeView === 'templates' ? 'page' : undefined}
                >
                  <Package2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Templates</span>
                </Button>
              </div>
              <span className="text-[9px] text-muted-foreground/70 mt-0.5 font-medium">
                {activeView === 'spreadsheet' ? 'Manual Entry' : 'From Library'}
              </span>
            </div>
            
            {/* Action Buttons */}
            <Button
              onClick={handleSave}
              disabled={!stats.hasValidProducts}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white h-8 sm:h-10 px-4 sm:px-6 text-sm sm:text-base font-semibold shadow-lg"
            >
              <span className="hidden sm:inline">Save Products ({stats.validCount})</span>
              <span className="sm:hidden">Save ({stats.validCount})</span>
            </Button>
            
            <Button
              onClick={() => { if (stats.totalCount > 0) { setShowConfirmClose(true); } else { clearAll(); onClose(); } }}
              variant="ghost"
              size="sm"
              className="p-1 sm:p-2 h-6 w-6 sm:h-8 sm:w-8"
            >
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          {activeView === 'spreadsheet' ? (
            <div className="h-[calc(95vh-140px)] overflow-auto">
              <SpreadsheetView />
            </div>
          ) : (
            <div className="h-[calc(95vh-140px)]">
              <TemplatesView />
            </div>
          )}
        </div>
      </CustomDialogContent>

      <AlertDialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved products?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved products in your bulk add list. Closing will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                clearAll();
                onClose();
                setShowConfirmClose(false);
              }}
            >
              Discard and close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

const BulkAddProductModal: React.FC<BulkAddProductModalProps> = (props) => {
  return (
    <BulkAddProvider>
      <BulkAddProductModalContent {...props} />
    </BulkAddProvider>
  );
};

export default BulkAddProductModal;