-- ========================================================
-- Migration: Evolve into B2B Platform (SuperAdmin, OrgAdmin, Vendor Affiliations)
-- ========================================================

-- 1. Modify profiles role check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('superadmin', 'admin', 'manager', 'vendor', 'tenant'));

-- 2. Create Vendor Affiliations Table
CREATE TABLE IF NOT EXISTS public.vendor_affiliations (
  vendor_id TEXT REFERENCES public.vendors(id) ON DELETE CASCADE,
  organization_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (vendor_id, organization_id)
);

-- 3. Create Vendor Invitations Table
CREATE TABLE IF NOT EXISTS public.vendor_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Enable RLS
ALTER TABLE public.vendor_affiliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_invitations ENABLE ROW LEVEL SECURITY;

-- 5. Helper Function to Check if User is SuperAdmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin');
$$ LANGUAGE sql SECURITY DEFINER;

-- 6. Helper Function to Check if User is OrgAdmin
CREATE OR REPLACE FUNCTION public.is_orgadmin(org_id text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin' AND organization_id = org_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 7. Update handle_new_user trigger function to support superadmin/admin roles and initial affiliations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role text;
  v_org_id text;
  v_vendor_id text;
BEGIN
  v_role := coalesce(new.raw_user_meta_data->>'role', 'tenant');
  
  -- Force email owner@facilitrack.com to be superadmin
  IF new.email = 'owner@facilitrack.com' THEN
    v_role := 'superadmin';
  END IF;

  v_org_id := coalesce(new.raw_user_meta_data->>'organization_id', 'org-4');
  v_vendor_id := new.raw_user_meta_data->>'vendor_id';

  INSERT INTO public.profiles (id, name, email, role, organization_id, vendor_id)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'New User'),
    new.email,
    v_role,
    v_org_id,
    v_vendor_id
  );

  -- Auto-link initial vendor affiliation
  IF v_role = 'vendor' AND v_vendor_id IS NOT NULL THEN
    INSERT INTO public.vendor_affiliations (vendor_id, organization_id)
    VALUES (v_vendor_id, v_org_id)
    ON CONFLICT (vendor_id, organization_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Add RLS Policies for New Tables

-- VENDOR AFFILIATIONS POLICIES
CREATE POLICY "Allow select of vendor affiliations"
  ON public.vendor_affiliations FOR SELECT
  USING (
    public.is_superadmin() OR
    auth.role() = 'authenticated' AND (
      organization_id = public.get_user_org() OR
      vendor_id = public.get_user_vendor()
    )
  );

CREATE POLICY "Allow insert/delete of vendor affiliations for orgadmin/superadmin"
  ON public.vendor_affiliations FOR ALL
  USING (
    public.is_superadmin() OR
    public.is_orgadmin(organization_id)
  );

-- VENDOR INVITATIONS POLICIES
CREATE POLICY "Allow select of vendor invitations"
  ON public.vendor_invitations FOR SELECT
  USING (
    public.is_superadmin() OR
    auth.role() = 'authenticated' AND (
      organization_id = public.get_user_org() OR
      email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Allow manage of vendor invitations for orgadmin/superadmin"
  ON public.vendor_invitations FOR ALL
  USING (
    public.is_superadmin() OR
    public.is_orgadmin(organization_id)
  );

-- 9. Secure Existing Tables for SuperAdmin Bypass and OrgAdmin Manage

-- Profiles UPDATE policy for OrgAdmins (can edit members of their org)
CREATE POLICY "Allow orgadmin to update profiles in their organization"
  ON public.profiles FOR UPDATE
  USING (
    public.is_superadmin() OR
    public.is_orgadmin(organization_id)
  )
  WITH CHECK (
    public.is_superadmin() OR
    public.is_orgadmin(organization_id)
  );

-- Organizations SELECT policy for SuperAdmins
DROP POLICY IF EXISTS "Allow public select of organizations for signup" ON public.organizations;
CREATE POLICY "Allow public select of organizations"
  ON public.organizations FOR SELECT
  USING (true);

-- Allow public insertion to organizations (so users can register organizations during sign-up)
CREATE POLICY "Allow public insert of organizations for registration"
  ON public.organizations FOR INSERT
  WITH CHECK (true);
