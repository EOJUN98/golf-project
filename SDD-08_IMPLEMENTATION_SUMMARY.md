# SDD-08: Supabase Auth Integration - Implementation Summary

**Date**: 2026-01-17
**Status**: ✅ Completed
**Dependencies**: SDD-01 through SDD-07

---

## Executive Summary

SDD-08 successfully integrates Supabase Auth with the TUGOL golf reservation platform, replacing all hardcoded admin user IDs with session-based authentication. This implementation provides:

- **Secure Authentication**: Email/password + OAuth (Kakao) login via Supabase Auth
- **Role-Based Access Control**: SUPER_ADMIN, ADMIN, CLUB_ADMIN, and USER roles
- **Protected Admin Routes**: Middleware and server-side guards for `/admin` paths
- **Session Management**: Cookie-based sessions with automatic refresh
- **Audit Trail**: All admin actions now tracked with real user IDs

---

## Architecture Overview

### Authentication Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. Login (email/password)
       ▼
┌─────────────────────┐
│  Supabase Auth API  │
└──────┬──────────────┘
       │ 2. Set session cookie
       ▼
┌─────────────────────┐
│  Next.js Middleware │  ← Check auth on every request
└──────┬──────────────┘
       │ 3. Allow/Redirect
       ▼
┌─────────────────────┐
│  Server Components  │  ← Call getCurrentUserWithRoles()
└──────┬──────────────┘
       │ 4. Check permissions
       ▼
┌─────────────────────┐
│  Server Actions     │  ← Enforce role-based access
└─────────────────────┘
```

### Role Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│ SUPER_ADMIN                                                  │
│ ├─ All admin permissions                                    │
│ ├─ Can LOCK settlements                                     │
│ └─ Full access to all golf clubs                            │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ ADMIN                                                        │
│ ├─ Most admin permissions                                   │
│ ├─ Cannot LOCK settlements                                  │
│ └─ Full access to all golf clubs                            │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ CLUB_ADMIN                                                   │
│ ├─ Limited admin permissions                                │
│ ├─ Can manage reservations and tee times                    │
│ ├─ Cannot unsuspend users                                   │
│ └─ Access restricted to assigned golf clubs only            │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ USER (Regular)                                               │
│ ├─ Can view and book tee times                              │
│ ├─ Can manage own reservations                              │
│ └─ No admin access                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Supabase Client Configuration

#### Server-Side Client ([lib/supabase/server.ts](lib/supabase/server.ts:1))

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}
```

**Key Features**:
- Uses Next.js 16 async `cookies()` API
- Automatic session refresh on requests
- Integrates with Next.js server components

#### Client-Side Client ([lib/supabase/client.ts](lib/supabase/client.ts:1))

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClientSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export const supabaseClient = createClientSupabaseClient();
```

**Usage**: Client components (logout, real-time subscriptions, etc.)

---

### 2. Authentication Helpers

#### Main Helper: [lib/auth/getCurrentUserWithRoles.ts](lib/auth/getCurrentUserWithRoles.ts:1)

```typescript
export interface UserWithRoles {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isClubAdmin: boolean;
  isSuspended: boolean;
  clubIds: number[];
  rawUser: User | null;
}

