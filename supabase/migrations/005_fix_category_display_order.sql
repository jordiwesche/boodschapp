-- Migration: Fix category display_order values
-- This migration corrects display_order values for existing categories
-- to ensure proper sorting in the shopping list

-- Update display_order based on category name
-- Priority order:
-- 0: Fruit & Groente / Groente & Fruit
-- 1: Vers
-- 2: Vega
-- 3: Vlees & Vis
-- 4: Zuivel
-- 5: Brood & Bakkerij
-- 6: Dranken
-- 7: Droge Kruidenierswaren
-- 8: Diepvries
-- 9: Houdbare Producten
-- 10: Persoonlijke Verzorging
-- 11: Huishoudelijke Artikelen
-- 999: Overig (default)

DO $$
BEGIN
  -- Fruit & Groente / Groente & Fruit = 0
  UPDATE product_categories
  SET display_order = 0
  WHERE LOWER(name) IN ('fruit & groente', 'groente & fruit', 'groente en fruit', 'fruit en groente');

  -- Vers = 1
  UPDATE product_categories
  SET display_order = 1
  WHERE LOWER(name) = 'vers';

  -- Vega = 2
  UPDATE product_categories
  SET display_order = 2
  WHERE LOWER(name) = 'vega';

  -- Vlees & Vis = 3
  UPDATE product_categories
  SET display_order = 3
  WHERE LOWER(name) IN ('vlees & vis', 'vlees en vis', 'vlees', 'vis');

  -- Zuivel = 4
  UPDATE product_categories
  SET display_order = 4
  WHERE LOWER(name) = 'zuivel';

  -- Brood & Bakkerij = 5
  UPDATE product_categories
  SET display_order = 5
  WHERE LOWER(name) IN ('brood & bakkerij', 'brood en bakkerij', 'brood', 'bakkerij');

  -- Dranken = 6
  UPDATE product_categories
  SET display_order = 6
  WHERE LOWER(name) = 'dranken';

  -- Droge Kruidenierswaren = 7
  UPDATE product_categories
  SET display_order = 7
  WHERE LOWER(name) IN ('droge kruidenierswaren', 'kruidenierswaren', 'droge waren');

  -- Diepvries = 8
  UPDATE product_categories
  SET display_order = 8
  WHERE LOWER(name) = 'diepvries';

  -- Houdbare Producten = 9
  UPDATE product_categories
  SET display_order = 9
  WHERE LOWER(name) IN ('houdbare producten', 'houdbare waren', 'conserven');

  -- Persoonlijke Verzorging = 10
  UPDATE product_categories
  SET display_order = 10
  WHERE LOWER(name) IN ('persoonlijke verzorging', 'verzorging', 'hygiëne');

  -- Huishoudelijke Artikelen = 11
  UPDATE product_categories
  SET display_order = 11
  WHERE LOWER(name) IN ('huishoudelijke artikelen', 'huishoud', 'schoonmaak');

  -- Overig = 999 (default, should already be set)
  UPDATE product_categories
  SET display_order = 999
  WHERE LOWER(name) = 'overig' AND (display_order IS NULL OR display_order != 999);

END $$;
