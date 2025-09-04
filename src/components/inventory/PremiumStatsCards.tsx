
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle
} from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { useIsMobile, useIsTablet } from '../../hooks/use-mobile';

interface PremiumStatsCardsProps {
  products: Product[];
  onCardClick: (filter: string) => void;
}

const PremiumStatsCards: React.FC<PremiumStatsCardsProps> = ({ products, onCardClick }) => {
  const [animatedValues, setAnimatedValues] = useState({ products: 0, value: 0, lowStock: 0 });
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // Calculate metrics - exclude unspecified stock from calculations
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, product) => {
    // Only count products with specified stock
    if (product.currentStock === -1) return sum;
    return sum + (product.sellingPrice * product.currentStock);
  }, 0);
  
  // Only count products with numeric stock that are below threshold
  const lowStockCount = products.filter(product => 
    product.currentStock !== -1 && product.currentStock <= product.lowStockThreshold
  ).length;

  // Animate values on mount
  React.useEffect(() => {
    const animateValue = (start: number, end: number, key: keyof typeof animatedValues) => {
      const duration = 300;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (end - start) * easeOut);
        
        setAnimatedValues(prev => ({ ...prev, [key]: current }));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    };

    animateValue(0, totalProducts, 'products');
    animateValue(0, totalValue, 'value');
    animateValue(0, lowStockCount, 'lowStock');
  }, [totalProducts, totalValue, lowStockCount]);

  const cards = [
    {
      id: 'total-products',
      title: 'Total Products',
      value: animatedValues.products,
      subtitle: 'distinct SKUs',
      icon: Package,
      iconBg: 'bg-blue-100 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-l-blue-500',
      tooltip: 'Total distinct products in inventory',
      onClick: () => onCardClick('all')
    },
    {
      id: 'total-value',
      title: 'Total Value',
      value: formatCurrency(animatedValues.value),
      subtitle: 'inventory worth',
      icon: TrendingUp,
      iconBg: 'bg-green-100 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      borderColor: 'border-l-green-500',
      tooltip: 'Current value of all stock (excluding unspecified quantities)',
      onClick: () => onCardClick('value')
    },
    {
      id: 'low-stock',
      title: 'Low Stock',
      value: animatedValues.lowStock,
      subtitle: lowStockCount === 0 ? 'all stocked well' : 'items need attention',
      icon: AlertTriangle,
      iconBg: lowStockCount > 0 ? 'bg-red-100 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-gray-800',
      iconColor: lowStockCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400',
      borderColor: lowStockCount > 0 ? 'border-l-red-500' : 'border-l-gray-300',
      tooltip: 'Products with numeric quantities at or below their reorder threshold',
      onClick: () => onCardClick('low-stock'),
      dimmed: lowStockCount === 0
    }
  ];

  // Mobile layout - Stack cards vertically
  if (isMobile) {
    return (
      <div className="grid grid-cols-1 gap-4 mb-6">
        {cards.map((card) => (
          <Tooltip key={card.id}>
            <TooltipTrigger asChild>
              <Card 
                className={`
                  relative overflow-hidden cursor-pointer transition-all duration-300 ease-out
                  bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md
                  border-l-4 ${card.borderColor}
                  hover:-translate-y-0.5 active:scale-95
                  ${card.dimmed ? 'opacity-75' : ''}
                `}
                onClick={card.onClick}
              >
                <CardContent className="p-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`
                          w-8 h-8 rounded-lg flex items-center justify-center
                          ${card.iconBg}
                        `}>
                          <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                        </div>
                        <h3 className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 tracking-wide">
                          {card.title}
                        </h3>
                      </div>
                      <div className="space-y-1">
                        <div className={`
                          text-2xl font-bold
                          ${card.dimmed ? 'text-gray-400' : 'text-gray-900 dark:text-white'}
                        `}>
                          {card.value}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {card.subtitle}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>{card.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    );
  }

  // Tablet layout - 3 columns with proper spacing
  if (isTablet) {
    return (
      <div className="grid grid-cols-3 gap-4 mb-8">
        {cards.map((card) => (
          <Tooltip key={card.id}>
            <TooltipTrigger asChild>
              <Card 
                className={`
                  relative overflow-hidden cursor-pointer transition-all duration-300 ease-out
                  bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-lg
                  border-l-4 ${card.borderColor}
                  hover:-translate-y-1 hover:scale-[1.02]
                  ${card.dimmed ? 'opacity-75' : ''}
                `}
                onClick={card.onClick}
              >
                <CardContent className="p-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`
                          w-9 h-9 rounded-xl flex items-center justify-center
                          ${card.iconBg}
                        `}>
                          <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                        </div>
                        <h3 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">
                          {card.title}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className={`
                      text-2xl font-bold transition-colors duration-200
                      ${card.dimmed ? 'text-gray-400' : 'text-gray-900 dark:text-white'}
                    `}>
                      {card.value}
                    </div>
                    
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {card.subtitle}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>{card.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    );
  }

  // Desktop layout - Full 3 columns with enhanced styling
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {cards.map((card) => (
        <Tooltip key={card.id}>
          <TooltipTrigger asChild>
            <Card 
              className={`
                relative overflow-hidden cursor-pointer transition-all duration-300 ease-out
                bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md hover:shadow-xl
                border-l-4 ${card.borderColor}
                hover:-translate-y-1 hover:scale-[1.02]
                ${card.dimmed ? 'opacity-75' : ''}
              `}
              onClick={card.onClick}
            >
              <CardContent className="p-0">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center
                        ${card.iconBg} transition-all duration-200
                        group-hover:scale-110
                      `}>
                        <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                      </div>
                      <h3 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">
                        {card.title}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className={`
                    text-3xl font-bold transition-colors duration-200
                    ${card.dimmed ? 'text-gray-400' : 'text-gray-900 dark:text-white'}
                  `}>
                    {card.value}
                  </div>
                  
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {card.subtitle}
                  </div>
                </div>

                {/* Pulse animation for icon background */}
                <div className={`
                  absolute top-6 left-6 w-10 h-10 rounded-full
                  ${card.iconBg} opacity-0 animate-ping
                `} style={{ animationDelay: `${cards.indexOf(card) * 100}ms` }} />

                {/* Ripple effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>{card.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

export default PremiumStatsCards;
