-- =====================================================
-- TUGOL Admin Dashboard - Permissions & RLS Setup
-- =====================================================
-- This migration adds admin capabilities and proper RLS policies

-- 1. Add is_admin column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin) WHERE is_admin = TRUE;

-- 3. Drop existing RLS policies (if any) to recreate them
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

-- 4. Enable RLS on users table (if not already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for regular users
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
USING (auth.uid()::text = id);

CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
USING (auth.uid()::text = id);

-- 6. Create RLS policies for admins (can see and update ALL users)
CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND is_admin = TRUE
  )
);

CREATE POLICY "Admins can update all users"
ON public.users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND is_admin = TRUE
  )
);

-- 7. Create helper function to check admin status
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TEST DATA: Set current user as admin
-- =====================================================
-- IMPORTANT: Replace 'your-email@example.com' with actual admin email
-- Or use auth.uid() if you know the user ID

-- Option 1: Set admin by email (RECOMMENDED FOR TESTING)
-- UPDATE public.users
-- SET is_admin = TRUE
-- WHERE email = 'admin@tugol.com';

-- Option 2: Set admin by user ID (if you know the ID)
-- UPDATE public.users
-- SET is_admin = TRUE
-- WHERE id = 'your-user-id-here';

-- Option 3: Set first user as admin (USE WITH CAUTION)
UPDATE public.users
SET is_admin = TRUE
WHERE id = (SELECT id FROM public.users ORDER BY created_at ASC LIMIT 1);

-- =====================================================
-- Verification Queries
-- =====================================================
-- Check who is admin:
-- SELECT id, email, name, is_admin FROM public.users WHERE is_admin = TRUE;

-- Test admin function:
-- SELECT public.is_user_admin();

COMMENT ON COLUMN public.users.is_admin IS 'Admin flag - grants full access to admin dashboard';
COMMENT ON FUNCTION public.is_user_admin() IS 'Helper function to check if current user is admin';
