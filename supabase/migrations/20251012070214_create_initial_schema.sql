-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  landing_page_url TEXT,
  landing_page_content TEXT,
  landing_page_metadata JSONB,
  tone TEXT,
  campaign_type TEXT,
  days INTEGER,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create emails table
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  subject TEXT NOT NULL,
  preview TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create email_versions table
CREATE TABLE IF NOT EXISTS email_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  changes_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create campaign_collaborators table (future-ready for real-time collaboration)
CREATE TABLE IF NOT EXISTS campaign_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_emails_campaign_id ON emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_versions_email_id ON email_versions(email_id);
CREATE INDEX IF NOT EXISTS idx_campaign_collaborators_campaign_id ON campaign_collaborators(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_collaborators_user_id ON campaign_collaborators(user_id);

-- Enable Row Level Security
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns table
-- Users can view their own campaigns and campaigns they collaborate on
CREATE POLICY "Users can view own campaigns"
  ON campaigns FOR SELECT
  USING (
    auth.uid() = user_id 
    OR 
    id IN (
      SELECT campaign_id FROM campaign_collaborators WHERE user_id = auth.uid()
    )
  );

-- Users can insert their own campaigns
CREATE POLICY "Users can insert own campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own campaigns or campaigns they have editor/owner role
CREATE POLICY "Users can update own campaigns"
  ON campaigns FOR UPDATE
  USING (
    auth.uid() = user_id
    OR
    id IN (
      SELECT campaign_id FROM campaign_collaborators 
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Users can delete their own campaigns
CREATE POLICY "Users can delete own campaigns"
  ON campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for emails table
-- Users can view emails of campaigns they have access to
CREATE POLICY "Users can view emails of accessible campaigns"
  ON emails FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
      UNION
      SELECT campaign_id FROM campaign_collaborators WHERE user_id = auth.uid()
    )
  );

-- Users can insert emails for their campaigns
CREATE POLICY "Users can insert emails for own campaigns"
  ON emails FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
      UNION
      SELECT campaign_id FROM campaign_collaborators 
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Users can update emails of accessible campaigns
CREATE POLICY "Users can update emails of accessible campaigns"
  ON emails FOR UPDATE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
      UNION
      SELECT campaign_id FROM campaign_collaborators 
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Users can delete emails of their campaigns
CREATE POLICY "Users can delete emails of own campaigns"
  ON emails FOR DELETE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for email_versions table
-- Users can view versions of emails they have access to
CREATE POLICY "Users can view versions of accessible emails"
  ON email_versions FOR SELECT
  USING (
    email_id IN (
      SELECT e.id FROM emails e
      JOIN campaigns c ON e.campaign_id = c.id
      WHERE c.user_id = auth.uid()
      UNION
      SELECT e.id FROM emails e
      JOIN campaign_collaborators cc ON e.campaign_id = cc.campaign_id
      WHERE cc.user_id = auth.uid()
    )
  );

-- Users can insert versions for accessible emails
CREATE POLICY "Users can insert versions for accessible emails"
  ON email_versions FOR INSERT
  WITH CHECK (
    email_id IN (
      SELECT e.id FROM emails e
      JOIN campaigns c ON e.campaign_id = c.id
      WHERE c.user_id = auth.uid()
      UNION
      SELECT e.id FROM emails e
      JOIN campaign_collaborators cc ON e.campaign_id = cc.campaign_id
      WHERE cc.user_id = auth.uid() AND cc.role IN ('owner', 'editor')
    )
  );

-- Users can delete versions of their emails
CREATE POLICY "Users can delete versions of own emails"
  ON email_versions FOR DELETE
  USING (
    email_id IN (
      SELECT e.id FROM emails e
      JOIN campaigns c ON e.campaign_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- RLS Policies for campaign_collaborators table
-- Users can view collaborators of campaigns they have access to
CREATE POLICY "Users can view collaborators of accessible campaigns"
  ON campaign_collaborators FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
      UNION
      SELECT campaign_id FROM campaign_collaborators WHERE user_id = auth.uid()
    )
  );

-- Only campaign owners can add collaborators
CREATE POLICY "Campaign owners can add collaborators"
  ON campaign_collaborators FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- Only campaign owners can update collaborators
CREATE POLICY "Campaign owners can update collaborators"
  ON campaign_collaborators FOR UPDATE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- Only campaign owners can remove collaborators
CREATE POLICY "Campaign owners can remove collaborators"
  ON campaign_collaborators FOR DELETE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emails_updated_at BEFORE UPDATE ON emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
