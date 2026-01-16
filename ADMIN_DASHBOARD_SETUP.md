# TUGOL Admin Dashboard - Implementation Guide

## Overview

This guide covers the complete admin dashboard implementation with user segment management, RLS (Row Level Security) policies, and admin permission controls.

## What's Been Implemented

### 1. Database Layer
- ✅ `is_admin` column added to `users` table
- ✅ RLS policies for admin-only access
- ✅ Helper function `is_user_admin()` for permission checks
- ✅ Proper indexing for performance

### 2. Admin Layout
- ✅ Sidebar navigation with icons
- ✅ Protected routes (admin-only access)
- ✅ Client-side auth check with loading state
- ✅ Logout functionality

### 3. User Management Page
- ✅ Full user listing with pagination support
- ✅ Search by email/name/phone
- ✅ Filter by segment (FUTURE, SMART, CHERRY, PRESTIGE)
- ✅ Real-time segment updates
- ✅ Blacklist/unblacklist users
- ✅ Grant/revoke admin permissions
- ✅ View user statistics (bookings, spending, no-shows)
- ✅ Segment distribution summary

### 4. TypeScript Types
- ✅ Updated `database.ts` with `is_admin` field
- ✅ Fixed all mock user objects across the codebase

## Installation Steps

### Step 1: Run Database Migration

You have **3 options** to run the migration:

#### Option A: Supabase Dashboard (Recommended for Testing)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20260115_admin_permissions.sql`
4. Run the query
5. **IMPORTANT:** Update the admin user email at the bottom of the migration:

```sql
-- Change this line to your actual admin email:
UPDATE public.users
SET is_admin = TRUE
WHERE email = 'YOUR_EMAIL_HERE@example.com';
```

#### Option B: Supabase CLI

```bash
# Make sure you're in the project directory
cd /Users/mybook/Desktop/tugol-app-main

# Run the migration
supabase db push
```

#### Option C: Manual SQL Execution

Run these queries in order:

```sql
-- 1. Add is_admin column
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Create index
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin) WHERE is_admin = TRUE;

-- 3. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Create admin policies (see migration file for full policies)

-- 5. Set yourself as admin
UPDATE public.users
SET is_admin = TRUE
WHERE email = 'your@email.com';
```

### Step 2: Verify Database Changes

Run these queries to verify:

```sql
-- Check if is_admin column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'is_admin';

-- Check who is admin
SELECT id, email, name, is_admin
FROM public.users
WHERE is_admin = TRUE;

-- Test helper function
SELECT public.is_user_admin();
```

### Step 3: Test the Admin Dashboard

1. **Start the development server:**

```bash
npm run dev
```

2. **Log in with your admin account** (the email you set in the migration)

3. **Access the admin dashboard:**

```
http://localhost:3000/admin
```

4. **Test the user management page:**

```
http://localhost:3000/admin/users
```

### Step 4: Test Features

- [ ] Can access `/admin` route (should redirect to `/` if not admin)
- [ ] Can view all users in the user management page
- [ ] Can search users by email/name
- [ ] Can filter users by segment
- [ ] Can change user segment (dropdown updates immediately)
- [ ] Can blacklist/unblacklist users (with reason prompt)
- [ ] Can grant/revoke admin permissions
- [ ] Can view user statistics accurately

## File Structure

```
tugol-app-main/
├── supabase/
│   └── migrations/
│       └── 20260115_admin_permissions.sql    [NEW] SQL migration
├── app/
│   └── admin/
│       ├── layout.tsx                         [NEW] Admin layout with sidebar
│       ├── page.tsx                           [EXISTING] Dashboard overview
│       └── users/
│           └── page.tsx                       [NEW] User management
├── types/
│   └── database.ts                            [UPDATED] Added is_admin field
├── utils/
│   └── supabase/
│       └── queries.ts                         [UPDATED] Mock user with is_admin
└── app/api/
    └── pricing/
        └── route.ts                           [UPDATED] Mock user with is_admin
```

## Features Breakdown

### Admin Layout (`app/admin/layout.tsx`)

**Key Features:**
- Client-side authentication check
- Automatic redirect for non-admin users
- Sidebar navigation with icons
- Logout button with auth cleanup

**Navigation Links:**
- 대시보드 (Dashboard)
- 회원 관리 (User Management)
- 티타임 관리 (Tee Time Management) - Coming soon
- 설정 (Settings) - Coming soon

### User Management Page (`app/admin/users/page.tsx`)

**User Actions:**
1. **Change Segment:**
   - Dropdown selector for each user
   - Instant update on selection
   - Marks as "manually set" with `segment_override_by: 'ADMIN'`

2. **Blacklist User:**
   - Click "차단" button
   - Prompt for reason
   - Updates `blacklisted`, `blacklist_reason`, `blacklisted_at`, `blacklisted_by`

3. **Grant Admin:**
   - Click "관리자 설정" button
   - Confirmation dialog
   - Updates `is_admin` field

