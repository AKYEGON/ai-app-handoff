
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { useToast } from '../../hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import ProxyImage from '@/components/ui/proxy-image';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../hooks/useAuth';

interface TopPicksSectionProps {
  products: Product[];
  onAddToCart: (product: Product, quantity?: number) => void;
}

interface TopProduct extends Product {
  sales_count: number;
}

interface QuantityOverlay {
  productId: string;
  quantity: number;
}

const TopPicksSection = ({ products, onAddToCart }: TopPicksSectionProps) => {
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantityOverlay, setQuantityOverlay] = useState<QuantityOverlay | null>(null);
  const [addingAnimation, setAddingAnimation] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch top selling products
  const fetchTopProducts = async () => {
    if (!user) return;

    try {
      // Get sales data to calculate top products
      const { data: salesData, error } = await supabase
        .from('sales')
        .select('product_id, product_name, quantity')
        .eq('user_id', user.id);

      if (error) throw error;

      // Calculate sales counts per product
      const productSales = salesData.reduce((acc, sale) => {
        acc[sale.product_id] = (acc[sale.product_id] || 0) + sale.quantity;
        return acc;
      }, {} as Record<string, number>);

      // Map products with sales counts and sort by sales
      const productsWithSales = products
        .map(product => ({
          ...product,
          sales_count: productSales[product.id] || 0
        }))
        .sort((a, b) => b.sales_count - a.sales_count);

      // Take top 6, fill with most recent if needed
      let topSix = productsWithSales.slice(0, 6);
      
      if (topSix.length < 6) {
        const remaining = products
          .filter(p => !topSix.find(tp => tp.id === p.id))
          .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
          .slice(0, 6 - topSix.length)
          .map(p => ({ ...p, sales_count: 0 }));
        
        topSix = [...topSix, ...remaining];
      }

      setTopProducts(topSix);
    } catch (error) {
      console.error('Error fetching top products:', error);
      toast({
        title: "Error",
        description: "Failed to load top picks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription to sales table
  useEffect(() => {
    if (!user) return;

    fetchTopProducts();

    const channel = supabase
      .channel('sales-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('Sales updated, refreshing top picks');
          fetchTopProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, products]);

  const handleQuickAdd = (product: Product) => {
    onAddToCart(product, 1);
    
    // Show +1 animation
    setAddingAnimation(product.id);
    setTimeout(() => setAddingAnimation(null), 400);
    
  };

  const handleLongPress = (product: Product) => {
    setQuantityOverlay({
      productId: product.id,
      quantity: 1
    });
  };

  const handleQuantityChange = (delta: number) => {
    if (!quantityOverlay) return;
    
    const newQuantity = Math.max(1, quantityOverlay.quantity + delta);
    setQuantityOverlay({
      ...quantityOverlay,
      quantity: newQuantity
    });
  };

  const handleQuantityAdd = () => {
    if (!quantityOverlay) return;
    
    const product = topProducts.find(p => p.id === quantityOverlay.productId);
    if (product) {
      onAddToCart(product, quantityOverlay.quantity);
    }
    
    setQuantityOverlay(null);
  };

  const getProductInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getStockBadgeColor = (stock: number, threshold: number) => {
    if (stock <= 0) return 'bg-red-500';
    if (stock <= threshold) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="p-4">
        <Card className="bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-inner">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Top Picks</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-4 overflow-x-auto pb-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex-shrink-0">
                  <Skeleton className="w-[88px] h-[88px] rounded-lg" />
                  <Skeleton className="w-16 h-4 mt-2 mx-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card className="bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-inner">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Top Picks</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-4 overflow-x-auto pb-2">
            {topProducts.map((product, index) => (
              <div
                key={product.id}
                className="flex-shrink-0 relative"
              >
                {/* Quantity Overlay */}
                {quantityOverlay?.productId === product.id && (
                  <div className="absolute inset-0 z-20 bg-black/50 rounded-lg flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuantityChange(-1)}
                          className="w-8 h-8 p-0"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">
                          {quantityOverlay.quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuantityChange(1)}
                          className="w-8 h-8 p-0"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setQuantityOverlay(null)}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleQuantityAdd}
                          className="text-xs"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Product Tile */}
                <div
                  className={`w-[88px] h-[88px] bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden relative ${
                    addingAnimation === product.id ? 'animate-scale-in' : ''
                  }`}
                  onClick={() => handleQuickAdd(product)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleLongPress(product);
                  }}
                  onTouchStart={() => {
                    const timer = setTimeout(() => handleLongPress(product), 500);
                    const cleanup = () => clearTimeout(timer);
                    document.addEventListener('touchend', cleanup, { once: true });
                    document.addEventListener('touchmove', cleanup, { once: true });
                  }}
                  role="button"
                  aria-label={`Add ${product.name} to cart`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleQuickAdd(product);
                    }
                  }}
                >
                  {/* Stock indicator */}
                  <div 
                    className={`absolute top-1 left-1 w-2 h-2 rounded-full ${getStockBadgeColor(product.currentStock, product.lowStockThreshold)}`}
                    title={`Stock: ${product.currentStock}`}
                  />

                  {/* Sales count badge */}
                  {product.sales_count > 0 && (
                    <div className="absolute top-1 right-1 bg-primary text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                      {product.sales_count}
                    </div>
                  )}

                  {/* +1 Animation */}
                  {addingAnimation === product.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-green-500 text-white text-sm font-bold rounded-full px-2 py-1 animate-bounce">
                        +1
                      </div>
                    </div>
                  )}

                  {/* Product content */}
                  <div className="p-1 flex flex-col items-center justify-center h-full">
                    {/* Product image or initial */}
                    {product.image_url ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden mb-1 bg-gray-100 dark:bg-gray-800">
                        <ProxyImage
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          fallbackContent={(
                            <div className="w-full h-full bg-primary/10 rounded-lg flex items-center justify-center">
                              <span className="text-lg font-semibold text-primary">
                                {getProductInitial(product.name)}
                              </span>
                            </div>
                          )}
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-1">
                        <span className="text-lg font-semibold text-primary">
                          {getProductInitial(product.name)}
                        </span>
                      </div>
                    )}
                    
                    {/* Product name */}
                    <span className="text-xs font-medium text-center truncate w-full leading-tight">
                      {product.name}
                    </span>
                  </div>
                </div>

                {/* Product info below tile */}
                <div className="mt-1 text-center">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    {formatCurrency(product.sellingPrice)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TopPicksSection;
