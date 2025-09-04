import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimpleTemplateSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedCategory: string;
  categories: string[];
  onCategoryChange: (category: string) => void;
  onClearFilters: () => void;
  resultsCount: number;
  totalItems: number;
  loading: boolean;
}

const SimpleTemplateSearch: React.FC<SimpleTemplateSearchProps> = ({
  searchTerm,
  onSearchChange,
  selectedCategory,
  categories,
  onCategoryChange,
  onClearFilters,
  resultsCount,
  totalItems,
  loading
}) => {
  const hasActiveFilters = searchTerm.trim() || selectedCategory !== 'all';

  return (
    <div className="space-y-4">
      {/* Simple Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={`Search ${totalItems > 0 ? totalItems.toLocaleString() : '7,344+'} templates... (e.g., 'kabras', 'sugar', 'omo')`}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
          disabled={loading}
        />
        {searchTerm && (
          <Button
            onClick={() => onSearchChange('')}
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Simple Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            onClick={() => onCategoryChange(category)}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            className={cn(
              "capitalize",
              selectedCategory === category && "bg-primary text-primary-foreground"
            )}
            disabled={loading}
          >
            <Filter className="w-3 h-3 mr-1" />
            {category === 'all' ? 'All Categories' : category}
          </Button>
        ))}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            Showing <span className="font-semibold text-primary">{resultsCount.toLocaleString()}</span> of{' '}
            <span className="font-semibold">{totalItems.toLocaleString()}</span> templates
          </span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
              Filtered
            </Badge>
          )}
          {totalItems >= 7344 && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">
              ✓ All {totalItems.toLocaleString()} templates loaded
            </Badge>
          )}
          {totalItems > 0 && totalItems < 7344 && (
            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800">
              ⚠ Only {totalItems.toLocaleString()} of 7,344 loaded
            </Badge>
          )}
        </div>
        
        {hasActiveFilters && (
          <Button
            onClick={onClearFilters}
            variant="ghost"
            size="sm"
            className="text-xs"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Search Status */}
      {searchTerm && (
        <div className="text-center">
          {resultsCount > 0 ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">
              ✓ Found {resultsCount.toLocaleString()} results for "{searchTerm}"
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">
              No results found for "{searchTerm}"
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default SimpleTemplateSearch;