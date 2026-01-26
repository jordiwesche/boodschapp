-- Migration: Remove default_quantity and purchase_pattern fields from products
-- These fields are no longer needed as quantity goes in description and purchase patterns will be calculated automatically

-- Remove default_quantity column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'default_quantity'
  ) THEN
    ALTER TABLE products DROP COLUMN default_quantity;
  END IF;
END $$;

-- Remove purchase_pattern_frequency column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'purchase_pattern_frequency'
  ) THEN
    ALTER TABLE products DROP COLUMN purchase_pattern_frequency;
  END IF;
END $$;

-- Remove purchase_pattern_unit column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'purchase_pattern_unit'
  ) THEN
    ALTER TABLE products DROP COLUMN purchase_pattern_unit;
  END IF;
END $$;
