import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CartItem } from '@/types/cart';

const CART_STORAGE_KEY = 'sales_cart_persistent';
const CART_EXPIRY_TIME = 3 * 60 * 1000; // 3 minutes in milliseconds

interface CartStorage {
  items: CartItem[];
  timestamp: number;
}

export const usePersistedCart = () => {
  const { toast } = useToast();
  
  // Initialize cart from localStorage with robust error handling
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    
    try {
      const savedData = localStorage.getItem(CART_STORAGE_KEY);
      if (savedData) {
        const { items, timestamp }: CartStorage = JSON.parse(savedData);
        const now = new Date().getTime();
        
        // Check if cart is still valid (within 3 minutes)
        if (now - timestamp < CART_EXPIRY_TIME && Array.isArray(items)) {
          console.log('[PersistedCart] Loaded cart from localStorage:', items.length, 'items');
          return items;
        } else {
          // Cart expired or invalid, remove from localStorage
          localStorage.removeItem(CART_STORAGE_KEY);
          console.log('[PersistedCart] Cart expired or invalid, cleared from localStorage');
        }
      }
    } catch (error) {
      console.error('[PersistedCart] Error loading cart from localStorage:', error);
      localStorage.removeItem(CART_STORAGE_KEY);
    }
    return [];
  });

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (cart.length > 0) {
        const cartData: CartStorage = {
          items: cart,
          timestamp: new Date().getTime()
        };
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartData));
        console.log('[PersistedCart] Saved cart to localStorage:', cart.length, 'items');
      } else {
        localStorage.removeItem(CART_STORAGE_KEY);
        console.log('[PersistedCart] Removed empty cart from localStorage');
      }
    } catch (error) {
      console.error('[PersistedCart] Error saving cart to localStorage:', error);
    }
  }, [cart]);

  // Set up cart expiration cleanup - check every minute
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkCartExpiry = () => {
      try {
        const savedData = localStorage.getItem(CART_STORAGE_KEY);
        if (savedData) {
          const { timestamp }: CartStorage = JSON.parse(savedData);
          const now = new Date().getTime();
          
          // If cart has expired, clear it
          if (now - timestamp >= CART_EXPIRY_TIME) {
            localStorage.removeItem(CART_STORAGE_KEY);
            setCart([]);
            console.log('[PersistedCart] Cart expired and cleared');
            toast({
              title: "Cart Expired",
              description: "Cart items have been cleared after 3 minutes of inactivity.",
              variant: "default",
            });
          }
        }
      } catch (error) {
        console.error('[PersistedCart] Error checking cart expiration:', error);
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    };

    // Check immediately on mount
    checkCartExpiry();

    // Then check every minute
    const interval = setInterval(checkCartExpiry, 60000);

    return () => clearInterval(interval);
  }, [toast]);

  // Add item to cart
  const addToCart = useCallback((item: CartItem) => {
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(cartItem => cartItem.id === item.id);
      
      if (existingIndex >= 0) {
        // Update existing item quantity
        const updatedCart = [...prevCart];
        updatedCart[existingIndex] = {
          ...updatedCart[existingIndex],
          quantity: updatedCart[existingIndex].quantity + item.quantity
        };
        return updatedCart;
      } else {
        // Add new item
        return [...prevCart, item];
      }
    });
  }, []);

  // Update item quantity
  const updateQuantity = useCallback((productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(prevCart => prevCart.filter(item => item.id !== productId));
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  }, []);

  // Remove item from cart
  const removeFromCart = useCallback((productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  }, []);

  // Clear entire cart
  const clearCart = useCallback(() => {
    setCart([]);
    localStorage.removeItem(CART_STORAGE_KEY);
    console.log('[PersistedCart] Cart manually cleared');
  }, []);

  // Update timestamp without changing cart contents (to extend expiry)
  const refreshCartExpiry = useCallback(() => {
    if (cart.length > 0) {
      const cartData: CartStorage = {
        items: cart,
        timestamp: new Date().getTime()
      };
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartData));
      console.log('[PersistedCart] Cart expiry refreshed');
    }
  }, [cart]);

  return {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    refreshCartExpiry,
    isEmpty: cart.length === 0,
    itemCount: cart.reduce((total, item) => total + item.quantity, 0),
    total: cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0)
  };
};