-- Fix public.handle_new_user() trigger function to remove non-existent 'org-4' fallback for organization_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role text;
  v_org_id text;
BEGIN
  -- Check if there's a pending invitation for this email
  SELECT role, organization_id INTO v_role, v_org_id
  FROM public.member_invitations
  WHERE email = new.email
  LIMIT 1;

  -- Fallback to metadata if no invitation found
  IF v_role IS NULL THEN
    v_role := coalesce(new.raw_user_meta_data->>'role', 'tenant');
  END IF;
  IF v_org_id IS NULL THEN
    v_org_id := new.raw_user_meta_data->>'organization_id'; -- No default 'org-4' fallback to prevent foreign key violations
  END IF;

  INSERT INTO public.profiles (id, name, email, role, organization_id, vendor_id)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'New User'),
    new.email,
    v_role,
    v_org_id,
    new.raw_user_meta_data->>'vendor_id'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
