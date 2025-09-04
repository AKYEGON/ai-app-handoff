-- Delete specific templates without images and problematic templates
DELETE FROM duka_products_templates 
WHERE id IN (2095, 6624) 
   OR image_url IS NULL 
   OR image_url = '' 
   OR image_url = 'null';

-- Add constraint to prevent future null image templates (optional)
-- This helps ensure data quality for templates
ALTER TABLE duka_products_templates 
ADD CONSTRAINT check_image_url_not_empty 
CHECK (image_url IS NOT NULL AND image_url != '' AND image_url != 'null');