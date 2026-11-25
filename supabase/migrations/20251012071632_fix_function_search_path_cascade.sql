-- Drop and recreate the function with a fixed search_path
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate the triggers
CREATE TRIGGER update_campaigns_updated_at 
  BEFORE UPDATE ON campaigns
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emails_updated_at 
  BEFORE UPDATE ON emails
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
