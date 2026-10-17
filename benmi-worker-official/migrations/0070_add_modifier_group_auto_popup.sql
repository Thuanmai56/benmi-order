-- Add auto_popup column to modifier_groups.
-- 1 = Auto-popup modal when item selected (e.g. combo, meal sides).
-- 0 = Manual customization only (e.g. spice level, customer clicks customize if desired).
ALTER TABLE modifier_groups ADD COLUMN auto_popup INTEGER NOT NULL DEFAULT 1;
