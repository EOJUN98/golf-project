/**
 * SDD-09: Demo Accounts Setup
 *
 * Creates 8 demo accounts for testing different user roles and segments:
 * - 2 SUPER_ADMIN accounts
 * - 2 ADMIN accounts
 * - 4 Customer accounts with different segments (PRESTIGE, CHERRY, SMART, FUTURE)
 *
 * IMPORTANT: This is for DEMO/DEVELOPMENT purposes only.
 * These accounts should be removed before production deployment.
 */

-- ============================================================================
-- PART 1: Create Auth Users
-- ============================================================================

-- Note: You must create these users via Supabase Dashboard or Auth API
-- because auth.users table is managed by Supabase Auth.
-- This SQL provides the reference data for manual creation.

-- REFERENCE DATA FOR MANUAL AUTH USER CREATION:
-- ------------------------------------------------
-- 1. superadmin1@tugol.dev      (password: SuperAdmin123!)
-- 2. superadmin2@tugol.dev      (password: SuperAdmin123!)
-- 3. admin1@tugol.dev           (password: Admin123!)
-- 4. admin2@tugol.dev           (password: Admin123!)
-- 5. vip_user@tugol.dev         (password: VipUser123!)
-- 6. cherry_user@tugol.dev      (password: CherryUser123!)
-- 7. smart_user@tugol.dev       (password: SmartUser123!)
-- 8. normal_user@tugol.dev      (password: NormalUser123!)

-- ============================================================================
-- PART 2: Insert Demo Users into public.users
-- ============================================================================

-- NOTE: Replace the UUID placeholders below with actual auth.users UUIDs
-- after creating the accounts in Supabase Auth.

-- For now, we'll create a helper function to insert users with dummy UUIDs
-- and you can update them manually via Supabase Dashboard.

-- Demo SUPER_ADMIN accounts
INSERT INTO public.users (
  id,
  email,
  name,
  phone,
  segment,
  cherry_score,
  is_super_admin,
  is_admin,
  is_suspended,
  total_bookings,
  total_spent,
  avg_booking_value,
  no_show_count,
  visit_count,
  marketing_agreed,
  push_agreed,
  blacklisted
) VALUES
  -- SUPER_ADMIN 1
  (
    '00000000-0000-0000-0000-000000000001'::uuid, -- Replace with actual auth.users UUID
    'superadmin1@tugol.dev',
    '슈퍼관리자1',
    '010-0001-0001',
    'PRESTIGE',
    95,
    true,  -- is_super_admin
    false, -- is_admin (super_admin already has all permissions)
    false, -- is_suspended
    0,
    0,
    0,
    0,
    0,
    false,
    false,
    false
  ),
  -- SUPER_ADMIN 2
  (
    '00000000-0000-0000-0000-000000000002'::uuid, -- Replace with actual auth.users UUID
    'superadmin2@tugol.dev',
    '슈퍼관리자2',
    '010-0001-0002',
    'PRESTIGE',
    90,
    true,  -- is_super_admin
    false, -- is_admin
    false, -- is_suspended
    0,
    0,
    0,
    0,
    0,
    false,
    false,
    false
  )
ON CONFLICT (id) DO NOTHING;

-- Demo ADMIN accounts (not super admins, but will be club admins)
INSERT INTO public.users (
  id,
  email,
  name,
  phone,
  segment,
  cherry_score,
  is_super_admin,
  is_admin,
  is_suspended,
  total_bookings,
  total_spent,
  avg_booking_value,
  no_show_count,
  visit_count,
  marketing_agreed,
  push_agreed,
  blacklisted
) VALUES
  -- ADMIN 1 (will be club admin for Incheon Club 72)
  (
    '00000000-0000-0000-0000-000000000003'::uuid, -- Replace with actual auth.users UUID
    'admin1@tugol.dev',
    '관리자1',
    '010-0002-0001',
    'SMART',
    70,
    false, -- is_super_admin
    false, -- is_admin (will have club_admin role)
    false, -- is_suspended
    0,
    0,
    0,
    0,
    0,
    false,
    false,
    false
  ),
  -- ADMIN 2 (will be club admin for Incheon Club 72)
  (
    '00000000-0000-0000-0000-000000000004'::uuid, -- Replace with actual auth.users UUID
    'admin2@tugol.dev',
    '관리자2',
    '010-0002-0002',
    'SMART',
    65,
    false, -- is_super_admin
    false, -- is_admin
    false, -- is_suspended
    0,
    0,
    0,
    0,
    0,
    false,
    false,
    false
  )
ON CONFLICT (id) DO NOTHING;

