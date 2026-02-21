-- Product snoozes: temporarily hide from Verwacht list for 24h
CREATE TABLE IF NOT EXISTS product_snoozes (
  id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  snoozed_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_snoozes_household_product ON product_snoozes(household_id, product_id);
CREATE INDEX IF NOT EXISTS idx_product_snoozes_snoozed_until ON product_snoozes(household_id, snoozed_until);
