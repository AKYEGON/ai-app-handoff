// Product categories from duka_products_templates database - using exact case as stored
export const PRODUCT_CATEGORIES = [
  'electronics',
  'foods', 
  'fresh products',
  'hardware',
  'homecare',
  'households',
  'personal care',
  'textile'
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

// Check if a category is the custom category
export const isCustomCategory = (category: string): boolean => {
  return category === 'Other / Custom';
};

// Get display name for category (used in dropdowns)
export const getCategoryDisplayName = (category: string): string => {
  return category === 'Other / Custom' ? 'Other / Custom' : category;
};

// Validate custom category input
export const validateCustomCategory = (category: string): boolean => {
  return category.trim().length > 0 && category.trim().length <= 50;
};