import React from 'react';
import SuperOptimizedImage from './super-optimized-image';

interface ExternalProductImageProps {
  src?: string | null;
  alt: string;
  productName: string;
  className?: string;
  fallbackClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Optimized image component for external URLs with advanced caching
 */
const ExternalProductImage: React.FC<ExternalProductImageProps> = ({
  src,
  alt,
  productName,
  className,
  fallbackClassName,
  size = 'md',
}) => {
  return (
    <SuperOptimizedImage
      src={src}
      alt={alt}
      productName={productName}
      className={className}
      fallbackClassName={fallbackClassName}
      size={size}
      enableCaching={true}
      priority={false}
    />
  );
};

export default ExternalProductImage;