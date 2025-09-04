
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Product } from '../../types';
import { AlertTriangle } from 'lucide-react';

interface DeleteProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onDelete: (id: string) => Promise<void>;
}

const DeleteProductModal: React.FC<DeleteProductModalProps> = ({
  isOpen,
  onClose,
  product,
  onDelete
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!product) return;
    
    console.log('[DeleteProductModal] Deleting product:', product.id);
    setIsDeleting(true);
    
    try {
      await onDelete(product.id);
      onClose();
    } catch (error) {
      console.error('[DeleteProductModal] Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!product) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] border-0 p-0 bg-white dark:bg-gray-900 shadow-2xl rounded-xl overflow-hidden">
        
        {/* Modern Header */}
        <div className="border-b-4 border-red-600 bg-white dark:bg-gray-900 p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <DialogTitle className="font-mono text-xl font-black uppercase tracking-widest text-gray-900 dark:text-white">
            DELETE PRODUCT
          </DialogTitle>
          <p className="font-mono text-sm text-gray-600 dark:text-gray-400 mt-2 uppercase tracking-wider">
            This action cannot be undone
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
          {/* Product Details */}
          <div className="border-2 border-red-300 dark:border-red-600 rounded-xl p-4 bg-red-50/50 dark:bg-red-900/20 mb-6">
            <h3 className="font-mono font-bold uppercase tracking-wider text-red-900 dark:text-red-100 mb-2">
              Product to Delete
            </h3>
            <div className="space-y-1 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 uppercase tracking-wide">Name:</span>
                <span className="font-bold text-gray-900 dark:text-white">{product.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 uppercase tracking-wide">Category:</span>
                <span className="text-gray-900 dark:text-white">{product.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 uppercase tracking-wide">Stock:</span>
                <span className="text-gray-900 dark:text-white">
                  {product.currentStock === -1 ? 'Unspecified' : `${product.currentStock} units`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 uppercase tracking-wide">Price:</span>
                <span className="text-gray-900 dark:text-white">KES {product.sellingPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="border-2 border-yellow-300 dark:border-yellow-600 rounded-xl p-4 bg-yellow-50/50 dark:bg-yellow-900/20 mb-6">
            <p className="font-mono text-sm text-yellow-800 dark:text-yellow-200 text-center">
              <strong className="uppercase tracking-wide">Warning:</strong> This will permanently remove <strong>{product.name}</strong> from your inventory. All associated data will be lost.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button 
              type="button" 
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full h-12 text-base font-mono font-bold uppercase tracking-wide bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              {isDeleting ? 'DELETING...' : 'DELETE PRODUCT'}
            </Button>
            <Button 
              type="button" 
              onClick={onClose}
              disabled={isDeleting}
              className="w-full h-12 text-base font-mono font-bold uppercase tracking-wide bg-transparent border-2 border-gray-600 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              CANCEL
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteProductModal;
