import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Loader2, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateLoadingStatusProps {
  totalTemplates: number;
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  loadingProgress?: number;
  className?: string;
}

const TemplateLoadingStatus: React.FC<TemplateLoadingStatusProps> = ({
  totalTemplates,
  loading,
  error,
  isOnline,
  loadingProgress = 0,
  className
}) => {
  if (loading) {
    return (
      <div className={cn("flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg", className)}>
        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Loading Templates...
            </span>
            {loadingProgress > 0 && (
              <span className="text-xs text-blue-600 dark:text-blue-400">
                {loadingProgress}%
              </span>
            )}
          </div>
          {loadingProgress > 0 && (
            <Progress value={loadingProgress} className="h-1" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-600" />
          ) : (
            <WifiOff className="w-4 h-4 text-orange-600" />
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg", className)}>
        <AlertCircle className="w-4 h-4 text-red-600" />
        <div className="flex-1">
          <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
            Failed to Load Templates
          </div>
          <div className="text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-600" />
          ) : (
            <WifiOff className="w-4 h-4 text-orange-600" />
          )}
        </div>
      </div>
    );
  }

  if (totalTemplates >= 7344) {
    return (
      <div className={cn("flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg", className)}>
        <CheckCircle className="w-4 h-4 text-green-600" />
        <div className="flex-1">
          <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
            Templates Loaded Successfully
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300">
              {totalTemplates.toLocaleString()} templates available
            </Badge>
            <Badge variant="outline" className="text-xs">
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-600" />
          ) : (
            <WifiOff className="w-4 h-4 text-orange-600" />
          )}
        </div>
      </div>
    );
  }

  if (totalTemplates > 0) {
    return (
      <div className={cn("flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg", className)}>
        <AlertCircle className="w-4 h-4 text-yellow-600" />
        <div className="flex-1">
          <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
            Partial Template Data
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-300">
              Only {totalTemplates.toLocaleString()} of 7,344+ templates loaded
            </Badge>
            <Badge variant="outline" className="text-xs">
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-600" />
          ) : (
            <WifiOff className="w-4 h-4 text-orange-600" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg", className)}>
      <AlertCircle className="w-4 h-4 text-gray-600" />
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
          No Templates Available
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {isOnline ? 'Check your internet connection' : 'No cached data available offline'}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {isOnline ? (
          <Wifi className="w-4 h-4 text-green-600" />
        ) : (
          <WifiOff className="w-4 h-4 text-orange-600" />
        )}
      </div>
    </div>
  );
};

export default TemplateLoadingStatus;