export async function getCurrentUserWithRoles(): Promise<UserWithRoles | null>
```

**Process**:
1. Get authenticated user from session (`auth.getUser()`)
2. Fetch user details from `public.users` table
3. Fetch club admin assignments from `club_admins` table
4. Return enriched user object with all role flags

**Helper Functions**:
- `requireAdminAccess()` - Throws if not SUPER_ADMIN/ADMIN
- `requireSuperAdminAccess()` - Throws if not SUPER_ADMIN
- `requireClubAccess(golfClubId)` - Checks club-specific access
- `getCurrentUserId()` - Convenience function for just the ID

---

### 3. Middleware Protection

#### [middleware.ts](middleware.ts:1)

```typescript
export async function middleware(request: NextRequest) {
  // Create Supabase client with middleware cookie handling
  const supabase = createServerClient(...);

  const { data: { user } } = await supabase.auth.getUser();

  // Protect /admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      // Not logged in → redirect to login
      return NextResponse.redirect(new URL('/login?redirect=/admin', request.url));
    }

    // Check admin permissions
    const { data: userData } = await supabase
      .from('users')
      .select('is_super_admin, is_suspended')
      .eq('id', user.id)
      .single();

    const { data: clubAdmins } = await supabase
      .from('club_admins')
      .select('golf_club_id')
      .eq('user_id', user.id);

    const hasAdminAccess = userData?.is_super_admin || (clubAdmins && clubAdmins.length > 0);

    if (!hasAdminAccess) {
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }

    if (userData?.is_suspended) {
      return NextResponse.redirect(new URL('/suspended', request.url));
    }
  }

  return response;
}
```

**Features**:
- Runs on every request matching the pattern
- Fast permission check (2 simple queries)
- Redirects to appropriate error pages

---

### 4. Admin Layout Protection

#### Server Component Guard ([app/admin/layout.tsx](app/admin/layout.tsx:1))

```typescript
export default async function AdminLayout({ children }) {
  const user = await getCurrentUserWithRoles();

  if (!user) {
    redirect('/login?redirect=/admin');
  }

  if (!user.isSuperAdmin && !user.isAdmin && !user.isClubAdmin) {
    redirect('/forbidden');
  }

  if (user.isSuspended) {
    redirect('/suspended');
  }

  return <AdminLayoutClient user={user}>{children}</AdminLayoutClient>;
}
```

**Defense in Depth**: Double-check even after middleware (middleware can be bypassed in some edge cases)

---

### 5. Server Actions Refactoring

All server actions updated to use session-based auth instead of `admin_user_id` parameter.

#### Settlement Actions ([app/admin/settlements/actions.ts](app/admin/settlements/actions.ts:1))

**Before (SDD-07)**:
```typescript
export async function createSettlement(request: CreateSettlementRequest) {
  const { golf_club_id, admin_user_id, ... } = request;

  const permissions = await checkSettlementPermissions(admin_user_id);
  // ...
}
```

**After (SDD-08)**:
```typescript
export async function createSettlement(request: CreateSettlementRequest) {
  const { golf_club_id, ... } = request; // No admin_user_id!

  // Get current session user
  let currentUser;
  try {
    currentUser = await requireClubAccess(golf_club_id);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  // Use currentUser.id for audit trail
  await supabase.from('settlements').insert({
    ...
    created_by_user_id: currentUser.id
  });
}
```

**Changed Functions**:
- `previewSettlement()` - Removed `admin_user_id` param
- `createSettlement()` - Removed `admin_user_id`, uses `currentUser.id`
- `updateSettlementStatus()` - Removed `admin_user_id`, uses `currentUser.id`
- `updateSettlementNotes()` - Removed `admin_user_id`

#### Admin Actions ([app/admin/actions.ts](app/admin/actions.ts:1))

**Changed Functions**:
- `markReservationAsNoShow()` - Now gets user from session
- `unsuspendUser()` - Now gets user from session, blocks CLUB_ADMIN
- `bulkUnsuspendExpiredUsers()` - Now gets user from session
- `getAdminDashboardStats()` - Now gets user from session

#### Tee Times Actions ([app/admin/tee-times/actions.ts](app/admin/tee-times/actions.ts:1))

**Changed Functions**:
- `getUserRole()` - Now uses `getCurrentUserWithRoles()` instead of manual queries
- All other actions automatically benefit from updated helper

---

### 6. Type System Updates

All request types updated to remove `admin_user_id` parameter.

#### Settlement Types ([types/settlement.ts](types/settlement.ts:1))

```typescript
// Before
export interface PreviewSettlementRequest {
  golf_club_id: number;
  period_start: string;
  period_end: string;
  config?: Partial<SettlementConfig>;
  admin_user_id: string; // ❌ REMOVED
}

// After
export interface PreviewSettlementRequest {
  golf_club_id: number;
  period_start: string;
  period_end: string;
  config?: Partial<SettlementConfig>;
  // admin_user_id removed - uses session
}
```

**Updated Types**:
- `PreviewSettlementRequest`
- `CreateSettlementRequest`
- `UpdateSettlementStatusRequest`
- `UpdateSettlementNotesRequest`
- `MarkNoShowRequest`
- `UnsuspendUserRequest`

---

### 7. User Interface Components

#### Global Header ([components/Header.tsx](components/Header.tsx:1) + [HeaderClient.tsx](components/HeaderClient.tsx:1))

**Server Component**:
```typescript
export default async function Header() {
  const user = await getCurrentUserWithRoles();
  return <HeaderClient user={user} />;
}
```

**Client Component Features**:
- Shows login button if not authenticated
- Shows "내 예약" (My Reservations) link for logged-in users
- Shows "Admin" button for SUPER_ADMIN/ADMIN/CLUB_ADMIN
- Shows user name/email and role badge
- Logout button with session cleanup

#### Admin Layout Client ([components/admin/AdminLayoutClient.tsx](components/admin/AdminLayoutClient.tsx:1))

**Features**:
- Displays user info and role badge in sidebar
- Navigation menu with role-specific links
- Shows accessible features based on permissions
- Logout button

#### Error Pages

**[app/forbidden/page.tsx](app/forbidden/page.tsx:1)**:
- Displayed when user lacks admin permissions
- Clear messaging
- Links to login and home page

**[app/suspended/page.tsx](app/suspended/page.tsx:1)**:
- Displayed when suspended user tries to access system
- Shows suspension details (reason, dates)
- Contact information for appeals

#### Login/Signup ([app/login/page.tsx](app/login/page.tsx:1) + [actions.ts](app/login/actions.ts:1))

**Features**:
- Email/password authentication
- Kakao OAuth integration
- User registration with name and phone
- Redirect back to intended page after login
- Error handling and messaging

---

### 8. RLS Policy Updates

#### Migration: [20260117_sdd08_rls_auth_consistency.sql](supabase/migrations/20260117_sdd08_rls_auth_consistency.sql:1)

**Key Principles**:
1. **Regular Users**: Access controlled by RLS policies using `auth.uid()`
2. **Admins**: Use `SERVICE_ROLE_KEY` to bypass RLS entirely
3. **Consistency**: `public.users.id` MUST match `auth.users.id`

**RLS Policies Created**:

**Reservations**:
```sql
-- Users can view own reservations
CREATE POLICY "Users can view own reservations"
ON public.reservations FOR SELECT
USING (auth.uid()::text = user_id);

-- Users can insert own reservations
CREATE POLICY "Users can insert own reservations"
ON public.reservations FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Users can update own reservations for cancellation
CREATE POLICY "Users can update own reservations for cancellation"
ON public.reservations FOR UPDATE
USING (
  auth.uid()::text = user_id
  AND status IN ('PENDING', 'PAID')
);
```

**Users**:
```sql
-- Users can view own profile
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
USING (auth.uid()::text = id);

-- Users can update own profile (prevent privilege escalation)
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (auth.uid()::text = id)
WITH CHECK (
  auth.uid()::text = id
  AND is_super_admin = (SELECT is_super_admin FROM public.users WHERE id = auth.uid()::text)
  AND is_suspended = (SELECT is_suspended FROM public.users WHERE id = auth.uid()::text)
);
```

**Tee Times**:
```sql
-- Anyone can view tee times (public access)
CREATE POLICY "Anyone can view tee times"
ON public.tee_times FOR SELECT
USING (true);
```

**Settlements**:
- No RLS policies = admin-only access via SERVICE_ROLE_KEY

**Club Admins**:
```sql
-- Users can view own club admin assignments
CREATE POLICY "Users can view own club admin assignments"
ON public.club_admins FOR SELECT
USING (auth.uid()::text = user_id);
```

**Helper Function**:
```sql
CREATE OR REPLACE FUNCTION public.can_user_book_v2()
RETURNS boolean
AS $$
DECLARE
  v_user_id text;
  v_is_suspended boolean;
BEGIN
  v_user_id := auth.uid()::text;

  IF v_user_id IS NULL THEN
    RETURN false; -- Not authenticated
  END IF;

  SELECT is_suspended INTO v_is_suspended
  FROM public.users
  WHERE id = v_user_id;

  RETURN NOT COALESCE(v_is_suspended, true);
END;
$$;
```

---

## Database Schema Assumptions

### User ID Consistency

**Critical Requirement**: `public.users.id` MUST equal `auth.users.id`

**Enforcement**:
1. User creation triggered by `auth.users` INSERT
2. Never manually create users in `public.users` without auth
3. Foreign keys reference `users(id)` which maps to auth UID

**Verification Query**:
```sql
-- Check if all auth users have matching public.users records
SELECT
  auth.users.id,
  auth.users.email,
  public.users.id AS public_user_id
FROM auth.users
LEFT JOIN public.users ON auth.users.id = public.users.id
WHERE public.users.id IS NULL; -- Should return 0 rows
```

---

## QA Test Scenarios

### Scenario 1: Unauthenticated User Access

**Steps**:
1. Open browser in incognito mode
2. Navigate to `/admin`

**Expected Result**:
- ✅ Redirected to `/login?redirect=/admin`
- ✅ Login form displayed
- ✅ After login, redirected back to `/admin`

**Implementation**:
- Middleware: [middleware.ts:53-56](middleware.ts:53-56)
- Admin Layout: [app/admin/layout.tsx:20-22](app/admin/layout.tsx:20-22)

---

### Scenario 2: Regular User Access to Admin

**Steps**:
1. Login as regular user (no admin roles)
2. Navigate to `/admin`

**Expected Result**:
- ✅ Redirected to `/forbidden`
- ✅ Error page shows "접근 권한 없음"
- ✅ Links to return home or login with different account

**Implementation**:
- Middleware: [middleware.ts:69-71](middleware.ts:69-71)
- Admin Layout: [app/admin/layout.tsx:25-27](app/admin/layout.tsx:25-27)
- Forbidden Page: [app/forbidden/page.tsx](app/forbidden/page.tsx:1)

---

### Scenario 3: SUPER_ADMIN Full Access

**Steps**:
1. Login as user with `is_super_admin = true`
2. Navigate to `/admin`
3. Navigate to `/admin/settlements`
4. Create a settlement
5. Confirm the settlement
6. Lock the settlement

**Expected Result**:
- ✅ Can access all admin pages
- ✅ Can create settlements
- ✅ Can confirm settlements
- ✅ Can lock settlements (only SUPER_ADMIN)
- ✅ `created_by_user_id`, `confirmed_by_user_id`, `locked_by_user_id` recorded correctly

**Implementation**:
- Permission Check: [lib/auth/getCurrentUserWithRoles.ts:53-61](lib/auth/getCurrentUserWithRoles.ts:53-61)
- Lock Permission: [app/admin/settlements/actions.ts:348-356](app/admin/settlements/actions.ts:348-356)

---

### Scenario 4: CLUB_ADMIN Limited Access

**Steps**:
1. Create user with entry in `club_admins` table for `golf_club_id = 1`
2. Login as this user
3. Navigate to `/admin`
4. Try to access settlements for `golf_club_id = 1`
5. Try to access settlements for `golf_club_id = 2`
6. Try to lock a settlement

**Expected Result**:
- ✅ Can access `/admin`
- ✅ Can view/create settlements for `golf_club_id = 1`
- ❌ Cannot access settlements for `golf_club_id = 2`
- ❌ Cannot lock settlements (permission denied)

**Implementation**:
- Club Access Check: [lib/auth/getCurrentUserWithRoles.ts:118-132](lib/auth/getCurrentUserWithRoles.ts:118-132)
- Settlement Actions: [app/admin/settlements/actions.ts:190-199](app/admin/settlements/actions.ts:190-199)

---

### Scenario 5: Settlement Creation Audit Trail

**Setup**:
1. Login as admin user (e.g., `user-123`)

**Steps**:
1. Create settlement for January 2026
2. Query database: `SELECT created_by_user_id FROM settlements WHERE id = ?`

**Expected Result**:
- ✅ `created_by_user_id` = `user-123` (actual session user ID)
- ❌ NOT `'admin-user-id'` (hardcoded value)

**Implementation**:
- Settlement Creation: [app/admin/settlements/actions.ts:261-263](app/admin/settlements/actions.ts:261-263)

---

### Scenario 6: No-Show Processing Audit Trail

**Setup**:
1. Create reservation in PAID status
2. Pass tee time
3. Login as admin user

**Steps**:
1. Mark reservation as NO_SHOW
2. Check database logs

**Expected Result**:
- ✅ Reservation status changed to NO_SHOW
- ✅ Console log shows actual admin user ID: `[unsuspendUser] Admin user-123 (admin@example.com) ...`
- ✅ If user suspended, audit trail records admin ID

**Implementation**:
- No-Show Action: [app/admin/actions.ts:97-120](app/admin/actions.ts:97-120)

---

### Scenario 7: Suspended User Access

**Setup**:
1. Create user
2. Suspend user (set `is_suspended = true`)

**Steps**:
1. Login as suspended user
2. Try to access `/admin` (if they have admin role)
3. Try to access any page

**Expected Result**:
- ✅ Redirected to `/suspended` page
- ✅ Suspension details displayed (reason, dates)
- ✅ Contact information shown

**Implementation**:
- Middleware: [middleware.ts:73-75](middleware.ts:73-75)
- Admin Layout: [app/admin/layout.tsx:30-32](app/admin/layout.tsx:30-32)
- Suspended Page: [app/suspended/page.tsx](app/suspended/page.tsx:1)

---

### Scenario 8: CLUB_ADMIN Cannot Unsuspend

**Setup**:
1. Login as CLUB_ADMIN
2. User with no-show count = 3 (suspended)

**Steps**:
1. Navigate to `/admin/no-show`
2. Try to unsuspend user

**Expected Result**:
- ❌ Unsuspend button disabled or action returns error
- ✅ Error message: "CLUB_ADMIN cannot unsuspend users"

**Implementation**:
- Unsuspend Action: [app/admin/actions.ts:151-158](app/admin/actions.ts:151-158)

---

### Scenario 9: Header Display Based on Auth State

**Not Logged In**:
- ✅ Shows "로그인" button
- ❌ No "내 예약" link
- ❌ No "Admin" button

**Logged In (Regular User)**:
- ✅ Shows "내 예약" link
- ✅ Shows user name and "일반 회원" badge
- ✅ Shows "로그아웃" button
- ❌ No "Admin" button

**Logged In (ADMIN)**:
- ✅ Shows "내 예약" link
- ✅ Shows user name and "ADMIN" badge
- ✅ Shows "Admin" button
- ✅ Shows "로그아웃" button

**Implementation**:
- Header: [components/Header.tsx](components/Header.tsx:1)
- HeaderClient: [components/HeaderClient.tsx](components/HeaderClient.tsx:1)

---

### Scenario 10: Session Persistence Across Requests

**Steps**:
1. Login
2. Navigate to different pages (`/`, `/admin`, `/reservations`)
3. Refresh browser
4. Close and reopen browser (within session timeout)

**Expected Result**:
- ✅ Session persists across navigation
- ✅ Session persists across refresh
- ✅ Session persists across browser close/reopen (if cookies not cleared)
- ✅ User not asked to login again

**Implementation**:
- Supabase SSR handles cookie-based sessions automatically
- Middleware refreshes session: [middleware.ts:35-38](middleware.ts:35-38)

---

### Scenario 11: RLS Policy Enforcement

**Setup**:
1. Create 2 users: `user-1` and `user-2`
2. Create reservations for both users

**Steps**:
1. Login as `user-1`
2. Query reservations using client (not admin)
3. Try to view `user-2`'s reservations

**Expected Result**:
- ✅ Can view own reservations
- ❌ Cannot view `user-2`'s reservations (RLS blocks)
- ✅ Admin (using SERVICE_ROLE_KEY) can view all

**Implementation**:
- RLS Policy: [supabase/migrations/20260117_sdd08_rls_auth_consistency.sql:28-31](supabase/migrations/20260117_sdd08_rls_auth_consistency.sql:28-31)

---

### Scenario 12: End-to-End Settlement Workflow

**Steps**:
1. Login as SUPER_ADMIN (`admin@example.com`)
2. Navigate to `/admin/settlements/new`
3. Create settlement for Golf Club A, January 2026
   - Database records `created_by_user_id = <admin@example.com user id>`
4. Confirm settlement
   - Database records `confirmed_by_user_id = <admin@example.com user id>`
   - Status → CONFIRMED
5. Lock settlement
   - Database records `locked_by_user_id = <admin@example.com user id>`
   - Status → LOCKED
6. Try to edit locked settlement
   - ❌ Update blocked by database trigger

**Expected Result**:
- ✅ All actions succeed
- ✅ Audit trail complete with actual user IDs
- ✅ LOCKED settlement cannot be modified

**Implementation**:
- Settlement Actions: [app/admin/settlements/actions.ts](app/admin/settlements/actions.ts:1)
- Database Triggers: [supabase/migrations/20260117_create_settlements.sql](supabase/migrations/20260117_create_settlements.sql:1)

---

## Key Files Summary

### Auth Infrastructure
| File | Purpose | Lines |
|------|---------|-------|
| [lib/supabase/server.ts](lib/supabase/server.ts:1) | Server-side Supabase client | 62 |
| [lib/supabase/client.ts](lib/supabase/client.ts:1) | Client-side Supabase client | 28 |
| [lib/auth/getCurrentUserWithRoles.ts](lib/auth/getCurrentUserWithRoles.ts:1) | Role resolution and permission helpers | 148 |

### Route Protection
| File | Purpose | Lines |
|------|---------|-------|
| [middleware.ts](middleware.ts:1) | Next.js middleware for route protection | 95 |
| [app/admin/layout.tsx](app/admin/layout.tsx:1) | Admin layout with server-side auth check | 39 |
| [components/admin/AdminLayoutClient.tsx](components/admin/AdminLayoutClient.tsx:1) | Admin layout UI with user info | 149 |

### Server Actions (Refactored)
| File | Changes | Impact |
|------|---------|--------|
| [app/admin/settlements/actions.ts](app/admin/settlements/actions.ts:1) | Removed `admin_user_id` from 4 functions | 518 lines |
| [app/admin/actions.ts](app/admin/actions.ts:1) | Removed `admin_user_id` from 4 functions | 387 lines |
| [app/admin/tee-times/actions.ts](app/admin/tee-times/actions.ts:1) | Updated `getUserRole()` helper | 64 lines changed |

### UI Components
| File | Purpose | Lines |
|------|---------|-------|
| [components/Header.tsx](components/Header.tsx:1) | Global header (server) | 15 |
| [components/HeaderClient.tsx](components/HeaderClient.tsx:1) | Global header UI (client) | 98 |
| [app/login/page.tsx](app/login/page.tsx:1) | Login/signup page | 296 |
| [app/login/actions.ts](app/login/actions.ts:1) | Login/signup server actions | 120 |
| [app/forbidden/page.tsx](app/forbidden/page.tsx:1) | 403 error page | 43 |
| [app/suspended/page.tsx](app/suspended/page.tsx:1) | Suspended account page | 102 |

### Database
| File | Purpose | Lines |
|------|---------|-------|
| [supabase/migrations/20260117_sdd08_rls_auth_consistency.sql](supabase/migrations/20260117_sdd08_rls_auth_consistency.sql:1) | RLS policies for auth consistency | 242 |

### Type Definitions
| File | Changes |
|------|---------|
| [types/settlement.ts](types/settlement.ts:1) | Removed `admin_user_id` from 4 request types |
| [types/adminManagement.ts](types/adminManagement.ts:1) | Removed `admin_user_id` from 2 request types |

---

## Breaking Changes

### API Changes (Request Types)

**Before (SDD-07)**:
```typescript
// Settlement actions
await createSettlement({
  golf_club_id: 1,
  period_start: '2026-01-01',
  period_end: '2026-01-31',
  admin_user_id: 'admin-user-id' // ❌ Required
});

// Admin actions
await markReservationAsNoShow({
  reservationId: 'res-123',
  adminUserId: 'admin-user-id' // ❌ Required
});
```

**After (SDD-08)**:
```typescript
// Settlement actions
await createSettlement({
  golf_club_id: 1,
  period_start: '2026-01-01',
  period_end: '2026-01-31'
  // ✅ admin_user_id removed - uses session
});

// Admin actions
await markReservationAsNoShow({
  reservationId: 'res-123'
  // ✅ adminUserId removed - uses session
});
```

**Migration Path**:
1. Remove all `admin_user_id` / `adminUserId` parameters from client code
2. Ensure all admin actions called from authenticated context
3. Test with real session tokens

---

## Known Limitations

### 1. No Authentication for Regular User Booking

**Issue**: Main booking flow (`/`) doesn't require authentication

**Current State**:
- Users can view tee times without logging in
- Booking modal requires user to be logged in (checked in component)

**Future Enhancement**:
- Add auth check before allowing booking
- Show login prompt in booking modal
- Track anonymous users for analytics

### 2. Service Role Key Security

**Issue**: Admin actions use `SERVICE_ROLE_KEY` which bypasses RLS

**Current State**:
- Service role key stored in server environment variables
- Only accessible from server-side code
- Never exposed to client

**Best Practices**:
- ✅ Never log service role key
- ✅ Rotate key if compromised
- ✅ Monitor usage for anomalies
- ❌ Never use in client-side code

### 3. No Multi-Factor Authentication

**Current State**:
- Only email/password and OAuth supported
- No MFA for admin accounts

**Future Enhancement**:
- Add TOTP-based MFA for SUPER_ADMIN
- SMS verification for sensitive actions
- Backup codes for account recovery

### 4. No Session Timeout Configuration

**Current State**:
- Supabase default session timeout (1 hour)
- No custom timeout for admin sessions

**Future Enhancement**:
- Shorter timeout for admin sessions (15 minutes)
- Automatic logout on prolonged inactivity
- Session renewal prompt

---

## Deployment Checklist

### Pre-Deployment

- [ ] **Environment Variables Set**
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **Database Migrations Run**
  - [ ] `20260117_sdd08_rls_auth_consistency.sql` applied
  - [ ] RLS policies active
  - [ ] Helper functions created

- [ ] **User Records Verified**
  - [ ] All `public.users.id` match `auth.users.id`
  - [ ] No orphaned user records
  - [ ] Admin roles assigned correctly

### Post-Deployment

- [ ] **Smoke Tests**
  - [ ] Login/logout works
  - [ ] Admin access works for authorized users
  - [ ] Non-admins blocked from admin pages
  - [ ] Suspended users redirected

- [ ] **Audit Trail Check**
  - [ ] Create test settlement → verify `created_by_user_id`
  - [ ] Confirm settlement → verify `confirmed_by_user_id`
  - [ ] Lock settlement → verify `locked_by_user_id`
  - [ ] Mark no-show → verify admin ID in logs

- [ ] **RLS Verification**
  - [ ] Regular user can only see own reservations
  - [ ] Admin can see all reservations (via service role)
  - [ ] Anonymous users cannot modify data

### Rollback Plan

If issues arise, rollback involves:

1. **Code Rollback**: Revert to SDD-07 commit
2. **Type Restoration**: Restore `admin_user_id` parameters
3. **Database**: RLS policies are backwards-compatible
4. **No Data Loss**: User records unchanged

---

## Performance Considerations

### Middleware Impact

**Overhead**: ~50-100ms per request (auth check + 2 DB queries)

**Optimization**:
- Middleware only runs on `/admin` routes
- Queries use indexed columns (`id`, `user_id`)
- Consider caching user roles in session

### getCurrentUserWithRoles() Caching

**Current**: 3 queries per call (auth, users, club_admins)

**Future Optimization**:
```typescript
// Cache user roles in session metadata
const { data } = await supabase.auth.getUser();
const roles = data.user?.app_metadata?.roles; // Pre-computed
```

**Trade-off**: Requires auth webhook or trigger to update metadata

---

## Security Best Practices

### 1. Always Use Server Actions for Mutations

**❌ Bad**:
```typescript
// Client component
const handleDelete = async () => {
  await supabaseClient.from('settlements').delete().eq('id', id);
};
```

**✅ Good**:
```typescript
// Client component calls server action
const handleDelete = async () => {
  await deleteSettlement({ settlement_id: id });
};

// Server action (app/admin/settlements/actions.ts)
export async function deleteSettlement(request) {
  const user = await requireSuperAdminAccess(); // Permission check
  // ... safe deletion
}
```

### 2. Never Expose Service Role Key

**❌ Bad**:
```typescript
// .env.local - WRONG!
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=xxx // Exposed to client!
```

**✅ Good**:
```typescript
// .env.local - Correct
SUPABASE_SERVICE_ROLE_KEY=xxx // Server-only
```

### 3. Validate All Inputs in Server Actions

```typescript
export async function createSettlement(request) {
  // Validate inputs
  if (!request.golf_club_id || request.golf_club_id < 1) {
    return { success: false, error: 'Invalid golf club ID' };
  }

  if (new Date(request.period_start) > new Date(request.period_end)) {
    return { success: false, error: 'Invalid period' };
  }

  // ... proceed
}
```

### 4. Use HTTPS Only in Production

```typescript
// middleware.ts
if (process.env.NODE_ENV === 'production' && !request.url.startsWith('https')) {
  return NextResponse.redirect(request.url.replace('http', 'https'));
}
```

---

## Troubleshooting Guide

### Issue: "User not found in public.users table"

**Symptom**: `getCurrentUserWithRoles()` returns minimal user object

**Cause**: User exists in `auth.users` but not `public.users`

**Solution**:
```sql
-- Create missing user record
INSERT INTO public.users (id, email, name)
SELECT id, email, raw_user_meta_data->>'name'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users);
```

### Issue: "Admin redirected to forbidden page"

**Symptom**: Admin user cannot access `/admin`

**Cause**: `is_super_admin` flag not set or no `club_admins` entry

**Solution**:
```sql
-- Check admin status
SELECT id, email, is_super_admin FROM public.users WHERE email = 'admin@example.com';

