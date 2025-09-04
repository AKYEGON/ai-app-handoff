import React, { useCallback, memo } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { cn } from '@/lib/utils';
import { ProductTemplate } from '../../hooks/useLazyTemplateSearch';
import TemplateImage from '../ui/template-image';

interface VirtualizedTemplateGridProps {
  templates: ProductTemplate[];
  onTemplateClick: (template: ProductTemplate) => void;
  className?: string;
}

interface TemplateItemProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    templates: ProductTemplate[];
    columnsPerRow: number;
    onTemplateClick: (template: ProductTemplate) => void;
  };
}

const TemplateItem = memo(({ columnIndex, rowIndex, style, data }: TemplateItemProps) => {
  const { templates, columnsPerRow, onTemplateClick } = data;
  const index = rowIndex * columnsPerRow + columnIndex;
  const template = templates[index];

  if (!template) {
    return <div style={style} />;
  }

  const handleClick = () => {
    console.log('Template clicked:', template.name);
    onTemplateClick(template);
  };

  return (
    <div style={style} className="p-1">
      <div
        onClick={handleClick}
        className={cn(
          "group relative overflow-hidden rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-200 cursor-pointer h-full",
          "hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.02]"
        )}
      >
        {/* Template Image */}
        <div className="aspect-square bg-muted/30 overflow-hidden">
          <TemplateImage
            src={template.image_url}
            alt={template.name}
            productName={template.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        </div>
        
        {/* Template Info */}
        <div className="p-2">
          <h3 className="font-medium text-xs text-foreground truncate mb-1">
            {template.name}
          </h3>
          {template.category && (
            <p className="text-xs text-muted-foreground capitalize truncate">
              {template.category}
            </p>
          )}
        </div>
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
            Select
          </div>
        </div>
      </div>
    </div>
  );
});

TemplateItem.displayName = 'TemplateItem';

const VirtualizedTemplateGrid: React.FC<VirtualizedTemplateGridProps> = ({
  templates,
  onTemplateClick,
  className
}) => {
  // Calculate grid dimensions based on container
  const getGridDimensions = () => {
    const containerWidth = Math.min(1200, window.innerWidth - 64); // Max width with padding
    const itemWidth = window.innerWidth > 768 ? 160 : 140;
    const columnsPerRow = Math.max(1, Math.floor(containerWidth / itemWidth));
    const rowCount = Math.ceil(templates.length / columnsPerRow);
    
    return {
      columnsPerRow,
      rowCount,
      itemWidth,
      itemHeight: itemWidth + 80, // Add space for text
      containerWidth
    };
  };

  const { columnsPerRow, rowCount, itemWidth, itemHeight, containerWidth } = getGridDimensions();

  const itemData = useCallback(() => ({
    templates,
    columnsPerRow,
    onTemplateClick
  }), [templates, columnsPerRow, onTemplateClick]);

  if (templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">No templates found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex-1 overflow-hidden flex justify-center", className)}>
      <Grid
        columnCount={columnsPerRow}
        columnWidth={itemWidth}
        height={500} // Increased height for better viewing
        rowCount={rowCount}
        rowHeight={itemHeight}
        itemData={itemData()}
        width={containerWidth}
        overscanRowCount={2}
        overscanColumnCount={1}
      >
        {TemplateItem}
      </Grid>
    </div>
  );
};

export default VirtualizedTemplateGrid;