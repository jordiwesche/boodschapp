-- Add optional link title for weekmenu (e.g. page title for preview)
ALTER TABLE weekmenu ADD COLUMN IF NOT EXISTS link_title TEXT;
