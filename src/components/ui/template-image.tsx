import React from 'react';
import SuperOptimizedImage from './super-optimized-image';

interface TemplateImageProps {
  src?: string | null;
  alt: string;
  productName: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Optimized image component for template cards with advanced caching
 */
const TemplateImage: React.FC<TemplateImageProps> = ({
  src,
  alt,
  productName,
  className,
  size = 'md',
}) => {
  return (
    <SuperOptimizedImage
      src={src}
      alt={alt}
      productName={productName}
      className={className}
      size={size}
      enableCaching={true}
      priority={false}
    />
  );
};

export default TemplateImage;