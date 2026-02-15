-- Add checked_by to track who checked an item (for "laatste aanpassing" display)
ALTER TABLE shopping_list_items
  ADD COLUMN IF NOT EXISTS checked_by UUID REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN shopping_list_items.checked_by IS 'User who checked this item (for last-update display)';
