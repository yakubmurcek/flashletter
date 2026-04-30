-- Migration: replace the racy waitlist order trigger with a sequence
--
-- The previous trigger (`assign_waitlist_order`) assigned a value via
-- `SELECT COALESCE(MAX("order"), 0) + 1` inside a BEFORE INSERT FOR EACH ROW
-- handler. Two concurrent inserts both read the same MAX, both compute the
-- same +1, and one fails the unique constraint. Under any real signup
-- concurrency this hands the user a 500.
--
-- A sequence is the standard fix: nextval() is atomic across sessions and
-- is exactly what `order` wants to be — a monotonically-increasing position
-- in line.
--
-- Idempotent: safe to re-run.

-- Drop the old trigger + function.
DROP TRIGGER IF EXISTS trigger_assign_waitlist_order ON waitlist;
DROP FUNCTION IF EXISTS assign_waitlist_order();

-- Create the sequence at the current max+1 so positions don't reset / reuse.
DO $$
DECLARE
  start_value bigint;
BEGIN
  SELECT COALESCE(MAX("order"), 0) + 1 INTO start_value FROM waitlist;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'waitlist_order_seq' AND relkind = 'S'
  ) THEN
    EXECUTE format('CREATE SEQUENCE waitlist_order_seq START WITH %s', start_value);
  ELSE
    PERFORM setval('waitlist_order_seq', GREATEST(last_value, start_value)) FROM waitlist_order_seq;
  END IF;
END $$;

-- Default new rows to nextval(). Inserts that pass NULL for "order" need to
-- omit the column instead — Postgres will only apply the default for an
-- absent value, not an explicit NULL.
ALTER TABLE waitlist ALTER COLUMN "order" SET DEFAULT nextval('waitlist_order_seq');

-- Tie the sequence's lifecycle to the column.
ALTER SEQUENCE waitlist_order_seq OWNED BY waitlist."order";
