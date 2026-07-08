-- Create DELETE policy for public.progress_logs to allow authenticated managers and assigned vendors to delete progress logs of their requests
CREATE POLICY "Allow users to delete progress logs for their requests"
  ON public.progress_logs FOR DELETE
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