-- Grant super admin
UPDATE public.users SET is_super_admin = true WHERE email = 'admin@example.com';

-- OR add club admin
INSERT INTO public.club_admins (user_id, golf_club_id)
VALUES ('user-id', 1);
```

### Issue: "Settlement creation fails with 'FORBIDDEN'"

**Symptom**: Error when creating settlement

**Cause**: User not logged in or lacks permissions

**Debug**:
```typescript
// In server action
const user = await getCurrentUserWithRoles();
console.log('User:', user); // Check if user exists
console.log('Is Admin:', user?.isAdmin); // Check admin flag
```

### Issue: "RLS policy blocks admin queries"

**Symptom**: Admin cannot see all reservations

**Cause**: Using anon key instead of service role key

**Solution**:
```typescript
// Ensure admin actions use service role client
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Not ANON_KEY
);
```

---

## Future Enhancements

### 1. Audit Log Table

**Proposal**: Store all admin actions in dedicated table

```sql
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL, -- 'CREATE_SETTLEMENT', 'MARK_NO_SHOW', etc.
  entity_type TEXT, -- 'settlement', 'reservation', 'user'
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Permission Granularity

**Current**: Role-based (SUPER_ADMIN, ADMIN, CLUB_ADMIN)

**Future**: Permission-based (can_create_settlements, can_lock_settlements, etc.)

