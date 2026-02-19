-- Labels feature: smart labels (z.s.m., later) and custom user labels per household

-- 1. Labels table (per household)
CREATE TABLE IF NOT EXISTS labels (
  id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL CHECK (color IN ('purple', 'gray', 'blue', 'green', 'amber', 'red')),
  type TEXT NOT NULL CHECK (type IN ('smart', 'custom')),
  slug TEXT, -- for smart labels: 'zsm', 'later'
  display_order INTEGER NOT NULL DEFAULT 0,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(household_id, slug)
);

-- 2. Junction table: which labels are on which items
CREATE TABLE IF NOT EXISTS shopping_list_item_labels (
  item_id UUID NOT NULL REFERENCES shopping_list_items(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, label_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_labels_household_id ON labels(household_id);
CREATE INDEX IF NOT EXISTS idx_labels_household_type ON labels(household_id, type);
CREATE INDEX IF NOT EXISTS idx_shopping_list_item_labels_item_id ON shopping_list_item_labels(item_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_item_labels_label_id ON shopping_list_item_labels(label_id);

-- 4. Trigger for updated_at
CREATE TRIGGER update_labels_updated_at BEFORE UPDATE ON labels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'labels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE labels;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'shopping_list_item_labels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE shopping_list_item_labels;
  END IF;
END $$;

-- 6. Seed smart labels for all existing households
INSERT INTO labels (household_id, name, color, type, slug, display_order)
SELECT h.id, 'z.s.m.', 'purple', 'smart', 'zsm', 0
FROM households h
WHERE NOT EXISTS (SELECT 1 FROM labels l WHERE l.household_id = h.id AND l.slug = 'zsm');

INSERT INTO labels (household_id, name, color, type, slug, display_order)
SELECT h.id, 'later', 'gray', 'smart', 'later', 1
FROM households h
WHERE NOT EXISTS (SELECT 1 FROM labels l WHERE l.household_id = h.id AND l.slug = 'later');
