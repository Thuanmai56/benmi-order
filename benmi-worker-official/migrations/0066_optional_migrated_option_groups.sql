-- Optional legacy choice groups must retain minimum zero after canonical loading.
-- Do not alter shared groups that predate the bundle migration.
UPDATE modifier_groups
SET is_required=0
WHERE included=0 AND min_selection=0
  AND json_extract(source_metadata_json,'$.legacyBundleRuleId') IS NOT NULL;
