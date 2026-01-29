-- Migration: Weekmenu table
-- 7 days per household: menu_text (free text) and link_url per day

CREATE TABLE IF NOT EXISTS weekmenu (
  id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  menu_text TEXT,
  link_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(household_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_weekmenu_household_id ON weekmenu(household_id);

CREATE TRIGGER update_weekmenu_updated_at BEFORE UPDATE ON weekmenu
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime for weekmenu
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'weekmenu'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE weekmenu;
  END IF;
END $$;
