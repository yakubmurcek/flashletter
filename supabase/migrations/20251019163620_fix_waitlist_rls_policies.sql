-- Drop existing policies
DROP POLICY IF EXISTS "Allow public waitlist signup" ON public.waitlist;
DROP POLICY IF EXISTS "Allow authenticated users to view waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Allow authenticated users to update waitlist" ON public.waitlist;

-- Create new policies that allow public signup
-- Allow anyone to insert (for public waitlist signup)
CREATE POLICY "Allow public waitlist signup" ON public.waitlist
  FOR INSERT WITH CHECK (true);

-- Allow anyone to view waitlist entries (for public access if needed)
CREATE POLICY "Allow public to view waitlist" ON public.waitlist
  FOR SELECT USING (true);

-- Allow authenticated users to update waitlist entries (for admin)
CREATE POLICY "Allow authenticated users to update waitlist" ON public.waitlist
  FOR UPDATE USING (auth.role() = 'authenticated');
