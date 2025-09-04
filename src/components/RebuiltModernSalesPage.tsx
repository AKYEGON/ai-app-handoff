import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '../utils/currency';
import { CartItem } from '../types/cart';
import { Customer, Product } from '../types';
import { useUnifiedProducts } from '../hooks/useUnifiedProducts';
import { useUnifiedCustomers } from '../hooks/useUnifiedCustomers';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useUnifiedSyncManager } from '../hooks/useUnifiedSyncManager';
import { useUnifiedSales } from '../hooks/useUnifiedSales';
import { useIsMobile, useIsTablet } from '../hooks/use-mobile';
import { usePersistedCart } from '../hooks/usePersistedCart';
import { useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PRODUCT_CATEGORIES } from '../constants/categories';
import NewSalesCheckout from './sales/NewSalesCheckout';
import AddDebtModal from './sales/AddDebtModal';
import ResponsiveProductGrid from './ui/responsive-product-grid';
import VariantSelectionModal from './sales/VariantSelectionModal';
import TopPicksSection from './sales/TopPicksSection';

import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  UserPlus, 
  WifiOff, 
  Wifi,
  RefreshCw,
  Receipt,
  DollarSign,
  User,
  Banknote,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2
} from 'lucide-react';

// Define types for the mixed product array
type DebtCardType = {
  id: string;
  name: string;
  category: string;
  sellingPrice: number;
  currentStock: number;
  isDebtCard: true;
};

type ProductWithCheck = {
  isDebtCard?: boolean;
} & any;

type FilteredProductType = DebtCardType | ProductWithCheck;

