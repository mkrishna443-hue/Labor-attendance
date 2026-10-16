-- ====================================================================
-- SAMPLE SEED DATA FOR TESTING (OPTIONAL)
-- ====================================================================

-- 1. Insert Sample Construction Sites
INSERT INTO public.construction_sites (id, name, address, is_active)
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Metro Heights Tower B', 'Sector 42, Golf Course Road, Gurugram', true),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Skyline Commercial Park', 'Whitefield Main Road, Bengaluru', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Sample Laborers for Site A (Metro Heights Tower B)
INSERT INTO public.laborers (id, site_id, name, phone, category, daily_wage, is_active, photo_url)
VALUES
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Ramesh Kumar', '+91 98765 43210', 'Mason', 750.00, true, ''),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sunil Sharma', '+91 98765 43211', 'Helper', 500.00, true, ''),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Mukesh Yadav', '+91 98765 43212', 'Helper', 500.00, true, ''),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Mohammad Imran', '+91 98765 43213', 'Carpenter', 800.00, true, ''),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Deepak Verma', '+91 98765 43214', 'Electrician', 850.00, true, ''),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Rajesh Paswan', '+91 98765 43215', 'Plumber', 800.00, true, ''),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a07', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Gopal Mondal', '+91 98765 43216', 'Painter', 700.00, true, ''),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a08', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Vikram Singh', '+91 98765 43217', 'Bar Bender', 750.00, true, ''),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a09', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Santosh Pandit', '+91 98765 43218', 'Tile Worker', 850.00, true, ''),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Ajay Kumar', '+91 98765 43219', 'Helper', 500.00, true, '')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Sample Laborers for Site B (Skyline Commercial Park)
INSERT INTO public.laborers (id, site_id, name, phone, category, daily_wage, is_active, photo_url)
VALUES
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Manoj Gowda', '+91 98111 22233', 'Mason', 800.00, true, ''),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380b02', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Basavaraj Patil', '+91 98111 22234', 'Helper', 550.00, true, ''),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380b03', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Kiran Kumar', '+91 98111 22235', 'Electrician', 900.00, true, '')
ON CONFLICT (id) DO NOTHING;
