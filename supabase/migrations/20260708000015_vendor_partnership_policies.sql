-- Allow vendors to manage their own affiliations
CREATE POLICY "Allow vendors to insert their own affiliations" 
  ON public.vendor_affiliations FOR INSERT 
  WITH CHECK (
    auth.role() = 'authenticated' AND
    vendor_id = public.get_user_vendor()
  );

CREATE POLICY "Allow vendors to delete their own affiliations" 
  ON public.vendor_affiliations FOR DELETE 
  USING (
    auth.role() = 'authenticated' AND
    vendor_id = public.get_user_vendor()
  );

-- Allow vendors to update the status of their own invitations (accept/decline)
CREATE POLICY "Allow vendors to update their own invitation status" 
  ON public.vendor_invitations FOR UPDATE 
  USING (
    auth.role() = 'authenticated' AND
    email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    email = (SELECT email FROM public.profiles WHERE id = auth.uid()) AND
    status IN ('accepted', 'declined', 'pending')
  );
