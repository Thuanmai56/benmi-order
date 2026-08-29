-- Migration: 0043_add_pricing_rules_to_menu_categories.sql
-- Description: Add pricing_rules JSON column to menu_categories for generalized category bundle pricing (e.g., BSC 3 veggies for 100 NT$)

-- 1. Add pricing_rules column to menu_categories
ALTER TABLE menu_categories ADD COLUMN pricing_rules TEXT;

-- 2. Configure BSC veggie category bundle pricing (3 for 100 NT$, regular unit price 35 NT$)
UPDATE menu_categories 
SET pricing_rules = '{"type":"bundle_n","bundle_qty":3,"bundle_price":100,"promo_label":"3份$100"}'
WHERE id = 'bsc_veggie' AND tenant_id = 'bsc';
