-- ==========================================
-- Migration: Proper Supabase Auth & Strict RLS
-- ==========================================

-- 1. Drop existing policies to redefine them strictly
DROP POLICY IF EXISTS "Allow public read access to organizations" ON organizations;
DROP POLICY IF EXISTS "Allow public write access to organizations" ON organizations;
DROP POLICY IF EXISTS "Allow public read access to facilities" ON facilities;
DROP POLICY IF EXISTS "Allow public write access to facilities" ON facilities;
DROP POLICY IF EXISTS "Allow public read access to vendors" ON vendors;
DROP POLICY IF EXISTS "Allow public write access to vendors" ON vendors;
DROP POLICY IF EXISTS "Allow public read access to profiles" ON profiles;
DROP POLICY IF EXISTS "Allow public write access to profiles" ON profiles;
DROP POLICY IF EXISTS "Allow public read access to repair_requests" ON repair_requests;
DROP POLICY IF EXISTS "Allow public write access to repair_requests" ON repair_requests;
DROP POLICY IF EXISTS "Allow public read access to progress_logs" ON progress_logs;
DROP POLICY IF EXISTS "Allow public write access to progress_logs" ON progress_logs;

-- 2. Drop and Recreate Profiles table referencing auth.users
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id TEXT REFERENCES public.organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'manager', 'vendor', 'tenant')) NOT NULL DEFAULT 'tenant',
  vendor_id TEXT REFERENCES public.vendors(id) ON DELETE SET NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create handle new user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, organization_id, vendor_id)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'New User'),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'tenant'),
    coalesce(new.raw_user_meta_data->>'organization_id', 'org-4'), -- Default organization
    new.raw_user_meta_data->>'vendor_id'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Define Proper RLS Policies

-- ORGANIZATIONS
CREATE POLICY "Allow public select of organizations for signup" 
  ON public.organizations FOR SELECT 
  USING (true);

CREATE POLICY "Allow managers to update organizations" 
  ON public.organizations FOR ALL 
  USING (
    auth.role() = 'authenticated' AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
  );

-- FACILITIES
CREATE POLICY "Allow public read of facilities for QR access" 
  ON public.facilities FOR SELECT 
  USING (true);

CREATE POLICY "Allow managers to manage facilities" 
  ON public.facilities FOR ALL 
  USING (
    auth.role() = 'authenticated' AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND organization_id = facilities.organization_id AND role = 'manager')
  );

-- VENDORS
CREATE POLICY "Allow authenticated users to read vendors" 
  ON public.vendors FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow managers to manage vendors" 
  ON public.vendors FOR ALL 
  USING (
    auth.role() = 'authenticated' AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND organization_id = vendors.organization_id AND role = 'manager')
  );

-- PROFILES
CREATE POLICY "Allow profiles to view other profiles in same organization" 
  ON public.profiles FOR SELECT 
  USING (
    auth.role() = 'authenticated' AND 
    (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR id = auth.uid())
  );

CREATE POLICY "Allow profiles to update their own record" 
  ON public.profiles FOR UPDATE 
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- REPAIR REQUESTS
CREATE POLICY "Allow tenants, managers, and vendors to select requests in their organization"
  ON public.repair_requests FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
      assigned_vendor_id = (SELECT vendor_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Allow authenticated users to insert requests in their organization"
  ON public.repair_requests FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Allow managers and assigned vendors to update requests"
  ON public.repair_requests FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND organization_id = repair_requests.organization_id AND role = 'manager') OR
      assigned_vendor_id = (SELECT vendor_id FROM public.profiles WHERE id = auth.uid() AND role = 'vendor')
    )
  );

CREATE POLICY "Allow managers to delete requests"
  ON public.repair_requests FOR DELETE
  USING (
    auth.role() = 'authenticated' AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND organization_id = repair_requests.organization_id AND role = 'manager')
  );

-- PROGRESS LOGS
CREATE POLICY "Allow users to view logs for their requests"
  ON public.progress_logs FOR SELECT
  USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM public.repair_requests r
      WHERE r.id = progress_logs.request_id AND (
        r.organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
        r.assigned_vendor_id = (SELECT vendor_id FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Allow authenticated users to insert logs"
  ON public.progress_logs FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM public.repair_requests r
      WHERE r.id = progress_logs.request_id AND (
        r.organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
        r.assigned_vendor_id = (SELECT vendor_id FROM public.profiles WHERE id = auth.uid())
      )
    )
  );
