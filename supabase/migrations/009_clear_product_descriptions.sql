-- Migration: Clear description field from products
-- Product descriptions are no longer used; clear any existing values

UPDATE products SET description = NULL WHERE description IS NOT NULL;