// Fixed Mobile Search Component
const FixedMobileSearch = ({ 
  searchTerm, 
  onSearchChange,
  placeholder = "Search products..."
}: {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
}) => {
  const [localValue, setLocalValue] = useState(searchTerm);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Sync local value with external value
  useEffect(() => {
    setLocalValue(searchTerm);
  }, [searchTerm]);

  // Debounced search to prevent keyboard hiding
  const debouncedSearch = useCallback((value: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 100);
  }, [onSearchChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedSearch(newValue);
  }, [debouncedSearch]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setTimeout(() => setIsFocused(false), 150);
  }, []);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onSearchChange('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [onSearchChange]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

return (
  <div 
    className="fixed top-0 left-0 right-0 z-[9999] bg-background/95 backdrop-blur-md border-b border-border shadow-lg"
    style={{
      paddingTop: 'max(env(safe-area-inset-top), 8px)',
      transform: 'translate3d(0, 0, 0)',
      willChange: 'transform',
      position: 'fixed',
      width: '100%',
      height: 'auto'
    }}
  >
    <div className="p-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none z-10" />
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          placeholder={placeholder}
          value={localValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="w-full h-10 pl-10 pr-4 bg-background border-2 border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 ease-in-out text-[16px] shadow-sm"
          style={{
            fontSize: '16px', // Prevents zoom on iOS
            WebkitAppearance: 'none',
            WebkitTapHighlightColor: 'transparent',
            transform: 'translate3d(0, 0, 0)'
          }}
        />
        {localValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground w-4 h-4 flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  </div>
);
};

const RebuiltModernSalesPage = () => {
  // Use persistent cart hook instead of local state
  const {
    cart,
    addToCart: addToPersistedCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    total,
    refreshCartExpiry
  } = usePersistedCart();
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'debt'>('cash');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isAddDebtModalOpen, setIsAddDebtModalOpen] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [selectedParentProduct, setSelectedParentProduct] = useState<Product | null>(null);
  const [currentVariants, setCurrentVariants] = useState<Product[]>([]);

  const { user } = useAuth();
  
  // Mobile panel state
  const [activePanel, setActivePanel] = useState<'search' | 'cart'>('search');
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  // Get sidebar state for responsive grid
  let sidebarOpen = true;
  try {
    const sidebar = useSidebar();
    sidebarOpen = sidebar.open;
  } catch {
    // useSidebar not available in this context, default to open
  }

  // Scroll position preservation
  const productListRef = useRef<HTMLDivElement>(null);
  const savedScrollPosition = useRef<number>(0);

const { products, loading: productsLoading, refetch: refetchProducts } = useUnifiedProducts();
const { customers, loading: customersLoading, refetch: refetchCustomers, updateCustomer } = useUnifiedCustomers();
const { sales } = useUnifiedSales();
  const { isOnline, pendingOperations, syncPendingOperations } = useUnifiedSyncManager();
  const { toast } = useToast();

  const selectedCustomer = selectedCustomerId ? customers.find(c => c.id === selectedCustomerId) : null;

  // Use consistent categories with inventory page - only show product categories, 'all' handled in UI
  const categories = useMemo(() => {
    return PRODUCT_CATEGORIES;
  }, []);

  // Get variants for a parent product - need to query separately since variants are filtered out
  const getProductVariants = useCallback(async (parentProductId: string): Promise<Product[]> => {
    if (!user) return [];
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .eq('parent_id', parentProductId);
      
      if (error) {
        console.error('[SalesPage] Error fetching variants:', error);
        return [];
      }
      
      // Transform database products to app format
      const transformedVariants = (data || []).map(dbProduct => ({
        id: dbProduct.id,
        name: dbProduct.name,
        category: dbProduct.category,
        costPrice: dbProduct.cost_price,
        sellingPrice: dbProduct.selling_price,
        currentStock: dbProduct.current_stock,
        lowStockThreshold: dbProduct.low_stock_threshold,
        createdAt: dbProduct.created_at,
        updatedAt: dbProduct.updated_at,
        image_url: dbProduct.image_url || null,
        parent_id: dbProduct.parent_id,
        variant_name: dbProduct.variant_name,
        variant_multiplier: dbProduct.variant_multiplier,
        stock_derivation_quantity: dbProduct.stock_derivation_quantity,
        is_parent: dbProduct.is_parent,
      }));
      
      return transformedVariants;
    } catch (error) {
      console.error('[SalesPage] Error fetching variants:', error);
      return [];
    }
  }, [user]);

  // Calculate product sales frequency for sorting
  const productSalesFrequency = useMemo(() => {
    const frequency: Record<string, number> = {};
    sales.forEach(sale => {
      frequency[sale.productId] = (frequency[sale.productId] || 0) + sale.quantity;
    });
    return frequency;
  }, [sales]);

  const filteredProducts = useMemo((): FilteredProductType[] => {
    const filtered = products.filter(product => {
      // Only show parent products or non-variant products in sales
      const isVariantChild = product.parent_id !== null && product.parent_id !== undefined;
      if (isVariantChild) return false;
      
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort by sales frequency (popular first), then by name
    const sorted = filtered.sort((a, b) => {
      const freqA = productSalesFrequency[a.id] || 0;
      const freqB = productSalesFrequency[b.id] || 0;
      
      if (freqA !== freqB) {
        return freqB - freqA; // Higher frequency first
      }
      
      return a.name.localeCompare(b.name); // Alphabetical as secondary sort
    });

    // Add debt card as first item
    const debtCard: DebtCardType = {
      id: 'add-debt-card',
      name: 'Record Cash Lending',
      category: 'Special',
      sellingPrice: 0,
      currentStock: 1,
      isDebtCard: true
    };

    return [debtCard, ...sorted];
  }, [products, searchTerm, selectedCategory, productSalesFrequency]);

  // Preserve scroll position when switching panels
  const handlePanelSwitch = useCallback((panel: 'search' | 'cart') => {
    if (productListRef.current && activePanel === 'search') {
      savedScrollPosition.current = productListRef.current.scrollTop;
    }
    setActivePanel(panel);
    
    // Always scroll to top when switching panels
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }, [activePanel]);

  const addToCart = useCallback((productId: string, quantity: number = 1) => {
    const product = products.find(p => p.id === productId);
    if (!product) {
      console.error('[SalesPage] Product not found for addToCart:', productId);
      return;
    }

    console.log('[SalesPage] Adding product to cart:', {
      productId,
      name: product.name,
      variant_name: product.variant_name,
      parent_id: product.parent_id,
      is_parent: product.is_parent,
      quantity,
      currentStock: product.currentStock
    });

    // Check if product has variants
    if (product.is_parent) {
      console.log('[SalesPage] Parent product selected, fetching variants');
      // Fetch variants asynchronously
      getProductVariants(product.id).then(variants => {
        console.log('[SalesPage] Found variants:', variants.length);
        if (variants.length > 0) {
          setCurrentVariants(variants);
          setSelectedParentProduct(product);
          setIsVariantModalOpen(true);
        } else {
          // No variants found, proceed with normal add to cart
          if (product.currentStock !== -1 && product.currentStock < quantity) {
            toast({
              title: "Insufficient Stock",
              description: `Only ${product.currentStock} units available for ${product.name}`,
              variant: "destructive",
            });
            return;
          }
          addToPersistedCart({ ...product, quantity });
          refreshCartExpiry();
        }
      });
      return;
    }

    // Allow adding products with unspecified stock (-1)
    if (product.currentStock !== -1 && product.currentStock < quantity) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${product.currentStock} units available for ${product.name}`,
        variant: "destructive",
      });
      return;
    }

    addToPersistedCart({ ...product, quantity });
    
    // Refresh cart expiry on each addition
    refreshCartExpiry();
    
  }, [products, addToPersistedCart, refreshCartExpiry, toast, getProductVariants]);

  const handleQuantityChange = useCallback((productId: string, newQuantity: number) => {
    console.log('[SalesPage] Quantity change requested:', { productId, newQuantity });
    
    if (newQuantity <= 0) {
      console.log('[SalesPage] Removing item from cart:', productId);
      removeFromCart(productId);
      return;
    }

    // Get cart item details
    const cartItem = cart.find(item => item.id === productId);
    if (!cartItem) {
      console.error('[SalesPage] Cart item not found:', productId);
      return;
    }

    console.log('[SalesPage] Cart item details:', {
      id: cartItem.id,
      name: cartItem.name,
      variant_name: cartItem.variant_name,
      parent_id: cartItem.parent_id,
      currentStock: cartItem.currentStock,
      current_quantity: cartItem.quantity,
      new_quantity: newQuantity
    });

    // For variants, check parent stock availability
    if (cartItem.parent_id) {
      // Find parent product to check available stock
      const parentProduct = products.find(p => p.id === cartItem.parent_id);
      if (parentProduct) {
        const variantMultiplier = cartItem.variant_multiplier || 1;
        const stockDerivationQty = cartItem.stock_derivation_quantity || 1;
        const stockNeeded = newQuantity * variantMultiplier * stockDerivationQty;
        
        console.log('[SalesPage] Variant stock check:', {
          parentStock: parentProduct.currentStock,
          variantMultiplier,
          stockDerivationQty,
          stockNeeded,
          newQuantity
        });

        if (parentProduct.currentStock !== -1 && stockNeeded > parentProduct.currentStock) {
          const maxPossible = Math.floor(parentProduct.currentStock / (variantMultiplier * stockDerivationQty));
          toast({
            title: "Insufficient Parent Stock",
            description: `Only ${maxPossible} units of ${cartItem.variant_name} available (parent stock: ${parentProduct.currentStock})`,
            variant: "destructive",
          });
          return;
        }
      }
    } else {
      // For regular products, check direct stock
      if (cartItem.currentStock !== -1 && newQuantity > cartItem.currentStock) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${cartItem.currentStock} units available`,
          variant: "destructive",
        });
        return;
      }
    }

    console.log('[SalesPage] Updating quantity:', { productId, newQuantity });
    updateQuantity(productId, newQuantity);
  }, [products, cart, updateQuantity, removeFromCart, toast]);

  const handleCheckoutSuccess = useCallback(() => {
    clearCart();
    setSelectedCustomerId(null);
    setPaymentMethod('cash');
    
    // Refresh products to update stock
    refetchProducts();
    
    // Switch back to search panel if on mobile
    if (isMobile) {
      setActivePanel('search');
    }
  }, [clearCart, refetchProducts, isMobile]);

  const handleCustomersRefresh = useCallback(() => {
    refetchCustomers();
  }, [refetchCustomers]);

  const handleSearchTermChange = useCallback((value: string) => {
    setSearchTerm(value);
    // Scroll to top when filtering products on mobile
    if (isMobile && productListRef.current) {
      productListRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isMobile]);

  const handleVariantSelect = useCallback((variant: Product) => {
    // When a variant is selected, add it to cart with appropriate stock checking
    if (selectedParentProduct) {
      // Calculate available stock from parent using variant multiplier
      const parentStock = selectedParentProduct.currentStock;
      const stockDerivationQty = selectedParentProduct.stock_derivation_quantity || 1;
      const availableVariantStock = parentStock !== -1 
        ? Math.floor(parentStock / ((variant.variant_multiplier || 1) * stockDerivationQty))
        : -1;

      if (availableVariantStock !== -1 && availableVariantStock < 1) {
        toast({
          title: "Insufficient Stock",
          description: `Not enough parent stock for ${variant.variant_name}`,
          variant: "destructive",
        });
        return;
      }

      // Add variant to cart with appropriate stock reference
      const variantForCart = {
        ...variant,
        currentStock: availableVariantStock,
        // Include parent reference for stock calculations
        parent_id: selectedParentProduct.id,
        stock_derivation_quantity: selectedParentProduct.stock_derivation_quantity
      };

      console.log('[SalesPage] Adding variant to cart:', {
        variantId: variant.id,
        variantName: variant.variant_name,
        parentId: selectedParentProduct.id,
        parentName: selectedParentProduct.name,
        parentStock: selectedParentProduct.currentStock,
        variantMultiplier: variant.variant_multiplier,
        stockDerivationQty: selectedParentProduct.stock_derivation_quantity,
        cartItemData: variantForCart
      });

      addToPersistedCart({ ...variantForCart, quantity: 1 });
      refreshCartExpiry();
      
    }
  }, [selectedParentProduct, addToPersistedCart, refreshCartExpiry, toast]);

  // Get cart count
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (productsLoading || customersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  console.log('isMobile status:', isMobile, 'window.innerWidth:', window.innerWidth);
  
  if (isMobile) {
    return (
      <div className="flex flex-col bg-background" style={{ minHeight: '100vh', paddingBottom: '0px', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {/* Mobile Content - no header, minimal top padding */}
        <div className="flex-1 overflow-hidden relative">
          {activePanel === 'search' ? (
            <>
              {/* Filters - compact layout */}
              <div className="flex-shrink-0 px-2 py-1 bg-background border-b border-border">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full h-8">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Bar - Compact version */}
              <div className="sticky top-0 z-[10000] bg-background/95 backdrop-blur-sm border-b border-border p-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3" />
                  <Input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-8 text-sm bg-background border-border focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Products Grid with Side Toggle */}
              <div className="relative flex-1 overflow-hidden">
                {/* Side Toggle Button to Cart */}
                <Button
                  onClick={() => handlePanelSwitch('cart')}
                  className="fixed right-4 top-1/2 transform -translate-y-1/2 z-30 h-20 w-16 rounded-2xl shadow-2xl bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 border-2 border-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105 active:scale-95"
                  size="sm"
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="bg-white/20 rounded-full p-1.5">
                      <ChevronRight size={18} className="text-white" />
                    </div>
                    <span className="text-xs font-semibold text-white">Cart</span>
                    {cartItemCount > 0 && (
                      <Badge className="absolute -top-2 -left-2 min-w-[24px] h-6 rounded-full text-xs px-1.5 bg-red-500 hover:bg-red-500 text-white border-2 border-white shadow-lg animate-pulse">
                        {cartItemCount}
                      </Badge>
                    )}
                  </div>
                </Button>

                {/* Product List with no top padding */}
                <div className="flex-1 overflow-y-auto" style={{ paddingTop: '0px', paddingBottom: '120px' }}>
                  {filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                      <Search size={48} className="text-muted-foreground mb-4" />
                      <h3 className="font-medium mb-2">No products found</h3>
                      <p className="text-sm text-muted-foreground">
                        Try adjusting your search or category filter
                      </p>
                    </div>
                  ) : (
<div className="px-4 pt-4 space-y-4">
  {/* Top Picks - hide on mobile */}
  {!isMobile && (
    <TopPicksSection
      products={products}
      onAddToCart={(product, qty = 1) => addToCart(product.id, qty)}
    />
  )}

  {/* Special debt card */}
  <Card className="overflow-hidden bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 transition-all duration-200 hover:shadow-md">
    <CardContent className="p-2.5">
      <div className="flex flex-col h-full">
        <h3 className="font-medium text-xs mb-1 text-red-700 dark:text-red-400 truncate leading-tight">Record Cash Lending</h3>
        <p className="text-[10px] text-red-600 dark:text-red-500 mb-2 truncate">Add customer debt</p>
        
        <Button
          onClick={() => setIsAddDebtModalOpen(true)}
          size="sm"
          className="w-full bg-red-600 hover:bg-red-700 text-white h-6 text-xs mt-auto"
        >
          <Receipt size={14} className="mr-1" />
          Add
        </Button>
      </div>
    </CardContent>
  </Card>

  {/* Mobile Product Grid */}
  <ResponsiveProductGrid
    products={filteredProducts.filter(product => !('isDebtCard' in product))}
    variant="sales"
    onAddToCart={(product) => addToCart(product.id)}
    getPriceForProduct={(product) => product.sellingPrice}
    getStockForProduct={(product) => product.currentStock}
    getInStockStatus={(product) => product.currentStock > 0 || product.currentStock === -1}
    gridConfig={{
      cols: { mobile: 2, tablet: 2, desktop: 2 },
      gap: 'gap-3'
    }}
    emptyStateMessage="No products found"
    emptyStateDescription="Try adjusting your search or filters"
  />
</div>
                  )}
                </div>
              </div>
            </>
          ) : activePanel === 'cart' ? (
            <div className="flex flex-col bg-background h-full">
              <div className="flex-shrink-0 px-4 py-2 border-b border-border bg-background">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Cart</h2>
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    {cart.length} items
                  </Badge>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pt-0 pb-4" style={{ paddingBottom: '120px' }}>
                {/* Side Toggle Button to Products */}
                <Button
                  onClick={() => handlePanelSwitch('search')}
                  className="fixed left-4 top-1/2 transform -translate-y-1/2 z-30 h-20 w-16 rounded-2xl shadow-2xl bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 border-2 border-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105 active:scale-95"
                  size="sm"
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="bg-white/20 rounded-full p-1.5">
                      <ChevronLeft size={18} className="text-white" />
                    </div>
                    <span className="text-xs font-semibold text-white">Products</span>
                  </div>
                </Button>

                {/* Cart Items */}
                {cart.length > 0 ? (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <Card key={item.id}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{item.name}</h4>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(item.customPrice || item.sellingPrice)} each
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              >
                                <Minus size={14} />
                              </Button>
                              <span className="font-medium text-sm w-8 text-center">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              >
                                <Plus size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive"
                                onClick={() => removeFromCart(item.id)}
                              >
                                <X size={14} />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                            <span className="text-xs text-muted-foreground">Subtotal:</span>
                            <span className="font-medium text-sm">
                              {formatCurrency((item.customPrice || item.sellingPrice) * item.quantity)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <ShoppingCart size={48} className="text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">Cart is empty</h3>
                    <p className="text-sm text-muted-foreground">
                      Add products from the search tab
                    </p>
                  </div>
                )}

                {/* Mobile Checkout */}
                {cart.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <NewSalesCheckout
                      cart={cart}
                      onCheckoutComplete={handleCheckoutSuccess}
                      isOnline={isOnline}
                      customers={customers}
                      onCustomersRefresh={handleCustomersRefresh}
                      updateCustomer={updateCustomer}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Modals */}
        <AddDebtModal
          isOpen={isAddDebtModalOpen}
          onClose={() => setIsAddDebtModalOpen(false)}
        />
        
        <VariantSelectionModal
          isOpen={isVariantModalOpen}
          onClose={() => {
            setIsVariantModalOpen(false);
            setSelectedParentProduct(null);
          }}
          parentProduct={selectedParentProduct}
          variants={currentVariants}
          onVariantSelect={handleVariantSelect}
        />
      </div>
    );
  }

  // Desktop view remains the same as before
  return (
    <div className="flex h-screen bg-background">
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col border-r border-border">
        {/* Header */}
        <div className="flex-shrink-0 p-6 bg-background border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Sales</h1>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Wifi size={16} />
                  <span className="text-sm font-medium">Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-orange-600">
                  <WifiOff size={16} />
                  <span className="text-sm font-medium">Offline</span>
                </div>
              )}
              {pendingOperations > 0 && (
                <Badge variant="secondary">
                  {pendingOperations} pending
                </Badge>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>


        {/* Products Grid - Desktop/Tablet */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Search size={64} className="text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">No products found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or category filter
              </p>
            </div>
          ) : (
            <>
              <ResponsiveProductGrid
                products={filteredProducts.filter(product => !('isDebtCard' in product))}
                variant="sales"
                onAddToCart={(product) => addToCart(product.id)}
                getPriceForProduct={(product) => product.sellingPrice}
                getStockForProduct={(product) => product.currentStock}
                getInStockStatus={(product) => product.currentStock > 0 || product.currentStock === -1}
                gridConfig={{
                  cols: { 
                    mobile: 2, 
                    tablet: sidebarOpen ? 1 : 2,  // 1 column when sidebar open, 2 when closed (tablet)
                    desktop: sidebarOpen ? 4 : 5  // 4x4 when sidebar open, 5x5 when closed (desktop)
                  },
                  gap: 'gap-3'
                }}
                className="pb-8"
                emptyStateMessage="No products found"
                emptyStateDescription="Try adjusting your search or filters"
              />
              
              {/* Debt Recording Button - Bottom Left of Product Cards */}
              {filteredProducts.some(product => 'isDebtCard' in product && product.isDebtCard) && (
                <div className="fixed bottom-20 left-6 z-30">
                  <Card className="overflow-hidden bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 transition-all duration-200 hover:shadow-lg shadow-xl">
                    <CardContent className="p-3">
                      <div className="flex flex-col items-center gap-2">
                        <Receipt className="w-6 h-6 text-red-600" />
                        <h3 className="font-medium text-xs text-red-700 dark:text-red-400 text-center">Record Cash Lending</h3>
                        <Button
                          onClick={() => setIsAddDebtModalOpen(true)}
                          size="sm"
                          className="w-full bg-red-600 hover:bg-red-700 text-white h-7 text-xs"
                        >
                          Add Debt
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-96 flex flex-col bg-card">
        {/* Cart Header */}
        <div className="flex-shrink-0 p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Cart</h2>
            {cart.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearCart}>
                Clear All
              </Button>
            )}
          </div>

        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length > 0 ? (
            <div className="p-6 space-y-4">
              {cart.map(item => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.customPrice || item.sellingPrice)} each
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        >
                          <Minus size={16} />
                        </Button>
                        <span className="font-medium w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        >
                          <Plus size={16} />
                        </Button>
                      </div>
                      
                      <span className="font-medium">
                        {formatCurrency((item.customPrice || item.sellingPrice) * item.quantity)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <ShoppingCart size={64} className="text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">Cart is empty</h3>
              <p className="text-muted-foreground">
                Add products to start a sale
              </p>
            </div>
          )}
        </div>

        {/* New Checkout Section */}
        {cart.length > 0 && (
          <div className="flex-shrink-0 border-t border-border">
<NewSalesCheckout
  cart={cart}
  onCheckoutComplete={handleCheckoutSuccess}
  isOnline={isOnline}
  customers={customers}
  onCustomersRefresh={handleCustomersRefresh}
  updateCustomer={updateCustomer}
/>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddDebtModal
        isOpen={isAddDebtModalOpen}
        onClose={() => setIsAddDebtModalOpen(false)}
      />
      
      <VariantSelectionModal
        isOpen={isVariantModalOpen}
        onClose={() => {
          setIsVariantModalOpen(false);
          setSelectedParentProduct(null);
        }}
        parentProduct={selectedParentProduct}
        variants={currentVariants}
        onVariantSelect={handleVariantSelect}
      />
    </div>
  );
};

export default RebuiltModernSalesPage;
