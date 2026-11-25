-- Add user region field to track GDPR vs CCPA compliance
ALTER TABLE waitlist 
ADD COLUMN user_region VARCHAR(10) DEFAULT 'OTHER';

-- Add comment for documentation
COMMENT ON COLUMN waitlist.user_region IS 'User region for privacy compliance: EU, US, or OTHER';

-- Add check constraint to ensure valid values
ALTER TABLE waitlist 
ADD CONSTRAINT check_user_region 
CHECK (user_region IN ('EU', 'US', 'OTHER'));
