-- Add consent fields to waitlist table for GDPR compliance
ALTER TABLE waitlist 
ADD COLUMN privacy_consent BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN marketing_consent BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN consent_timestamp TIMESTAMPTZ DEFAULT NOW();

-- Add comment for documentation
COMMENT ON COLUMN waitlist.privacy_consent IS 'GDPR consent for privacy policy and data processing';
COMMENT ON COLUMN waitlist.marketing_consent IS 'Optional consent for marketing communications';
COMMENT ON COLUMN waitlist.consent_timestamp IS 'Timestamp when consent was given';
