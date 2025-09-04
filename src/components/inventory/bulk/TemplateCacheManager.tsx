import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Trash2, Database } from 'lucide-react';
import { toast } from "sonner";

const TemplateCacheManager: React.FC = () => {
  // No need for useToast anymore, using sonner directly

  const clearTemplateCache = () => {
    try {
      // Clear all template-related cache
      const keys = Object.keys(localStorage);
      const templateKeys = keys.filter(key => 
        key.includes('public_cache_all_product_templates') || 
        key.includes('template')
      );
      
      templateKeys.forEach(key => localStorage.removeItem(key));
      
      toast.success("Cache Cleared", {
        description: `Cleared ${templateKeys.length} template cache entries. Refreshing page...`,
      });
      
      // Force page refresh to reload templates
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      toast.error("Error", {
        description: "Failed to clear cache",
      });
    }
  };

  const forceRefreshTemplates = () => {
    clearTemplateCache();
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <Database className="w-4 h-4 text-blue-600" />
      <div className="flex-1">
        <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
          Template Cache Manager
        </div>
        <div className="text-xs text-blue-600 dark:text-blue-400">
          Clear cache to force reload all 7,344+ templates
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={clearTemplateCache}
          variant="outline"
          size="sm"
          className="text-xs h-8"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Clear Cache
        </Button>
        <Button
          onClick={forceRefreshTemplates}
          variant="default"
          size="sm"
          className="text-xs h-8"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Force Refresh
        </Button>
      </div>
    </div>
  );
};

export default TemplateCacheManager;