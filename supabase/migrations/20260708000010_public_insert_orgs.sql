-- Add policy to allow anonymous/public insert on organizations for signups
CREATE POLICY "Allow public insert of organizations for signup" 
  ON public.organizations FOR INSERT 
  WITH CHECK (true);
