-- ========================================================
-- Migration: Break RLS Recursion with Security Definer
-- ========================================================

-- 1. Helper security definer functions to break RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_org()
RETURNS text AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_vendor()
RETURNS text AS $$
  SELECT vendor_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Drop recursion-prone policies
DROP POLICY IF EXISTS "Allow profiles to view other profiles in same organization" ON public.profiles;
DROP POLICY IF EXISTS "Allow tenants, managers, and vendors to select requests in their organization" ON public.repair_requests;
DROP POLICY IF EXISTS "Allow authenticated users to insert requests in their organization" ON public.repair_requests;
DROP POLICY IF EXISTS "Allow managers and assigned vendors to update requests" ON public.repair_requests;
DROP POLICY IF EXISTS "Allow managers to delete requests" ON public.repair_requests;

-- 3. Recreate them using helper functions
CREATE POLICY "Allow profiles to view other profiles in same organization" 
  ON public.profiles FOR SELECT 
  USING (
    auth.role() = 'authenticated' AND (
      id = auth.uid() OR 
      organization_id = public.get_user_org()
    )
  );

CREATE POLICY "Allow tenants, managers, and vendors to select requests in their organization"
  ON public.repair_requests FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      organization_id = public.get_user_org() OR
      assigned_vendor_id = public.get_user_vendor()
    )
  );

CREATE POLICY "Allow authenticated users to insert requests in their organization"
  ON public.repair_requests FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      organization_id = public.get_user_org()
    )
  );

CREATE POLICY "Allow managers and assigned vendors to update requests"
  ON public.repair_requests FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND (
      organization_id = public.get_user_org() OR
      assigned_vendor_id = public.get_user_vendor()
    )
  );

CREATE POLICY "Allow managers to delete requests"
  ON public.repair_requests FOR DELETE
  USING (
    auth.role() = 'authenticated' AND 
    organization_id = public.get_user_org()
  );
