import React, { useState, useEffect } from 'react';

interface ProxyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackContent?: React.ReactNode;
}

// Multiple proven CORS proxy services with different approaches
const PROXY_SERVICES = [
  // Images.weserv.nl - Very reliable for image optimization and CORS
  (url: string) => `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=400&h=400&fit=cover&output=webp`,
  
  // CORS.sh - Simple and reliable
  (url: string) => `https://cors.sh/${url}`,
  
  // AllOrigins - Reliable fallback
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  
  // Corsproxy.io - Another good option
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  
  // Direct load attempt with proper headers
  (url: string) => url
];

export const ProxyImage: React.FC<ProxyImageProps> = ({ 
  src, 
  alt, 
  className, 
  fallbackContent 
}) => {
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [proxyIndex, setProxyIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // Always prioritize Supabase storage URLs - use them directly without any proxy
    if (src.includes('/storage/v1/object/public/') || src.includes('supabase.co/storage/')) {
      console.log('[ProxyImage] Using direct Supabase storage URL:', src);
      setCurrentUrl(src);
      setIsLoading(false);
      setHasError(false);
      setProxyIndex(0);
      return;
    }

    // For external URLs, try proxies
    console.log('[ProxyImage] Using proxy for external URL:', src);
    setProxyIndex(0);
    setCurrentUrl(PROXY_SERVICES[0](src));
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    // Try next proxy service
    const nextIndex = proxyIndex + 1;
    
    if (nextIndex < PROXY_SERVICES.length) {
      console.log(`Trying proxy ${nextIndex} for ${src}`);
      setProxyIndex(nextIndex);
      setCurrentUrl(PROXY_SERVICES[nextIndex](src));
    } else {
      // All proxies failed
      console.log(`All proxies failed for ${src}`);
      setIsLoading(false);
      setHasError(true);
    }
  };

  if (hasError || !currentUrl) {
    return <>{fallbackContent}</>;
  }

  return (
    <>
      {isLoading && fallbackContent}
      <img
        src={currentUrl}
        alt={alt}
        className={className}
        style={{ 
          display: isLoading ? 'none' : 'block',
          imageRendering: 'auto'
        }}
        loading="lazy"
        onLoad={handleImageLoad}
        onError={handleImageError}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
    </>
  );
};

export default ProxyImage;