-- R02: storage only. No tenant is enabled and no existing flag is changed.
-- Missing capability keys are disabled by the R03 application guard.
ALTER TABLE tenant_config ADD COLUMN staff_ordering_capabilities TEXT NOT NULL DEFAULT '{}'
    CHECK (
        json_valid(staff_ordering_capabilities)
        AND json_type(staff_ordering_capabilities) = 'object'
    );
