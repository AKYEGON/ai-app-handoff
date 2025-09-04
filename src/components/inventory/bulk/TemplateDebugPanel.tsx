import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Database, Search, Filter, RefreshCw } from 'lucide-react';
import { useProductTemplates } from '../../../hooks/useProductTemplates';
import { supabase } from '@/integrations/supabase/client';

interface TemplateDebugPanelProps {
  className?: string;
}

const TemplateDebugPanel: React.FC<TemplateDebugPanelProps> = ({ className }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dbCount, setDbCount] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  
  const {
    templates,
    allTemplates,
    loading,
    error,
    searchTerm,
    selectedCategory,
    categories,
    isOnline,
    totalTemplates,
    hasActiveSearch,
    hasActiveFilter
  } = useProductTemplates();

  const checkDatabaseCount = async () => {
    setChecking(true);
    try {
      const { count, error } = await supabase
        .from('duka_products_templates')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error('Failed to get DB count:', error);
        setDbCount(-1);
      } else {
        setDbCount(count || 0);
      }
    } catch (err) {
      console.error('Error checking DB:', err);
      setDbCount(-1);
    } finally {
      setChecking(false);
    }
  };

  if (!isExpanded) {
    return (
      <div className={className}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="text-xs text-muted-foreground"
        >
          <ChevronDown className="w-3 h-3 mr-1" />
          Debug Template Loading
        </Button>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Template Loading Debug</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="h-auto p-1"
          >
            <ChevronUp className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status Overview */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Database className="w-3 h-3" />
            <span>Loaded: {allTemplates.length.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Search className="w-3 h-3" />
            <span>Filtered: {templates.length.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-3 h-3" />
            <span>Categories: {categories.length - 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? "default" : "secondary"} className="text-xs">
              {isOnline ? "Online" : "Offline"}
            </Badge>
          </div>
        </div>

        {/* Database Check */}
        <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
          <span className="text-xs">Database Count:</span>
          <div className="flex items-center gap-2">
            {dbCount !== null ? (
              <Badge variant={dbCount >= 7000 ? "default" : "destructive"} className="text-xs">
                {dbCount === -1 ? "Error" : dbCount.toLocaleString()}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">Unknown</Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={checkDatabaseCount}
              disabled={checking}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Active Filters */}
        {(hasActiveSearch || hasActiveFilter) && (
          <div className="space-y-1">
            <div className="text-xs font-medium">Active Filters:</div>
            <div className="flex flex-wrap gap-1">
              {hasActiveSearch && (
                <Badge variant="outline" className="text-xs">
                  Search: "{searchTerm}"
                </Badge>
              )}
              {hasActiveFilter && (
                <Badge variant="outline" className="text-xs">
                  Category: {selectedCategory}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs">
            <div className="font-medium text-red-800 dark:text-red-200">Error:</div>
            <div className="text-red-600 dark:text-red-400">{error}</div>
          </div>
        )}

        {/* Cache Status */}
        <div className="text-xs text-muted-foreground">
          {loading ? "Loading..." : `Cache: ${allTemplates.length > 0 ? "Active" : "Empty"}`}
        </div>
      </CardContent>
    </Card>
  );
};

export default TemplateDebugPanel;