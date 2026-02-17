-- EMA correction factor for purchase frequency prediction.
-- When a product is bought from "Verwacht" and the actual interval differs from predicted,
-- we gradually adjust the factor (0.9 * old + 0.1 * ratio). Default 1.0 = no correction.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS frequency_correction_factor REAL DEFAULT 1.0;

COMMENT ON COLUMN products.frequency_correction_factor IS 'EMA multiplier for frequency: effective_frequency = calculated_frequency * this. Updated when items from Verwacht are purchased.';
