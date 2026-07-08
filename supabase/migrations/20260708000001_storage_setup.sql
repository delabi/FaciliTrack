-- ==========================================
-- STORAGE BUCKETS SETUP
-- ==========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Grant public upload and access to storage objects
CREATE POLICY "Allow public uploads to ticket-attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ticket-attachments');
CREATE POLICY "Allow public read from ticket-attachments" ON storage.objects FOR SELECT USING (bucket_id = 'ticket-attachments');
CREATE POLICY "Allow public updates to ticket-attachments" ON storage.objects FOR UPDATE USING (bucket_id = 'ticket-attachments');
CREATE POLICY "Allow public deletes from ticket-attachments" ON storage.objects FOR DELETE USING (bucket_id = 'ticket-attachments');
