import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ImageUpload from '@/components/ui/image-upload';
import { Product } from '@/types';
import { useUnifiedProducts } from '@/hooks/useUnifiedProducts';
import { toast } from 'sonner';

interface ImageChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

const ImageChangeModal: React.FC<ImageChangeModalProps> = ({
  isOpen,
  onClose,
  product
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(product?.image_url || null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { updateProduct } = useUnifiedProducts();

  const handleSubmit = async () => {
    if (!product) return;

    try {
      setIsUpdating(true);
      
      await updateProduct(product.id, {
        image_url: imageUrl
      });

      toast.success('Product image updated successfully!');
      
      // Force multiple refresh events to ensure all components update
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('product-updated'));
        window.dispatchEvent(new CustomEvent('product-updated-locally'));
        window.dispatchEvent(new CustomEvent('data-refresh-product'));
        window.dispatchEvent(new CustomEvent('image-updated', { detail: { productId: product.id } }));
      }, 100);
      
      onClose();
    } catch (error) {
      console.error('Error updating product image:', error);
      toast.error('Failed to update product image');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    setImageUrl(product?.image_url || null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Product Image</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-2">{product?.name}</h4>
            <p className="text-sm text-muted-foreground">
              Upload a new image or paste an image URL
            </p>
          </div>

          <ImageUpload
            value={imageUrl}
            onChange={setImageUrl}
            productId={product?.id}
            placeholder="Upload new product image"
          />

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isUpdating || imageUrl === product?.image_url}
            >
              {isUpdating ? 'Updating...' : 'Update Image'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageChangeModal;