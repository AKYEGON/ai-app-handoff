import React, { useState, useCallback } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SimpleProductImageProps {
  src?: string | null;
  alt: string;
  productName: string;
  className?: string;
  fallbackClassName?: string;
}

/**
 * Simple product image component optimized for templates and external URLs
 */
const SimpleProductImage: React.FC<SimpleProductImageProps> = ({
  src,
  alt,
  productName,
  className,
  fallbackClassName,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // Get the product initial for fallback
  const productInitial = productName.charAt(0).toUpperCase();

  // Render fallback
  const renderFallback = () => (
    <div className={cn(
      "w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 via-purple-200 to-purple-300 dark:from-purple-900 dark:via-purple-800 dark:to-purple-700",
      fallbackClassName,
      className
    )}>
      <div className="w-16 h-16 bg-white/90 dark:bg-gray-800/90 rounded-full flex items-center justify-center shadow-lg border-2 border-white/50 dark:border-gray-700/50">
        {isLoading ? (
          <Package className="w-8 h-8 text-purple-700 dark:text-purple-300 animate-pulse" />
        ) : (
          <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {productInitial}
          </span>
        )}
      </div>
    </div>
  );

  // Show fallback if no src or error occurred
  if (!src || hasError) {
    return renderFallback();
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 w-full h-full">
          {renderFallback()}
        </div>
      )}
      
      {/* Actual image */}
      <img
        src={src}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-all duration-300 group-hover:scale-105",
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        style={{ 
          display: isLoading ? 'none' : 'block',
          imageRendering: 'auto',
          objectFit: 'cover'
        }}
      />
    </div>
  );
};

export default SimpleProductImage;