-- Demo CUSTOMER accounts (different segments for pricing/CRM testing)
INSERT INTO public.users (
  id,
  email,
  name,
  phone,
  segment,
  cherry_score,
  is_super_admin,
  is_admin,
  is_suspended,
  total_bookings,
  total_spent,
  avg_booking_value,
  no_show_count,
  visit_count,
  marketing_agreed,
  push_agreed,
  blacklisted,
  location_lat,
  location_lng,
  location_address,
  distance_to_club_km
) VALUES
  -- VIP / PRESTIGE User (high value customer)
  (
    '00000000-0000-0000-0000-000000000005'::uuid, -- Replace with actual auth.users UUID
    'vip_user@tugol.dev',
    'VIP고객',
    '010-0003-0001',
    'PRESTIGE',
    100,
    false, -- is_super_admin
    false, -- is_admin
    false, -- is_suspended
    45,    -- total_bookings
    4500000, -- total_spent (4.5M KRW)
    100000,  -- avg_booking_value
    0,     -- no_show_count
    45,    -- visit_count
    true,  -- marketing_agreed
    true,  -- push_agreed
    false, -- blacklisted
    37.4563, -- location_lat (Seoul)
    126.7052, -- location_lng
    '서울시 강남구',
    null   -- distance_to_club_km (will be calculated on first booking)
  ),
  -- CHERRY User (cherry picker - looks for best deals)
  (
    '00000000-0000-0000-0000-000000000006'::uuid, -- Replace with actual auth.users UUID
    'cherry_user@tugol.dev',
    '체리픽커',
    '010-0003-0002',
    'CHERRY',
    35,
    false, -- is_super_admin
    false, -- is_admin
    false, -- is_suspended
    12,    -- total_bookings
    600000, -- total_spent (600K KRW)
    50000,  -- avg_booking_value (lower than average)
    1,     -- no_show_count (has 1 no-show)
    10,    -- visit_count (not all bookings resulted in visits)
    true,  -- marketing_agreed
    false, -- push_agreed
    false, -- blacklisted
    37.5665, -- location_lat (Seoul)
    126.9780, -- location_lng
    '서울시 중구',
    null
  ),
  -- SMART User (balanced, regular customer)
  (
    '00000000-0000-0000-0000-000000000007'::uuid, -- Replace with actual auth.users UUID
    'smart_user@tugol.dev',
    '스마트고객',
    '010-0003-0003',
    'SMART',
    75,
    false, -- is_super_admin
    false, -- is_admin
    false, -- is_suspended
    20,    -- total_bookings
    1800000, -- total_spent (1.8M KRW)
    90000,  -- avg_booking_value
    0,     -- no_show_count
    20,    -- visit_count
    true,  -- marketing_agreed
    true,  -- push_agreed
    false, -- blacklisted
    37.4979, -- location_lat (Incheon - close to club)
    126.7153, -- location_lng
    '인천시 연수구',
    5.2    -- distance_to_club_km (close to club, gets LBS discount)
  ),
  -- NORMAL / FUTURE User (new customer, not much history)
  (
    '00000000-0000-0000-0000-000000000008'::uuid, -- Replace with actual auth.users UUID
    'normal_user@tugol.dev',
    '일반고객',
    '010-0003-0004',
    'FUTURE',
    50,
    false, -- is_super_admin
    false, -- is_admin
    false, -- is_suspended
    3,     -- total_bookings
    270000, -- total_spent (270K KRW)
    90000,  -- avg_booking_value
    0,     -- no_show_count
    3,     -- visit_count
    false, -- marketing_agreed
    false, -- push_agreed
    false, -- blacklisted
    37.5642, -- location_lat (Seoul)
    126.9803, -- location_lng
    '서울시 성동구',
    null
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 3: Create Club Admin Assignments
-- ============================================================================

-- Assign admin1 and admin2 as club admins for Incheon Club 72 (golf_club_id = 1)
INSERT INTO public.club_admins (user_id, golf_club_id)
VALUES
  ('00000000-0000-0000-0000-000000000003'::uuid, 1), -- admin1
  ('00000000-0000-0000-0000-000000000004'::uuid, 1)  -- admin2
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 4: Add Comments for Documentation
-- ============================================================================

COMMENT ON TABLE public.users IS
'User profiles synchronized with auth.users.
Demo accounts (emails ending with @tugol.dev) are for development/testing only.';

-- ============================================================================
-- PART 5: Create Helper View for Demo Account Management
-- ============================================================================

CREATE OR REPLACE VIEW public.demo_accounts AS
SELECT
  id,
  email,
  name,
  segment,
  is_super_admin,
  CASE
    WHEN is_super_admin THEN 'SUPER_ADMIN'
    WHEN EXISTS (SELECT 1 FROM club_admins WHERE user_id = users.id) THEN 'CLUB_ADMIN'
    ELSE 'USER'
  END as role,
  is_suspended,
  total_bookings,
  total_spent,
  no_show_count
FROM public.users
WHERE email LIKE '%@tugol.dev'
ORDER BY
  CASE
    WHEN is_super_admin THEN 1
    WHEN EXISTS (SELECT 1 FROM club_admins WHERE user_id = users.id) THEN 2
    ELSE 3
  END,
  email;

COMMENT ON VIEW public.demo_accounts IS
'Helper view to see all demo accounts and their roles.
Run: SELECT * FROM demo_accounts;';

-- ============================================================================
-- Summary
-- ============================================================================

-- To complete the setup:
-- 1. Create auth users via Supabase Dashboard or Auth API
-- 2. Update the UUIDs in this migration with actual auth.users IDs
-- 3. Run this migration
-- 4. Verify with: SELECT * FROM demo_accounts;

-- To remove demo accounts before production:
-- DELETE FROM public.users WHERE email LIKE '%@tugol.dev';
