-- Create waitlist table for email collection
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  source TEXT DEFAULT 'landing_page',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'notified')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON public.waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON public.waitlist(created_at);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow anyone to insert (for signup)
CREATE POLICY "Allow public waitlist signup" ON public.waitlist
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to view all waitlist entries (for admin)
CREATE POLICY "Allow authenticated users to view waitlist" ON public.waitlist
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to update waitlist entries (for admin)
CREATE POLICY "Allow authenticated users to update waitlist" ON public.waitlist
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_waitlist_updated_at 
  BEFORE UPDATE ON public.waitlist 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
