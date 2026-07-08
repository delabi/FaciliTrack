-- Create security definer helper to check superadmin status without recursion
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql;

-- Apply SuperAdmin override policies to all tables
CREATE POLICY "Allow superadmins to manage organizations" 
  ON public.organizations FOR ALL 
  USING (public.is_superadmin());

CREATE POLICY "Allow superadmins to manage facilities" 
  ON public.facilities FOR ALL 
  USING (public.is_superadmin());

CREATE POLICY "Allow superadmins to manage vendors" 
  ON public.vendors FOR ALL 
  USING (public.is_superadmin());

CREATE POLICY "Allow superadmins to manage profiles" 
  ON public.profiles FOR ALL 
  USING (public.is_superadmin());

CREATE POLICY "Allow superadmins to manage repair_requests" 
  ON public.repair_requests FOR ALL 
  USING (public.is_superadmin());

CREATE POLICY "Allow superadmins to manage progress_logs" 
  ON public.progress_logs FOR ALL 
  USING (public.is_superadmin());

CREATE POLICY "Allow superadmins to manage vendor_affiliations" 
  ON public.vendor_affiliations FOR ALL 
  USING (public.is_superadmin());

CREATE POLICY "Allow superadmins to manage vendor_invitations" 
  ON public.vendor_invitations FOR ALL 
  USING (public.is_superadmin());

CREATE POLICY "Allow superadmins to manage member_invitations" 
  ON public.member_invitations FOR ALL 
  USING (public.is_superadmin());
