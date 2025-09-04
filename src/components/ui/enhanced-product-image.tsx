import React from 'react';
import SuperOptimizedImage from './super-optimized-image';

export interface EnhancedProductImageProps {
  src?: string | null;
  alt: string;
  productName: string;
  className?: string;
  fallbackClassName?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

type ImageState = 'loading' | 'loaded' | 'error' | 'retrying';

/**
 * Enhanced product image component with super optimization
 */
const EnhancedProductImage: React.FC<EnhancedProductImageProps> = ({
  src,
  alt,
  productName,
  className,
  fallbackClassName,
  width = 300,
  height = 300,
  priority = false,
}) => {
  return (
    <SuperOptimizedImage
      src={src}
      alt={alt}
      productName={productName}
      className={className}
      fallbackClassName={fallbackClassName}
      width={width}
      height={height}
      priority={priority}
      enableCaching={true}
    />
  );
};

export default EnhancedProductImage;