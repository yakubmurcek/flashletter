-- Drop the restrictive authenticated-only update policy
DROP POLICY IF EXISTS "Allow authenticated users to update waitlist" 
ON public.waitlist;

-- Create new policy: Allow public to update ONLY privacy_consent
-- and marketing_consent (for unsubscribe functionality)
CREATE POLICY "Allow public to unsubscribe from waitlist"
ON public.waitlist
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
