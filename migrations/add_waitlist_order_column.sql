-- Migration: Add order column to waitlist table
-- This migration adds an 'order' column to track the position of users in the waitlist

-- Add the order column
ALTER TABLE waitlist 
ADD COLUMN IF NOT EXISTS "order" INTEGER;

-- Create an index on the order column for better performance
CREATE INDEX IF NOT EXISTS idx_waitlist_order ON waitlist("order");

-- Update existing records with order numbers based on creation time
-- This will assign order numbers to existing waitlist entries
WITH ordered_entries AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC) as new_order
  FROM waitlist
  WHERE "order" IS NULL
)
UPDATE waitlist 
SET "order" = ordered_entries.new_order
FROM ordered_entries
WHERE waitlist.id = ordered_entries.id;

-- Make the order column NOT NULL after populating existing records
ALTER TABLE waitlist 
ALTER COLUMN "order" SET NOT NULL;

-- Add a unique constraint to ensure no duplicate order numbers
ALTER TABLE waitlist 
ADD CONSTRAINT unique_waitlist_order UNIQUE ("order");

-- Create a function to automatically assign order numbers
CREATE OR REPLACE FUNCTION assign_waitlist_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Only assign order if it's null (new insert)
  IF NEW."order" IS NULL THEN
    -- Get the next order number atomically
    SELECT COALESCE(MAX("order"), 0) + 1 INTO NEW."order"
    FROM waitlist;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically assign order on insert
DROP TRIGGER IF EXISTS trigger_assign_waitlist_order ON waitlist;
CREATE TRIGGER trigger_assign_waitlist_order
  BEFORE INSERT ON waitlist
  FOR EACH ROW
  EXECUTE FUNCTION assign_waitlist_order();
