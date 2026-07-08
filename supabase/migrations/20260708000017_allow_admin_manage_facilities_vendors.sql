-- Drop existing manager-only policies on facilities, vendors, and organizations
DROP POLICY IF EXISTS "Allow managers to manage facilities" ON public.facilities;
DROP POLICY IF EXISTS "Allow managers to manage vendors" ON public.vendors;
DROP POLICY IF EXISTS "Allow managers to update organizations" ON public.organizations;

-- Recreate policies to allow both admin and manager roles of the organization to manage/update them
CREATE POLICY "Allow admin and manager to manage facilities"
  ON public.facilities FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND organization_id = facilities.organization_id
        AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Allow admin and manager to manage vendors"
  ON public.vendors FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND organization_id = vendors.organization_id
        AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Allow admin and manager to update organizations"
  ON public.organizations FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND organization_id = organizations.id
        AND role IN ('admin', 'manager')
    )
  );
