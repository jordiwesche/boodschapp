-- Migration: Products and Shopping List Tables
-- This migration adds product management and shopping list functionality

-- Fix: Ensure UUID extension functions are available in public schema
-- This handles the case where the extension was created in a different schema in migration 001
DO $$
DECLARE
  ext_schema TEXT;
  func_exists BOOLEAN;
BEGIN
  -- Check if the function exists in public schema
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'uuid_generate_v4'
  ) INTO func_exists;
  
  IF NOT func_exists THEN
    -- Find where the extension currently is
    SELECT n.nspname INTO ext_schema
    FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'uuid-ossp';
    
    IF ext_schema IS NOT NULL AND ext_schema != 'public' THEN
      -- Extension exists in wrong schema, create wrapper function in public
      -- This is safer than dropping/recreating the extension
      EXECUTE format('CREATE OR REPLACE FUNCTION public.uuid_generate_v4() RETURNS uuid AS $func$ SELECT %I.uuid_generate_v4() $func$ LANGUAGE sql;', ext_schema);
      GRANT EXECUTE ON FUNCTION public.uuid_generate_v4() TO PUBLIC;
    ELSIF ext_schema IS NULL THEN
      -- Extension doesn't exist, create it in public
      CREATE EXTENSION "uuid-ossp" WITH SCHEMA public;
    END IF;
  END IF;
END $$;

-- Create product_categories table (per household, with order)
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(household_id, name)
);

-- Create products table (per household)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL DEFAULT '📦',
  name TEXT NOT NULL,
  description TEXT,
  default_quantity TEXT NOT NULL DEFAULT '1',
  category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE RESTRICT,
  is_basic BOOLEAN NOT NULL DEFAULT false,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  purchase_pattern_frequency INTEGER,
  purchase_pattern_unit TEXT CHECK (purchase_pattern_unit IN ('days', 'weeks')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shopping_list_items table (active shopping list)
CREATE TABLE IF NOT EXISTS shopping_list_items (
  id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  quantity TEXT NOT NULL DEFAULT '1',
  category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE RESTRICT,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  checked_at TIMESTAMP WITH TIME ZONE,
  added_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_history table (purchase pattern tracking)
CREATE TABLE IF NOT EXISTS purchase_history (
  id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  shopping_list_item_id UUID REFERENCES shopping_list_items(id) ON DELETE SET NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_categories_household_id ON product_categories(household_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_display_order ON product_categories(household_id, display_order);
CREATE INDEX IF NOT EXISTS idx_products_household_id ON products(household_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(household_id, name);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_household_id ON shopping_list_items(household_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_category_id ON shopping_list_items(category_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_is_checked ON shopping_list_items(household_id, is_checked);
CREATE INDEX IF NOT EXISTS idx_purchase_history_household_id ON purchase_history(household_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_product_id ON purchase_history(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_purchased_at ON purchase_history(household_id, purchased_at DESC);

-- Enable Realtime for new tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'product_categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE product_categories;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE products;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'shopping_list_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE shopping_list_items;
  END IF;
END $$;

-- Create triggers for updated_at
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_list_items_updated_at BEFORE UPDATE ON shopping_list_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create default categories for a household
CREATE OR REPLACE FUNCTION create_default_categories(household_uuid UUID)
RETURNS void AS $$
DECLARE
  default_categories TEXT[] := ARRAY[
    'Groente & Fruit',
    'Vlees & Vis',
    'Zuivel',
    'Brood & Bakkerij',
    'Dranken',
    'Droge Kruidenierswaren',
    'Diepvries',
    'Houdbare Producten',
    'Persoonlijke Verzorging',
    'Huishoudelijke Artikelen'
  ];
  cat_name TEXT;
  cat_order INTEGER := 0;
BEGIN
  FOREACH cat_name IN ARRAY default_categories
  LOOP
    INSERT INTO product_categories (household_id, name, display_order)
    VALUES (household_uuid, cat_name, cat_order)
    ON CONFLICT (household_id, name) DO NOTHING;
    cat_order := cat_order + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
