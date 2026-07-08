-- ========================================================
-- Migration: Seed Vendors
-- ========================================================

INSERT INTO public.vendors (id, organization_id, name, specialty, email, phone, active) VALUES
('ven-7', 'org-4', 'Keystone Plumbing Solutions', 'Plumbing & Drainage', 'service@keystoneplumbing.com', '610-555-0143', true),
('ven-8', 'org-4', 'Lehigh Valley Heating & Air', 'HVAC Systems', 'hvac@lvheatingair.com', '610-555-0182', true),
('ven-1', 'org-1', 'FlowMaster Plumbing Services', 'Plumbing & Drainage', 'service@flowmaster.com', '512-555-0199', true),
('ven-2', 'org-1', 'Vortex Electrical & Power', 'Electrical Systems', 'service@vortexelectric.com', '512-555-0104', true),
('ven-3', 'org-1', 'Texan Climate & HVAC', 'HVAC Systems', 'hvac@texanclimate.com', '512-555-0163', true),
('ven-4', 'org-1', 'Apex Builders Group', 'Structural & Carpentry', 'contact@apexbuilders.com', '512-555-0122', true),
('ven-5', 'org-2', 'Titan Elevator & Lift', 'Elevator Services', 'service@titanelevator.com', '512-555-0111', true),
('ven-6', 'org-2', 'Capital Building Security', 'Access Controls & Security', 'service@capitalbuilding.com', '512-555-0155', true)
ON CONFLICT (id) DO NOTHING;
