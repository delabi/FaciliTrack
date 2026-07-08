-- Add policy to allow anonymous/public delete on member_invitations for signup consumption
CREATE POLICY "Allow public delete of member invitations for signup" 
  ON public.member_invitations FOR DELETE 
  TO public
  USING (true);
