-- Drop all existing policies that have circular dependencies
DROP POLICY IF EXISTS "Users can view own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can update own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can view emails of accessible campaigns" ON emails;
DROP POLICY IF EXISTS "Users can insert emails for own campaigns" ON emails;
DROP POLICY IF EXISTS "Users can update emails of accessible campaigns" ON emails;
DROP POLICY IF EXISTS "Users can delete emails of own campaigns" ON emails;
DROP POLICY IF EXISTS "Users can view versions of accessible emails" ON email_versions;
DROP POLICY IF EXISTS "Users can insert versions for accessible emails" ON email_versions;
DROP POLICY IF EXISTS "Users can delete versions of own emails" ON email_versions;
DROP POLICY IF EXISTS "Users can view collaborators of accessible campaigns" ON campaign_collaborators;

-- Recreate policies without circular dependencies
-- For campaigns: Direct ownership check only (collaborators will be added later with proper handling)
CREATE POLICY "Users can view own campaigns"
  ON campaigns FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own campaigns"
  ON campaigns FOR UPDATE
  USING ((select auth.uid()) = user_id);

-- For emails: Use direct campaign ownership check
CREATE POLICY "Users can view own emails"
  ON emails FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert emails for own campaigns"
  ON emails FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update emails of own campaigns"
  ON emails FOR UPDATE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete emails of own campaigns"
  ON emails FOR DELETE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = (select auth.uid())
    )
  );

-- For email_versions: Use direct ownership through campaigns
CREATE POLICY "Users can view versions of own emails"
  ON email_versions FOR SELECT
  USING (
    email_id IN (
      SELECT e.id FROM emails e
      INNER JOIN campaigns c ON e.campaign_id = c.id
      WHERE c.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert versions for own emails"
  ON email_versions FOR INSERT
  WITH CHECK (
    email_id IN (
      SELECT e.id FROM emails e
      INNER JOIN campaigns c ON e.campaign_id = c.id
      WHERE c.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete versions of own emails"
  ON email_versions FOR DELETE
  USING (
    email_id IN (
      SELECT e.id FROM emails e
      INNER JOIN campaigns c ON e.campaign_id = c.id
      WHERE c.user_id = (select auth.uid())
    )
  );

-- For campaign_collaborators: Use direct campaign ownership only
CREATE POLICY "Users can view own campaign collaborators"
  ON campaign_collaborators FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = (select auth.uid())
    )
    OR user_id = (select auth.uid())
  );