**Display Features:**
- User info card with avatar, email, phone
- Current segment badge with icon
- Cherry score with trophy icon
- Statistics: total bookings, spending, no-shows
- Warning indicators for problematic users
- Join date

**Filters:**
- Search by email, name, or phone
- Filter by segment (ALL, FUTURE, SMART, CHERRY, PRESTIGE)
- Filter by status (ALL, BLACKLISTED, ACTIVE) - Coming soon

**Summary Stats:**
- Count of users per segment
- Color-coded segment cards
- Visual segment icons

## Security Features

### Row Level Security (RLS)

**User Policies:**
```sql
-- Users can only see their own profile
CREATE POLICY "Users can view their own profile"
ON public.users FOR SELECT
USING (auth.uid()::text = id);

-- Admins can see all users
CREATE POLICY "Admins can view all users"
ON public.users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND is_admin = TRUE
  )
);
```

**Benefits:**
- Database-level security (can't be bypassed by client code)
- Admin users see all rows
- Regular users only see their own row
- No additional auth checks needed in API routes

### Admin Check Flow

```
User loads /admin
  ↓
Layout checks auth.getSession()
  ↓
Query users table for is_admin (RLS enforced)
  ↓
If not admin or no session → redirect to /
  ↓
If admin → show dashboard
```

## API Integration

### Supabase Type Casting

Due to Supabase's strict typing, we use type casting for complex update operations:

```typescript
// ❌ TypeScript error (strict Supabase types)
await supabase
  .from('users')
  .update({ segment: newSegment })
  .eq('id', userId);

// ✅ Works (type casting)
await (supabase as any)
  .from('users')
  .update({ segment: newSegment })
  .eq('id', userId);
```

This is safe because:
- Types are validated at the database level (PostgreSQL)
- We have comprehensive TypeScript types in `database.ts`
- RLS policies enforce proper access control

## Troubleshooting

### Issue: Can't access `/admin` route

**Causes:**
1. User not set as admin in database
2. RLS policies not applied
3. Auth session expired

**Solutions:**
```sql
-- Check if user is admin
SELECT email, is_admin FROM public.users WHERE email = 'your@email.com';

-- Set user as admin if needed
UPDATE public.users SET is_admin = TRUE WHERE email = 'your@email.com';

-- Check RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'users';
```

### Issue: Can't see other users in user management

**Causes:**
1. RLS policies not created correctly
2. Admin check failing

**Solutions:**
```sql
-- Drop and recreate admin policies
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

CREATE POLICY "Admins can view all users"
ON public.users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND is_admin = TRUE
  )
);
```

### Issue: TypeScript errors about `is_admin`

**Cause:** Database types not updated

**Solution:**
```bash
# Regenerate Supabase types (if using Supabase CLI)
supabase gen types typescript --local > types/database.ts

# Or manually verify types/database.ts includes:
# users: { Row: { is_admin: boolean; ... } }
```

### Issue: Build fails with mock user errors

**Cause:** Mock users missing `is_admin` field

**Solution:** Check these files have `is_admin: false` in mock users:
- `app/api/pricing/route.ts`
- `utils/supabase/queries.ts`

## Future Enhancements

### Phase 2: Advanced Filtering
- [ ] Filter by blacklist status
- [ ] Date range filters (join date, last visit)
- [ ] Multi-segment filter
- [ ] Sort by various fields

### Phase 3: Bulk Operations
- [ ] Bulk segment changes
- [ ] Export user data (CSV)
- [ ] Bulk notifications

### Phase 4: Analytics
- [ ] User growth charts
- [ ] Segment distribution over time
- [ ] Revenue by segment
- [ ] Churn analysis

### Phase 5: Activity Logs
- [ ] Track all admin actions
- [ ] Audit trail for segment changes
- [ ] Blacklist history
- [ ] Admin permission changes log

## Code Examples

### Example: Manually Check Admin Status in API Route

```typescript
// app/api/some-admin-route/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  // Get session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if admin (RLS will enforce this query)
  const { data: user } = await (supabase as any)
    .from('users')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();

  if (!user?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Admin-only logic here
  return NextResponse.json({ message: 'Admin access granted' });
}
```

### Example: Using the Helper Function

```typescript
// Call the PostgreSQL function
const { data: isAdmin, error } = await supabase.rpc('is_user_admin');

if (error || !isAdmin) {
  // Not admin
  return;
}

// Admin logic here
```

## Best Practices

1. **Always use RLS policies** for database-level security
2. **Type cast Supabase operations** when necessary (`as any`)
3. **Check admin status on both client and server** for better UX
4. **Log all admin actions** for audit trails (future enhancement)
5. **Use optimistic UI updates** for instant feedback
6. **Always provide confirmation dialogs** for destructive actions
7. **Use descriptive commit messages** when changing admin permissions

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify database migration was successful
3. Check browser console for error messages
4. Verify RLS policies in Supabase Dashboard

---

**Implementation Date:** 2026-01-15
**Version:** 1.0
**Build Status:** ✅ SUCCESS
**TypeScript Errors:** 0
