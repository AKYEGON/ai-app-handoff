/**
 * Image utilities for handling product images with fallbacks and optimization
 */

export interface ImageLoadState {
  isLoading: boolean;
  hasError: boolean;
  retryCount: number;
}

export const MAX_RETRY_COUNT = 2;
export const RETRY_DELAY = 1000; // 1 second

/**
 * Check if an image URL is valid and accessible
 */
export const validateImageUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
    return response.ok || response.type === 'opaque'; // opaque response is ok for CORS
  } catch {
    return false;
  }
};

/**
 * Create a cached version of an image URL for offline support
 */
export const getCachedImageUrl = (originalUrl: string): string => {
  if (!originalUrl) return '';
  
  // If it's already a local URL, return as is
  if (originalUrl.startsWith('/') || originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')) {
    return originalUrl;
  }
  
  // Check if it's from the same domain
  try {
    const url = new URL(originalUrl);
    if (url.host === window.location.host) {
      return originalUrl;
    }
  } catch (e) {
    // Invalid URL, return as is
    return originalUrl;
  }
  
  // For external URLs, we'll use the original URL and let the service worker handle caching
  return originalUrl;
};

/**
 * Generate a product initial from name
 */
export const getProductInitial = (name: string): string => {
  return name.charAt(0).toUpperCase();
};

/**
 * Get optimized image URL based on size requirements
 */
export const getOptimizedImageUrl = (originalUrl: string, width?: number, height?: number): string => {
  if (!originalUrl) return '';
  
  // For external CDN URLs, we might want to add optimization parameters
  // This is a placeholder for future CDN optimization
  if (originalUrl.includes('unsplash.com') || originalUrl.includes('cdn.')) {
    // Add optimization parameters for supported CDNs
    const url = new URL(originalUrl);
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    url.searchParams.set('fit', 'crop');
    return url.toString();
  }
  
  return originalUrl;
};

/**
 * Preload an image to check if it's accessible
 */
export const preloadImage = (src: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
};

/**
 * Image URL patterns that we know are likely to work
 */
export const TRUSTED_IMAGE_PATTERNS = [
  /unsplash\.com/,
  /pexels\.com/,
  /pixabay\.com/,
  /cloudinary\.com/,
  /amazonaws\.com/,
  /googleusercontent\.com/,
];

/**
 * Check if an image URL is from a trusted source
 */
export const isTrustedImageSource = (url: string): boolean => {
  return TRUSTED_IMAGE_PATTERNS.some(pattern => pattern.test(url));
};