```typescript
export interface UserPermissions {
  settlements: {
    create: boolean;
    confirm: boolean;
    lock: boolean;
    delete: boolean;
  };
  reservations: {
    view_all: boolean;
    mark_no_show: boolean;
    cancel: boolean;
  };
  users: {
    view_all: boolean;
    suspend: boolean;
    unsuspend: boolean;
  };
}
```

### 3. Session Management Dashboard

**Features**:
- View active sessions for a user
- Revoke specific sessions
- Force logout from all devices
- Session history (login times, IP addresses)

### 4. OAuth Provider Expansion

**Current**: Kakao only

**Future**: Google, Naver, Apple Sign In

---

## Conclusion

SDD-08 successfully replaces all hardcoded admin user IDs with session-based authentication powered by Supabase Auth. The implementation:

✅ **Secure**: All admin routes protected by middleware and server-side checks
✅ **Auditable**: All admin actions tracked with real user IDs
✅ **Scalable**: Role-based access control supports multi-level permissions
✅ **Maintainable**: Centralized auth logic in helper functions
✅ **Type-Safe**: TypeScript types updated across the board

**Next Steps**:
1. Deploy RLS migration to staging
2. Run QA test scenarios
3. Deploy to production
4. Monitor audit trails for first week
5. Plan MFA implementation (SDD-09)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-17
**Author**: Claude (Anthropic)
