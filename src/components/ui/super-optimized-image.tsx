import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProductInitial } from '@/utils/imageUtils';

interface SuperOptimizedImageProps {
  src?: string | null;
  alt: string;
  productName: string;
  className?: string;
  fallbackClassName?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  size?: 'sm' | 'md' | 'lg';
  enableCaching?: boolean;
}

type ImageState = 'loading' | 'loaded' | 'error';

/**
 * Super optimized image component with advanced caching and modern format support
 */
const SuperOptimizedImage: React.FC<SuperOptimizedImageProps> = ({
  src,
  alt,
  productName,
  className,
  fallbackClassName,
  width = 300,
  height = 300,
  priority = false,
  size = 'md',
  enableCaching = true,
}) => {
  const [imageState, setImageState] = useState<ImageState>('loading');
  const [optimizedSrc, setOptimizedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Size configurations
  const sizeConfig = {
    sm: { width: 150, height: 150, fallbackSize: 'w-6 h-6' },
    md: { width: 300, height: 300, fallbackSize: 'w-8 h-8' },
    lg: { width: 600, height: 600, fallbackSize: 'w-12 h-12' }
  };

  const config = sizeConfig[size];

  // Advanced image optimization with WebP/AVIF support
  const optimizeImageUrl = useCallback((originalSrc: string): string => {
    // If it's already a local Supabase storage URL, use directly
    if (originalSrc.includes('/storage/v1/object/public/') || originalSrc.startsWith('/')) {
      return originalSrc;
    }

    // For external URLs, add optimization parameters
    try {
      const url = new URL(originalSrc);
      
      // Common CDN optimizations
      if (originalSrc.includes('unsplash.com')) {
        url.searchParams.set('w', (width || config.width).toString());
        url.searchParams.set('h', (height || config.height).toString());
        url.searchParams.set('fit', 'crop');
        url.searchParams.set('fm', 'webp');
        url.searchParams.set('q', '80');
      } else if (originalSrc.includes('cloudinary.com')) {
        // Cloudinary transformations
        const pathParts = url.pathname.split('/');
        const transformations = `w_${width || config.width},h_${height || config.height},c_fill,f_auto,q_auto:good`;
        url.pathname = pathParts.slice(0, -1).join('/') + '/' + transformations + '/' + pathParts[pathParts.length - 1];
      }
      
      return url.toString();
    } catch (e) {
      return originalSrc;
    }
  }, [width, height, config.width, config.height]);

  // Cache management using IndexedDB for template images
  const getCachedImage = useCallback(async (imageSrc: string): Promise<string | null> => {
    if (!enableCaching || !('indexedDB' in window)) return null;

    try {
      return new Promise((resolve) => {
        const request = indexedDB.open('ImageCache', 1);
        
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('images')) {
            db.createObjectStore('images');
          }
        };
        
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['images'], 'readonly');
          const store = transaction.objectStore('images');
          const getRequest = store.get(imageSrc);
          
          getRequest.onsuccess = () => {
            const result = getRequest.result;
            if (result && result.blob && Date.now() - result.timestamp < 7 * 24 * 60 * 60 * 1000) { // 7 days
              const url = URL.createObjectURL(result.blob);
              resolve(url);
            } else {
              resolve(null);
            }
          };
          
          getRequest.onerror = () => resolve(null);
        };
        
        request.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }, [enableCaching]);

  const cacheImage = useCallback(async (imageSrc: string, blob: Blob): Promise<void> => {
    if (!enableCaching || !('indexedDB' in window)) return;

    try {
      return new Promise((resolve) => {
        const request = indexedDB.open('ImageCache', 1);
        
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['images'], 'readwrite');
          const store = transaction.objectStore('images');
          
          store.put({
            blob,
            timestamp: Date.now()
          }, imageSrc);
          
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => resolve();
        };
        
        request.onerror = () => resolve();
      });
    } catch (e) {
      // Silently fail caching
    }
  }, [enableCaching]);

  // Load and optimize image
  useEffect(() => {
    if (!src) {
      setOptimizedSrc(null);
      setImageState('error');
      return;
    }

    setImageState('loading');
    const loadImage = async () => {
      try {
        // Try to get cached version first
        const cachedSrc = await getCachedImage(src);
        if (cachedSrc) {
          setOptimizedSrc(cachedSrc);
          setImageState('loaded');
          return;
        }

        // Optimize the source URL
        const optimized = optimizeImageUrl(src);
        
        // Test if the image loads
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Load timeout')), 8000);
          
          img.onload = async () => {
            clearTimeout(timeout);
            
            // Cache the image if it's from an external source
            if (enableCaching && !optimized.includes(window.location.host)) {
              try {
                const response = await fetch(optimized);
                const blob = await response.blob();
                await cacheImage(src, blob);
              } catch (e) {
                // Silently fail caching
              }
            }
            
            resolve();
          };
          
          img.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Load failed'));
          };
          
          img.src = optimized;
        });
        
        setOptimizedSrc(optimized);
        setImageState('loaded');
      } catch (error) {
        console.log(`[SuperOptimizedImage] Failed to load: ${src}`, error);
        setImageState('error');
      }
    };

    loadImage();
  }, [src, optimizeImageUrl, getCachedImage, cacheImage, enableCaching]);

  // Intersection observer for lazy loading
  useEffect(() => {
    if (!imgRef.current || priority) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && optimizedSrc) {
            const img = entry.target as HTMLImageElement;
            if (!img.src) {
              img.src = optimizedSrc;
            }
          }
        });
      },
      { rootMargin: '50px' }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [optimizedSrc, priority]);

  const handleLoad = useCallback(() => {
    setImageState('loaded');
  }, []);

  const handleError = useCallback(() => {
    setImageState('error');
  }, []);

  // Get the product initial for fallback
  const productInitial = getProductInitial(productName);

  // Render fallback
  const renderFallback = () => (
    <div className={cn(
      "w-full h-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-pink-900/30",
      fallbackClassName,
      className
    )}>
      <div className={cn(
        "relative bg-white/90 dark:bg-gray-800/90 rounded-2xl flex items-center justify-center shadow-lg border border-white/50 dark:border-gray-700/50 backdrop-blur-sm",
        config.fallbackSize
      )}>
        {imageState === 'loading' ? (
          <Package className={cn(
            "text-blue-600 dark:text-blue-400 animate-pulse",
            size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-6 h-6'
          )} />
        ) : (
          <span className={cn(
            "font-bold text-blue-700 dark:text-blue-300",
            size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-lg'
          )}>
            {productInitial}
          </span>
        )}
      </div>
    </div>
  );

  // Show fallback if no src or error occurred
  if (!optimizedSrc || imageState === 'error') {
    return renderFallback();
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      {/* Loading state */}
      {imageState === 'loading' && (
        <div className="absolute inset-0 w-full h-full">
          {renderFallback()}
        </div>
      )}
      
      {/* Actual image */}
      <img
        ref={imgRef}
        src={priority ? optimizedSrc : undefined}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-all duration-300",
          imageState === 'loaded' ? 'opacity-100' : 'opacity-0'
        )}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
        style={{ 
          imageRendering: 'auto',
          objectFit: 'cover'
        }}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        width={width || config.width}
        height={height || config.height}
      />
    </div>
  );
};

export default SuperOptimizedImage;