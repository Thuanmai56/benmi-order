-- Migration: 0061_add_staff_order_revision_guard.sql
-- Description: Enforce optimistic concurrency control for staff order revision increments in SQLite D1 batch transactions.

CREATE TRIGGER IF NOT EXISTS orders_staff_revision_guard
BEFORE UPDATE OF revision ON orders
WHEN NEW.revision < 0
BEGIN
  SELECT RAISE(ABORT, 'REVISION_CONFLICT: CHECK constraint failed: revision >= 0');
END;
