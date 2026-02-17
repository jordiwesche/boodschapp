-- Add week_start to weekmenu: each row is now for a specific calendar week
-- week_start = Monday (ISO) of that week

-- 1. Add column (nullable first for migration)
ALTER TABLE weekmenu ADD COLUMN IF NOT EXISTS week_start DATE;

-- 2. Migrate existing rows: assign to current week's Monday
UPDATE weekmenu
SET week_start = (date_trunc('week', CURRENT_DATE)::date)
WHERE week_start IS NULL;

-- 3. Set NOT NULL
ALTER TABLE weekmenu ALTER COLUMN week_start SET NOT NULL;

-- 4. Drop old unique constraint
ALTER TABLE weekmenu DROP CONSTRAINT IF EXISTS weekmenu_household_id_day_of_week_key;

-- 5. Add new unique constraint
ALTER TABLE weekmenu ADD CONSTRAINT weekmenu_household_week_day_unique
  UNIQUE (household_id, week_start, day_of_week);

-- 6. Index for efficient lookups by household + week
CREATE INDEX IF NOT EXISTS idx_weekmenu_household_week ON weekmenu(household_id, week_start);
