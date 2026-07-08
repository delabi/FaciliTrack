-- Add policy to allow anonymous/public select on member_invitations for signup checks
CREATE POLICY "Allow public select of member invitations for signup" 
  ON public.member_invitations FOR SELECT 
  TO public
  USING (true);
