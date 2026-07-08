-- Add public policies to vendors table to allow select and insert during anonymous signup
CREATE POLICY "Allow public select of vendors for signup" 
  ON public.vendors FOR SELECT 
  TO public
  USING (true);

CREATE POLICY "Allow public insert of vendors for signup" 
  ON public.vendors FOR INSERT 
  TO public
  WITH CHECK (true);
