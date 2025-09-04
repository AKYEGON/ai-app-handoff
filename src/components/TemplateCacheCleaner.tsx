import { useEffect } from 'react';
import { usePublicTemplateCache } from '../hooks/usePublicTemplateCache';

// Component to clear template caches and force refresh
export const TemplateCacheCleaner = () => {
  const { clearCache } = usePublicTemplateCache();

  useEffect(() => {
    // Clear all template caches on mount to reflect database changes
    clearCache();
    console.log('[TemplateCacheCleaner] All template caches cleared to reflect database changes');
  }, [clearCache]);

  return null; // This component doesn't render anything
};

export default TemplateCacheCleaner;