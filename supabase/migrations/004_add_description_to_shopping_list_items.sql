-- Migration: Add description field to shopping_list_items
-- This field will store annotations/toelichting (quantity, parentheses, free text)

-- Add description column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopping_list_items' AND column_name = 'description'
  ) THEN
    ALTER TABLE shopping_list_items ADD COLUMN description TEXT;
  END IF;
END $$;
