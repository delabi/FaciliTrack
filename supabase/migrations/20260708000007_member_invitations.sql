-- ========================================================
-- Migration: Member Invitations System for Platform Managers/Vendors
-- ========================================================

-- 1. Create member invitations table (handles both managers and external invites)
CREATE TABLE IF NOT EXISTS public.member_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT CHECK (role IN ('manager', 'vendor', 'tenant')) NOT NULL DEFAULT 'manager',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.member_invitations ENABLE ROW LEVEL SECURITY;

-- 2. Define RLS Policies for member_invitations
CREATE POLICY "Allow select of member invitations for email owner or orgadmin"
  ON public.member_invitations FOR SELECT
  USING (
    public.is_superadmin() OR
    auth.role() = 'authenticated' AND (
      organization_id = public.get_user_org() OR
      email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Allow insert/delete of member invitations for orgadmin/superadmin"
  ON public.member_invitations FOR ALL
  USING (
    public.is_superadmin() OR
    public.is_orgadmin(organization_id)
  );

-- 3. Update handle_new_user trigger function to auto-consume member invitations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role text;
  v_org_id text;
  v_vendor_id text;
  v_invite_role text;
  v_invite_org text;
BEGIN
  -- Check for existing member invitation matching signup email
  SELECT role, organization_id INTO v_invite_role, v_invite_org
  FROM public.member_invitations
  WHERE email = new.email;

  -- Force email owner@facilitrack.com to be superadmin
  IF new.email = 'owner@facilitrack.com' THEN
    v_role := 'superadmin';
    v_org_id := 'org-4'; -- Default Lehigh Valley
  ELSIF v_invite_role IS NOT NULL THEN
    -- Consume the invitation
    v_role := v_invite_role;
    v_org_id := v_invite_org;
  ELSE
    -- Default signup options
    v_role := coalesce(new.raw_user_meta_data->>'role', 'tenant');
    v_org_id := coalesce(new.raw_user_meta_data->>'organization_id', 'org-4');
  END IF;

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

  -- Auto-link initial vendor affiliation if vendor profile is linked
  IF v_role = 'vendor' AND v_vendor_id IS NOT NULL THEN
    INSERT INTO public.vendor_affiliations (vendor_id, organization_id)
    VALUES (v_vendor_id, v_org_id)
    ON CONFLICT (vendor_id, organization_id) DO NOTHING;
  END IF;

  -- Clean up accepted invitation
  DELETE FROM public.member_invitations WHERE email = new.email;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
