-- Track when an item was added from "Verwacht" and the predicted days at add time,
-- for later analysis of algorithm accuracy (expected vs actual purchase moment).
ALTER TABLE shopping_list_items
  ADD COLUMN IF NOT EXISTS added_from_verwacht_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verwacht_expected_days_at_add SMALLINT;

COMMENT ON COLUMN shopping_list_items.added_from_verwacht_at IS 'Set when item was added from Verwacht list (for algorithm analysis)';
COMMENT ON COLUMN shopping_list_items.verwacht_expected_days_at_add IS 'Predicted "over X days" at add time (for comparison with actual check date)';
