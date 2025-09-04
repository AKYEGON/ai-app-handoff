import React, { useMemo } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { ProductTemplate } from '../../../hooks/useProductTemplates';
import UnifiedProductCard from '../../ui/unified-product-card';

interface VirtualizedTemplateGridProps {
  templates: ProductTemplate[];
  selectedTemplates: ProductTemplate[];
  onToggleTemplate: (template: ProductTemplate) => void;
}

interface GridItemProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    templates: ProductTemplate[];
    selectedTemplates: ProductTemplate[];
    onToggleTemplate: (template: ProductTemplate) => void;
    itemsPerRow: number;
  };
}

const GridItem: React.FC<GridItemProps> = ({ columnIndex, rowIndex, style, data }) => {
  const { templates, selectedTemplates, onToggleTemplate, itemsPerRow } = data;
  const index = rowIndex * itemsPerRow + columnIndex;
  
  if (index >= templates.length) {
    return <div style={style} />;
  }
  
  const template = templates[index];
  const isSelected = selectedTemplates.some(t => t.id === template.id);
  
  return (
    <div style={style} className="p-1.5">
      <UnifiedProductCard
        product={template}
        variant="template"
        isSelected={isSelected}
        onSelect={onToggleTemplate}
        className="h-full"
      />
    </div>
  );
};

const VirtualizedTemplateGrid: React.FC<VirtualizedTemplateGridProps> = ({
  templates,
  selectedTemplates,
  onToggleTemplate
}) => {
  // Calculate grid dimensions based on container width
  const gridConfig = useMemo(() => {
    // Use responsive columns similar to ResponsiveProductGrid
    const containerWidth = Math.max(window.innerWidth - 100, 800); // Account for modal padding
    let itemsPerRow: number;
    let itemWidth: number;
    
    if (containerWidth < 640) {
      // Mobile: 2 columns
      itemsPerRow = 2;
      itemWidth = Math.floor((containerWidth - 40) / 2); // Account for padding and gaps
    } else if (containerWidth < 1024) {
      // Tablet: 3 columns
      itemsPerRow = 3;
      itemWidth = Math.floor((containerWidth - 60) / 3);
    } else {
      // Desktop: 5 columns
      itemsPerRow = 5;
      itemWidth = Math.floor((containerWidth - 100) / 5);
    }
    
    // Ensure minimum width and maintain aspect ratio
    itemWidth = Math.max(itemWidth, 160);
    const itemHeight = itemWidth + 80; // Add space for text content
    const totalWidth = itemsPerRow * itemWidth;
    
    return {
      itemsPerRow,
      itemWidth,
      itemHeight,
      totalWidth,
      rowCount: Math.ceil(templates.length / itemsPerRow)
    };
  }, [templates.length]);

  // Show empty state if no templates
  if (templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-900 flex items-center justify-center shadow-lg">
            <span className="text-2xl">📦</span>
          </div>
          <p className="text-lg font-medium text-foreground mb-2">No templates found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or category filter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto">
      <Grid
        columnCount={gridConfig.itemsPerRow}
        columnWidth={gridConfig.itemWidth}
        width={Math.min(gridConfig.totalWidth, window.innerWidth - 100)}
        height={Math.min(gridConfig.rowCount * gridConfig.itemHeight, window.innerHeight - 200)}
        rowCount={gridConfig.rowCount}
        rowHeight={gridConfig.itemHeight}
        itemData={{
          templates,
          selectedTemplates,
          onToggleTemplate,
          itemsPerRow: gridConfig.itemsPerRow
        }}
        className="p-4"
        style={{ overflowY: 'auto' }}
      >
        {GridItem}
      </Grid>
    </div>
  );
};

export default VirtualizedTemplateGrid;