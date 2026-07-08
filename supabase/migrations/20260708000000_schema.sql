-- ==========================================
-- FaciliTrack Database Schema & Seed Data
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  theme_color TEXT
);

-- 2. Create Facilities Table
CREATE TABLE IF NOT EXISTS facilities (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  qr_code_url TEXT
);

-- 3. Create Vendors Table
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE
);

-- 4. Create Profiles Table (for user personas)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY, -- Can map to text username or auth uuid
  organization_id TEXT REFERENCES organizations(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'manager', 'vendor', 'tenant')) NOT NULL,
  vendor_id TEXT REFERENCES vendors(id)
);

-- 5. Create Repair Requests Table
CREATE TABLE IF NOT EXISTS repair_requests (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id TEXT REFERENCES facilities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  urgency TEXT NOT NULL,
  status TEXT NOT NULL,
  reporter_name TEXT,
  reporter_contact TEXT,
  media_urls TEXT[] DEFAULT '{}',
  location_latitude NUMERIC,
  location_longitude NUMERIC,
  assigned_vendor_id TEXT REFERENCES vendors(id),
  completion_photo_url TEXT,
  receipt_url TEXT,
  cost NUMERIC,
  itemized_parts NUMERIC DEFAULT 0,
  itemized_labor NUMERIC DEFAULT 0,
  itemized_other NUMERIC DEFAULT 0,
  inspection_photo_urls TEXT[] DEFAULT '{}',
  inspection_notes TEXT,
  inspection_approved BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create Progress Logs Table
CREATE TABLE IF NOT EXISTS progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT REFERENCES repair_requests(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  updated_by TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_logs ENABLE ROW LEVEL SECURITY;

-- Simple permissive policies for developer sandboxing (can be tightened for production auth)
CREATE POLICY "Allow public read access to organizations" ON organizations FOR SELECT USING (true);
CREATE POLICY "Allow public write access to organizations" ON organizations FOR ALL USING (true);

CREATE POLICY "Allow public read access to facilities" ON facilities FOR SELECT USING (true);
CREATE POLICY "Allow public write access to facilities" ON facilities FOR ALL USING (true);

CREATE POLICY "Allow public read access to vendors" ON vendors FOR SELECT USING (true);
CREATE POLICY "Allow public write access to vendors" ON vendors FOR ALL USING (true);

CREATE POLICY "Allow public read access to profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Allow public write access to profiles" ON profiles FOR ALL USING (true);

CREATE POLICY "Allow public read access to repair_requests" ON repair_requests FOR SELECT USING (true);
CREATE POLICY "Allow public write access to repair_requests" ON repair_requests FOR ALL USING (true);

CREATE POLICY "Allow public read access to progress_logs" ON progress_logs FOR SELECT USING (true);
CREATE POLICY "Allow public write access to progress_logs" ON progress_logs FOR ALL USING (true);

-- ==========================================
-- SEED INITIAL MOCK DATA
-- ==========================================

-- Seed Organizations
INSERT INTO organizations (id, name, theme_color) VALUES
('org-4', 'Lehigh Valley Companion Care Homes', '#0e7490'),
('org-1', 'Community Homes', '#6366f1'),
('org-2', 'Apex Commercial Properties', '#3b82f6'),
('org-3', 'Delta Senior Living', '#10b981')
ON CONFLICT (id) DO NOTHING;

-- Seed Facilities
INSERT INTO facilities (id, organization_id, name, address, description, qr_code_url) VALUES
('fac-7', 'org-4', 'Imani House', '120 Imani Dr, Allentown, PA 18103', 'Residential group home with 6 client suites and full clinical amenities.', '/report?facilityId=fac-7&orgId=org-4'),
('fac-8', 'org-4', 'Pendo House', '450 Pendo Rd, Bethlehem, PA 18017', 'Assisted care house with outdoor gardens and wheel-chair layouts.', '/report?facilityId=fac-8&orgId=org-4'),
('fac-9', 'org-4', 'Baraka House', '80 Baraka Way, Easton, PA 18042', 'Group home for special needs therapy programs.', '/report?facilityId=fac-9&orgId=org-4'),
('fac-10', 'org-4', 'Shukrani House', '310 Shukrani Ln, Whitehall, PA 18052', 'Companion care housing duplex with central nursing hub.', '/report?facilityId=fac-10&orgId=org-4'),
('fac-11', 'org-4', 'Wema House', '15 Wema Blvd, Emmaus, PA 18049', 'Residential community cottage with shared lounge and kitchen areas.', '/report?facilityId=fac-11&orgId=org-4'),
('fac-12', 'org-4', 'Riziki House', '704 Riziki Pl, Macungie, PA 18062', 'Supported group residence consisting of 8 private bedrooms.', '/report?facilityId=fac-12&orgId=org-4'),
('fac-1', 'org-1', 'Greenwood Villa', '1428 Greenwood Ave, Suite A, Austin TX', 'Main community housing facility consisting of 24 family apartments and a communal recreation centre.', '/report?facilityId=fac-1&orgId=org-1'),
('fac-2', 'org-1', 'Sunset Care Home', '890 Sunset Blvd, Austin TX', 'Senior assisted living facility with 12 resident rooms, nursing station, and commercial kitchen.', '/report?facilityId=fac-2&orgId=org-1'),
('fac-3', 'org-1', 'Oakridge Suites', '105 Oakridge Dr, Austin TX', 'Modern duplex housing complex managed for temporary resident programs.', '/report?facilityId=fac-3&orgId=org-1'),
('fac-4', 'org-2', 'Apex Tower A', '500 Congress Ave, Tower A, Austin TX', '22-story commercial office building featuring tech tenant floors, elevators, and basement parking.', '/report?facilityId=fac-4&orgId=org-2'),
('fac-5', 'org-2', 'Apex Plaza Retail Center', '1122 Lamar Blvd, Austin TX', 'Multi-tenant commercial retail strip featuring restaurants, gym facilities, and convenience outlets.', '/report?facilityId=fac-5&orgId=org-2'),
('fac-6', 'org-3', 'Delta Pines Manor', '400 Pine Dr, Houston TX', 'Luxury retirement estate with independent cottages, central dining, and wellness club.', '/report?facilityId=fac-6&orgId=org-3')
ON CONFLICT (id) DO NOTHING;

-- Seed Vendors
INSERT INTO vendors (id, organization_id, name, specialty, email, phone, active) VALUES
('ven-7', 'org-4', 'Keystone Plumbing Solutions', 'Plumbing & Drainage', 'service@keystoneplumbing.com', '610-555-0143', true),
('ven-8', 'org-4', 'Lehigh Valley Heating & Air', 'HVAC Systems', 'hvac@lvheatingair.com', '610-555-0182', true),
('ven-1', 'org-1', 'FlowMaster Plumbing Services', 'Plumbing & Drainage', 'service@flowmaster.com', '512-555-0199', true),
('ven-2', 'org-1', 'Vortex Electrical & Power', 'Electrical Systems', 'service@vortexelectric.com', '512-555-0104', true),
('ven-3', 'org-1', 'Texan Climate & HVAC', 'HVAC Systems', 'hvac@texanclimate.com', '512-555-0163', true),
('ven-4', 'org-1', 'Apex Builders Group', 'Structural & Carpentry', 'contact@apexbuilders.com', '512-555-0122', true),
('ven-5', 'org-2', 'Titan Elevator & Lift', 'Elevator Services', 'service@titanelevator.com', '512-555-0111', true),
('ven-6', 'org-2', 'Capital Building Security', 'Access Controls & Security', 'service@capitalbuilding.com', '512-555-0155', true)
ON CONFLICT (id) DO NOTHING;

-- Seed Profiles (personas)
INSERT INTO profiles (id, organization_id, name, email, role, vendor_id) VALUES
('usr-12', 'org-4', 'Prisca Amos', 'prisca.a@lvcch.com', 'manager', NULL),
('usr-13', 'org-4', 'Cowboy Vazquez', 'cowboy.v@lvcch.com', 'manager', NULL),
('usr-14', 'org-4', 'Keystone Plumber (Tom)', 'service@keystoneplumbing.com', 'vendor', 'ven-7'),
('usr-15', 'org-4', 'LV HVAC Tech (Sarah)', 'hvac@lvheatingair.com', 'vendor', 'ven-8'),
('usr-16', 'org-4', 'Staff Nurse (Imani House)', 'nurse.imani@lvcch.com', 'tenant', NULL),
('usr-1', 'org-1', 'Alice Vance', 'alice@communityhomes.org', 'manager', NULL),
('usr-2', 'org-1', 'Bob Martinez', 'bob@communityhomes.org', 'manager', NULL),
('usr-3', 'org-1', 'Jack Fletcher (FlowMaster)', 'service@flowmaster.com', 'vendor', 'ven-1'),
('usr-4', 'org-1', 'Diana Prince (Vortex)', 'service@vortexelectric.com', 'vendor', 'ven-2'),
('usr-5', 'org-1', 'Resident Tenant A', 'tenant.a@communityhomes.org', 'tenant', NULL),
('usr-6', 'org-1', 'Resident Tenant B', 'tenant.b@communityhomes.org', 'tenant', NULL),
('usr-7', 'org-2', 'Charlie King', 'charlie@apexcommercial.com', 'manager', NULL),
('usr-8', 'org-2', 'David Elevator Tech (Titan)', 'service@titanelevator.com', 'vendor', 'ven-5'),
('usr-9', 'org-3', 'Elena Rostova', 'elena@deltasenior.com', 'manager', NULL),
('usr-10', 'org-3', 'Frank Miller', 'frank@deltasenior.com', 'manager', NULL)
ON CONFLICT (id) DO NOTHING;

-- Seed Initial Repair Request
INSERT INTO repair_requests (id, organization_id, facility_id, title, description, category, urgency, status, reporter_name, reporter_contact, media_urls, assigned_vendor_id, created_at) VALUES
('req-5', 'org-4', 'fac-7', 'Water Heater Malfunction in Main Kitchen', 'Imani House kitchen water heater is completely shut down. The clinical team cannot sanitize dishes or prep meals. Needs urgent dispatch.', 'plumbing', 'emergency', 'assigned', 'Prisca Amos', '610-555-0144', ARRAY['data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%232d3748"/><circle cx="200" cy="120" r="40" fill="%233182ce"/><path d="M200 40 L240 120 L160 120 Z" fill="%233182ce"/><text x="50%" y="220" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-size="16">Active Pipe Leak in Laundry Room</text></svg>'], 'ven-7', '2026-07-02 11:10:00+00')
ON CONFLICT (id) DO NOTHING;

-- Seed Progress Logs for Initial Request
INSERT INTO progress_logs (request_id, status, note, updated_by, timestamp) VALUES
('req-5', 'pending', 'Request logged by manager Prisca Amos.', 'Prisca Amos', '2026-07-02 11:10:00+00'),
('req-5', 'assigned', 'Assigned to Keystone Plumbing Solutions.', 'Cowboy Vazquez (Manager)', '2026-07-02 11:22:00+00');

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

