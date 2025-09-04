import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import EnhancedProductImage from './enhanced-product-image';
import ExternalProductImage from './external-product-image';
import SimpleProductImage from './simple-product-image';
import TemplateImage from './template-image';
import ProxyImage from './proxy-image';

// Base product interface
interface BaseProductData {
  id: string | number;
  name: string;
  image_url?: string | null;
  category?: string | null;
}

// Card variant types
type ProductCardVariant = 'sales' | 'inventory' | 'template';

interface ProductCardProps {
  product: BaseProductData;
  variant: ProductCardVariant;
  
  // Sales specific props
  onAddToCart?: (product: any) => void;
  price?: number;
  stock?: number;
  isInStock?: boolean;
  
  // Inventory specific props
  onEdit?: (product: any) => void;
  onDelete?: (product: any) => void;
  onRestock?: (product: any) => void;
  sellingPrice?: number;
  costPrice?: number;
  currentStock?: number;
  lowStockThreshold?: number;
  showIcons?: boolean;
  onCardTap?: () => void;
  
  // Template specific props
  isSelected?: boolean;
  onSelect?: (product: any) => void;
  
  // Common props
  className?: string;
}


// Main ProductCard component
const UnifiedProductCard: React.FC<ProductCardProps> = ({
  product,
  variant,
  onAddToCart,
  price,
  stock,
  isInStock = true,
  onEdit,
  onDelete,
  onRestock,
  sellingPrice,
  costPrice,
  currentStock,
  lowStockThreshold,
  isSelected,
  onSelect,
  showIcons = false,
  onCardTap,
  className
}) => {
  // Remove hover state since we're using tap-to-toggle for both sales and inventory
  const [showAddToCart, setShowAddToCart] = useState(false);

  // Calculate stock status for inventory
  const getStockStatus = () => {
    if (variant !== 'inventory') return null;
    if (currentStock === undefined || currentStock === null) return { label: 'N/A', variant: 'secondary' as const };
    if (currentStock === 0) return { label: 'Out of Stock', variant: 'destructive' as const };
    if (lowStockThreshold && currentStock <= lowStockThreshold && currentStock > 0) return { label: 'Low Stock', variant: 'outline' as const };
    return { label: 'In Stock', variant: 'secondary' as const };
  };

  const stockStatus = getStockStatus();
  const isOutOfStock = variant === 'sales' && stock === 0;
  const isLowStock = variant === 'inventory' && currentStock !== undefined && lowStockThreshold && currentStock <= lowStockThreshold && currentStock > 0;
  const isUncountable = currentStock === -1;

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    if (variant === 'template' && onSelect) {
      onSelect(product);
    } else if (variant === 'sales' && onCardTap) {
      // For sales, only trigger tap handler (don't add to cart directly)
      onCardTap();
    } else if (variant === 'inventory' && onCardTap) {
      onCardTap();
    }
  }, [variant, onSelect, onCardTap, product]);

  const handleActionClick = useCallback((e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    // Only allow action if icons are visible (for both sales and inventory)
    if ((variant === 'inventory' || variant === 'sales') && !showIcons) return;
    action();
  }, [variant, showIcons]);

  return (
    <Card
      className={cn(
        "group relative bg-card rounded-xl border transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl overflow-hidden",
        // Template selection styling
        variant === 'template' && isSelected 
          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500/30 shadow-lg" 
          : "border-border hover:border-purple-300 dark:hover:border-purple-600",
        // Out of stock styling
        isOutOfStock && "opacity-75 grayscale",
        // Low stock styling
        isLowStock && "ring-1 ring-orange-300 dark:ring-orange-600",
        className
      )}
      onClick={handleCardClick}
    >
      {/* Selection indicator for templates */}
      {variant === 'template' && isSelected && (
        <div className="absolute top-2 right-2 z-20 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Low stock indicator */}
      {isLowStock && (
        <div className="absolute top-2 left-2 z-20">
          <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900/20 border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-400 text-xs px-1.5 py-0.5">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Low
          </Badge>
        </div>
      )}

      {/* Product Image */}
      <div className="aspect-square overflow-hidden rounded-t-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
        {variant === 'template' ? (
          <TemplateImage
            src={product.image_url}
            alt={product.name}
            productName={product.name}
            className="w-full h-full"
            size="md"
          />
        ) : (
          <ProxyImage
            src={product.image_url || ''}
            alt={product.name}
            className="w-full h-full object-cover"
            fallbackContent={
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-pink-900/30">
                <div className="w-12 h-12 bg-white/90 dark:bg-gray-800/90 rounded-2xl flex items-center justify-center shadow-lg border border-white/50 dark:border-gray-700/50 backdrop-blur-sm">
                  <span className="font-bold text-blue-700 dark:text-blue-300 text-lg">
                    {product.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            }
          />
        )}
      </div>
      
      {/* Product Information */}
      <div className="p-3 flex flex-col gap-1.5">
        {/* Product Name */}
        <h4 className="font-semibold text-sm text-foreground line-clamp-2 leading-tight min-h-[2.5rem]" title={product.name}>
          {product.name}
        </h4>
        
        {/* Category */}
        {product.category && (
          <p className="text-xs text-muted-foreground capitalize truncate">
            {product.category}
          </p>
        )}

        {/* Variant-specific content */}
        <div className="mt-1 space-y-1">
          {/* Sales variant */}
          {variant === 'sales' && (
            <div className="space-y-1">
              {(price !== undefined && price > 0 && !(product as any).is_parent) && (
                <div className="text-sm font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(price)}
                </div>
              )}
              {stock !== undefined && (
                <div className="text-xs text-muted-foreground">
                  Stock: {stock === -1 ? 'Unlimited' : stock}
                </div>
              )}
              {isOutOfStock && (
                <Badge variant="destructive" className="text-xs">
                  Out of Stock
                </Badge>
              )}
            </div>
          )}

          {/* Inventory variant */}
          {variant === 'inventory' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                {sellingPrice !== undefined && (
                  <div className="text-sm font-bold text-green-600 dark:text-green-400">
                    {(product as any).is_parent ? 'Unspecified' : formatCurrency(sellingPrice)}
                  </div>
                )}
                {stockStatus && (
                  <Badge variant={stockStatus.variant} className="text-xs px-2 py-0.5">
                    {stockStatus.label}
                  </Badge>
                )}
              </div>
              
              {costPrice !== undefined && costPrice > 0 && !((product as any).is_parent) && (
                <div className="text-xs text-muted-foreground">
                  Cost: {formatCurrency(costPrice)}
                </div>
              )}
              
              {(product as any).is_parent && (
                <div className="text-xs text-muted-foreground">
                  Cost: Unspecified
                </div>
              )}
              
              {currentStock !== undefined && (
                <div className="text-xs text-muted-foreground">
                  Stock: {currentStock === -1 ? 'Unlimited' : currentStock}
                </div>
              )}
            </div>
          )}

          {/* Template variant */}
          {variant === 'template' && (
            <div className="text-xs text-muted-foreground">
              Click to {isSelected ? 'remove' : 'select'}
            </div>
          )}
        </div>
      </div>

      {/* Action Overlay */}
      <div className={cn(
        "absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center transition-all duration-300",
        // Show overlay for sales when showIcons is true, for templates when selected, and for inventory when showIcons is true
        (variant === 'sales' && showIcons) || 
        (variant === 'template' && isSelected) || 
        (variant === 'inventory' && showIcons) 
          ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}>
        {/* Sales Actions */}
        {variant === 'sales' && onAddToCart && !isOutOfStock && (
          <button
            onClick={(e) => handleActionClick(e, () => onAddToCart(product))}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-full font-medium shadow-lg transition-all duration-200 transform hover:scale-105"
            disabled={!showIcons}
            aria-label={`Add ${product.name} to cart`}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Add to Cart
          </button>
        )}

        {/* Inventory Actions */}
        {variant === 'inventory' && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={(e) => handleActionClick(e, () => onEdit(product))}
                  className="bg-white/90 hover:bg-white text-foreground p-2 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
                  title="Edit Product"
                  disabled={!showIcons}
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
              {onRestock && (
                <button
                  onClick={(e) => handleActionClick(e, () => { if (!isUncountable) onRestock(product); })}
                  className={cn(
                    "p-2 rounded-full shadow-lg transition-all duration-200 transform",
                    isUncountable
                      ? "bg-muted text-muted-foreground cursor-not-allowed opacity-70"
                      : "bg-primary text-primary-foreground hover:scale-105"
                  )}
                  title={isUncountable ? "Restock unavailable for uncountable products" : "Restock Product"}
                  disabled={!showIcons || isUncountable}
                  aria-disabled={isUncountable}
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => handleActionClick(e, () => onDelete(product))}
                  className="bg-destructive text-destructive-foreground p-2 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
                  title="Delete Product"
                  disabled={!showIcons}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Action labels */}
            <div className="flex items-center gap-2 text-white text-xs">
              {onEdit && <span className="text-center">Edit</span>}
              {onRestock && <span className="text-center">Restock</span>}
              {onDelete && <span className="text-center">Delete</span>}
            </div>
          </div>
        )}

        {/* Template Actions */}
        {variant === 'template' && (
          <div className={cn(
            "px-4 py-2 rounded-full font-medium shadow-lg transition-all duration-200 transform hover:scale-105",
            isSelected 
              ? "bg-white text-primary" 
              : "bg-primary text-primary-foreground"
          )}>
            {isSelected ? (
              <>
                <Check className="w-4 h-4 inline mr-2" />
                Selected
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 inline mr-2" />
                Select
              </>
            )}
          </div>
        )}
      </div>

    </Card>
  );
};

export default UnifiedProductCard;