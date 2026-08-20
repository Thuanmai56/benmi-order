-- Migration: 0019_unify_all_tenant_brand_colors.sql
-- Description: Unify all tenant brand colors to the standard Benmi green (#00b900)

UPDATE tenant_config
SET brand_color = '#00b900';
