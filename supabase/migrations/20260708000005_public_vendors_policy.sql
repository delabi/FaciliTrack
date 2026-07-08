-- ========================================================
-- Migration: Public Read Policy for Vendors
-- ========================================================

DROP POLICY IF EXISTS "Allow authenticated users to read vendors" ON public.vendors;

CREATE POLICY "Allow public select of vendors" 
  ON public.vendors FOR SELECT 
  USING (true);
