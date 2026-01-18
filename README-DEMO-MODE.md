# DEMO MODE - Force Login for Development

## ⚠️ CRITICAL WARNING

**DEMO MODE MUST NEVER BE ENABLED IN PRODUCTION!**

This feature bypasses all Supabase authentication and security measures. It is designed **ONLY** for local development and testing purposes where managing login sessions is impractical.

---

## What is DEMO MODE?

DEMO MODE is a comprehensive development convenience feature that **completely bypasses all authentication and authorization checks** across the entire TUGOL application.

### What Gets Bypassed

When `NEXT_PUBLIC_DEMO_MODE=true`:

#### 1. **Middleware-Level Protection** ([`middleware.ts`](middleware.ts))
- All route protection checks are skipped
- `/admin`, `/my`, and all protected routes are accessible without login
- No redirects to `/login` or `/forbidden` pages

#### 2. **Auth Helper Functions** ([`lib/auth/getCurrentUserWithRoles.ts`](lib/auth/getCurrentUserWithRoles.ts))
- `getCurrentUserWithRoles()` returns demo user without Supabase Auth check
- `requireAdminAccess()` bypasses admin verification
- `requireSuperAdminAccess()` bypasses super admin verification
- `requireClubAccess()` bypasses club ownership verification

#### 3. **Page-Level Protection**
- **Admin Layout** (`app/admin/layout.tsx`): No auth/role checks
- **MY Reservations** (`app/my/reservations/page.tsx`): No login required
- **Reservation Details** (`app/my/reservations/[id]/page.tsx`): No ownership verification
- **All protected pages**: Accessible without authentication

#### 4. **Server Actions**
- Risk scoring, segment calculation, virtual payments work without auth checks
- Admin-only actions are accessible to demo users

### How It Works

**When DEMO_MODE=true**:
1. `middleware.ts` immediately returns `NextResponse.next()` without any checks
2. `getCurrentUserWithRoles()` looks up `NEXT_PUBLIC_DEMO_USER_EMAIL` in database
3. All `require*Access()` functions return demo user without verification
4. Protected pages render without redirects
5. User appears "logged in" everywhere in the UI

**When DEMO_MODE=false**:
- Normal Supabase Auth flow (login required, sessions managed, tokens validated)
- Middleware protects `/admin` routes
- Page-level auth checks enforce permissions
- Standard RLS policies apply

---

## Quick Start

### 1. Enable DEMO MODE

Add these lines to your `.env.local`:

```bash
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_DEMO_USER_EMAIL=vip_user@tugol.dev
```

### 2. Restart Development Server

```bash
npm run dev
```

### 3. Access Protected Pages

You can now access pages that normally require login:

- **MY Page**: http://localhost:3000/my/reservations
- **Admin Panel**: http://localhost:3000/admin
- **Settlement**: http://localhost:3000/admin/settlement
- **Any protected route**: No login redirect, user is "logged in"

### 4. Check Console Logs

When DEMO MODE is active, you'll see logs like:

```
[DEMO MODE] Force-logging in user: vip_user@tugol.dev
[DEMO MODE] Logged in as: {
  email: 'vip_user@tugol.dev',
  isSuperAdmin: false,
  isAdmin: false,
  isClubAdmin: false,
  segment: 'PRESTIGE'
}
```

---

## Testing Different User Roles

Change `NEXT_PUBLIC_DEMO_USER_EMAIL` to test different user types:

### Example Test Users

```bash
# SUPER_ADMIN (full access to all admin features)
NEXT_PUBLIC_DEMO_USER_EMAIL=super_admin@tugol.dev

# CLUB_ADMIN (can manage specific golf clubs)
NEXT_PUBLIC_DEMO_USER_EMAIL=club_admin@tugol.dev

# PRESTIGE Segment User (VIP, low risk score, 5% segment discount)
NEXT_PUBLIC_DEMO_USER_EMAIL=vip_user@tugol.dev

# CHERRY Segment User (cherry picker, high risk score, no segment discount)
NEXT_PUBLIC_DEMO_USER_EMAIL=cherry_user@tugol.dev

# SMART Segment User (smart golfer, moderate risk)
NEXT_PUBLIC_DEMO_USER_EMAIL=smart_user@tugol.dev

# FUTURE Segment User (new user, no history)
NEXT_PUBLIC_DEMO_USER_EMAIL=future_user@tugol.dev
```

**Note**: These users must exist in your Supabase `public.users` table. If the email doesn't exist, DEMO MODE will return `null` (not logged in).

---

## How It Works

### Code Implementation

DEMO MODE is implemented in [`lib/auth/getCurrentUserWithRoles.ts`](lib/auth/getCurrentUserWithRoles.ts):

```typescript
export async function getCurrentUserWithRoles(): Promise<UserWithRoles | null> {
  try {
    const supabase = await createSupabaseServerClient();

    // ========================================
    // DEMO MODE: Force login for development
    // ========================================
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    const demoUserEmail = process.env.NEXT_PUBLIC_DEMO_USER_EMAIL;

    if (isDemoMode && demoUserEmail) {
      console.log('[DEMO MODE] Force-logging in user:', demoUserEmail);

      // Fetch user directly from public.users table by email
      const { data: userData } = await supabase
        .from('users')
        .select('id, email, name, is_super_admin, is_suspended, segment_type')
        .eq('email', demoUserEmail)
        .single();

      // ... build UserWithRoles object and return
    }

    // ========================================
    // PRODUCTION MODE: Normal Supabase Auth
    // ========================================
    const { data: { user: authUser } } = await supabase.auth.getUser();
    // ... normal auth flow
  }
}
```

### Implementation Details

#### Modified Files

1. **[`middleware.ts`](middleware.ts)**
   ```typescript
   const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

   if (DEMO_MODE) {
     console.log('[DEMO MODE] Middleware - bypassing all auth checks');
     return NextResponse.next(); // Skip ALL protection logic
   }

   // Normal auth checks only run when DEMO_MODE=false
   ```

2. **[`lib/auth/getCurrentUserWithRoles.ts`](lib/auth/getCurrentUserWithRoles.ts)**
   ```typescript
   // Main auth function
   export async function getCurrentUserWithRoles() {
     const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

     if (DEMO_MODE && demoUserEmail) {
       // Fetch by email, skip Supabase Auth
       return demoUser;
     }

     // Normal auth flow
   }

   // Helper functions also bypass checks
   export async function requireAdminAccess() {
     if (DEMO_MODE) {
       return await getCurrentUserWithRoles(); // No verification
     }
     // Normal verification
   }
   ```

3. **[`app/admin/layout.tsx`](app/admin/layout.tsx)**
   ```typescript
   const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

   if (DEMO_MODE) {
     const user = await getCurrentUserWithRoles();
     const demoUser = user || fallbackMockUser;
     return <AdminLayoutClient user={demoUser}>{children}</AdminLayoutClient>;
   }

   // Normal auth checks
   ```

4. **Protected Pages** (`app/my/reservations/page.tsx`, etc.)
   ```typescript
   const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
   const user = await getCurrentUserWithRoles();

   if (!user && !DEMO_MODE) {
     redirect('/login');
   }

   // Render page
   ```

### What Gets Bypassed vs. What Remains

| Feature | DEMO_MODE=true | DEMO_MODE=false |
|---------|----------------|-----------------|
| Middleware route protection | ❌ Bypassed | ✅ Enforced |
| Supabase Auth session | ❌ Bypassed | ✅ Required |
| Login redirects | ❌ Bypassed | ✅ Enforced |
| Admin role checks | ❌ Bypassed | ✅ Enforced |
| Page ownership verification | ❌ Bypassed | ✅ Enforced |
| Session tokens/cookies | ❌ Ignored | ✅ Validated |
| Database queries | ✅ **Still work** | ✅ Work |
| Row Level Security (RLS) | ✅ **Still active** | ✅ Active |
| Business logic (pricing, risk) | ✅ **Still runs** | ✅ Runs |
| Server actions | ✅ **Still work** | ✅ Work |

---

## Use Cases

### 1. Testing Admin Panel Without Login

**Problem**: You want to test admin features but don't want to log in repeatedly during development.

**Solution**:
```bash
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_DEMO_USER_EMAIL=super_admin@tugol.dev
```

Now you can access `/admin`, `/admin/settlement`, etc. without login.

---

### 2. Testing User Segments

**Problem**: You want to see how the MY page looks for different user segments.

**Solution**: Change `NEXT_PUBLIC_DEMO_USER_EMAIL` to different segment users:

```bash
# Test PRESTIGE user view
NEXT_PUBLIC_DEMO_USER_EMAIL=vip_user@tugol.dev
# Visit http://localhost:3000/my/reservations

# Test CHERRY user view
NEXT_PUBLIC_DEMO_USER_EMAIL=cherry_user@tugol.dev
# Visit http://localhost:3000/my/reservations
```

---

### 3. Testing Risk Scoring Logic

**Problem**: You want to test high-risk user restrictions (precheck required, booking limits).

**Solution**: Use a high-risk user:

```bash
NEXT_PUBLIC_DEMO_USER_EMAIL=high_risk_user@tugol.dev
```

Then try making a reservation and verify:
- Penalty agreement is required
- Pre-check-in is enforced
- Concurrent booking limits apply

---

### 4. Testing Virtual Payment Flow

**Problem**: You want to test virtual payments without running Toss PG integration.

**Solution**:
```bash
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_DEMO_USER_EMAIL=vip_user@tugol.dev
```

Then use `createVirtualReservation()` server action to create reservations without real payment.

---

## Troubleshooting

### DEMO MODE not working (still redirects to login)

**Check**:
1. Environment variable is exactly `NEXT_PUBLIC_DEMO_MODE=true` (case-sensitive)
2. Email exists in `public.users` table
3. Server was restarted after `.env.local` change
4. Console shows `[DEMO MODE]` logs

**Fix**:
```bash
# Stop server
Ctrl+C

# Verify .env.local
cat .env.local | grep DEMO

# Should show:
# NEXT_PUBLIC_DEMO_MODE=true
# NEXT_PUBLIC_DEMO_USER_EMAIL=vip_user@tugol.dev

# Restart server
npm run dev
```

---

### User not found error

**Console shows**:
```
[DEMO MODE] User not found: test@example.com
```

**Fix**: The email doesn't exist in your database. Either:

1. Create the user in Supabase:
```sql
INSERT INTO public.users (id, email, name, is_super_admin, segment_type)
VALUES (
  gen_random_uuid(),
  'test@example.com',
  'Test User',
  false,
  'PRESTIGE'
);
```

2. Use an existing user email from your database

---

### DEMO MODE enabled but user is null

**Check**:
1. `NEXT_PUBLIC_DEMO_USER_EMAIL` is set and not empty
2. Email exists in database
3. User is not suspended (`is_suspended = false`)
4. Database connection is working

**Fix**: Check console for error messages and verify database connectivity.

---

## Production Deployment Checklist

**Before deploying to production, you MUST:**

### ✅ 1. Disable DEMO MODE

Edit `.env.local` (or production environment variables):

```bash
# Option 1: Set to false
NEXT_PUBLIC_DEMO_MODE=false

# Option 2: Remove entirely (recommended)
# Delete these lines:
# NEXT_PUBLIC_DEMO_MODE=true
# NEXT_PUBLIC_DEMO_USER_EMAIL=vip_user@tugol.dev
```

### ✅ 2. Verify Normal Auth Works

Test login flow:
1. Visit protected page (e.g., `/my/reservations`)
2. Should redirect to `/login`
3. Log in with real credentials
4. Should access page successfully

### ✅ 3. Check Console Logs

Production should show:
```
# No [DEMO MODE] logs
# Normal auth flow
```

### ✅ 4. Remove DEMO_MODE Code (Optional)

For extra security, you can remove the DEMO_MODE code block from `lib/auth/getCurrentUserWithRoles.ts`:

```typescript
// Remove lines 47-115 (the entire DEMO MODE block)
// Keep only the PRODUCTION MODE section
```

**Note**: This is optional since the code only runs when `NEXT_PUBLIC_DEMO_MODE=true`. It's safe to keep the code for future development use.

---

## Security Considerations

### Why DEMO MODE is Dangerous in Production

1. **Bypasses Authentication**: Anyone can access any user's data by setting an email
2. **No Session Validation**: No token expiry, no logout, no security checks
3. **Exposes User Data**: User IDs and roles are logged to console
4. **RLS Bypass Risk**: If RLS policies aren't properly configured, DEMO MODE can leak data

### Safe Usage Guidelines

✅ **DO**:
- Use DEMO MODE only in local development (`localhost:3000`)
- Test with real user emails from your development database
- Keep DEMO_MODE disabled in `.env.production`
- Add DEMO_MODE reminder in deployment checklist
- Review console logs to verify DEMO MODE is active when expected

❌ **DON'T**:
- Enable DEMO_MODE in production environment
- Commit `.env.local` with `DEMO_MODE=true` to git
- Share DEMO_MODE credentials publicly
- Use DEMO_MODE with production database
- Leave DEMO_MODE enabled when testing auth flows

---

## FAQ

### Q: Can I use DEMO MODE with production database?

**A**: Technically yes, but **strongly discouraged**. Always use a development/staging database for DEMO MODE testing.

---

### Q: Does DEMO MODE work with RLS policies?

**A**: Yes. DEMO MODE only bypasses the authentication check. RLS policies still apply based on the user's ID returned by `getCurrentUserWithRoles()`.

---

### Q: Can I use DEMO MODE for automated tests?

**A**: Yes! DEMO MODE is perfect for E2E tests where you need to test as different users without managing sessions:

```typescript
// cypress/e2e/admin.cy.ts
describe('Admin Panel', () => {
  it('should show admin dashboard for super admin', () => {
    // Set NEXT_PUBLIC_DEMO_MODE=true
    // Set NEXT_PUBLIC_DEMO_USER_EMAIL=super_admin@tugol.dev
    cy.visit('/admin');
    cy.contains('정산 관리').should('be.visible');
  });
});
```

---

### Q: How do I switch users quickly during testing?

**A**: Create a shell script:

```bash
#!/bin/bash
# test-as-user.sh

USER_EMAIL=$1

if [ -z "$USER_EMAIL" ]; then
  echo "Usage: ./test-as-user.sh <email>"
  exit 1
fi

# Update .env.local
sed -i '' "s/NEXT_PUBLIC_DEMO_USER_EMAIL=.*/NEXT_PUBLIC_DEMO_USER_EMAIL=$USER_EMAIL/" .env.local

echo "✅ Now testing as: $USER_EMAIL"
echo "🔄 Restart dev server (npm run dev) to apply changes"
```

Usage:
```bash
./test-as-user.sh vip_user@tugol.dev
./test-as-user.sh cherry_user@tugol.dev
./test-as-user.sh super_admin@tugol.dev
```

---

## Complete List of Modified Files

All files below have been updated to support DEMO_MODE:

### Core Auth Layer
1. **[`middleware.ts`](middleware.ts)** - Bypasses ALL route protection when DEMO_MODE=true
2. **[`lib/auth/getCurrentUserWithRoles.ts`](lib/auth/getCurrentUserWithRoles.ts)** - Force-login + bypass helper functions

### Layouts
3. **[`app/admin/layout.tsx`](app/admin/layout.tsx)** - Bypass admin auth checks

### Protected Pages
4. **[`app/my/reservations/page.tsx`](app/my/reservations/page.tsx)** - Bypass login requirement
5. **[`app/my/reservations/[id]/page.tsx`](app/my/reservations/[id]/page.tsx)** - Bypass ownership verification

### Configuration
6. **[`.env.local`](.env.local)** - DEMO_MODE environment variables
7. **[`.env.local.example`](.env.local.example)** - Example config

### Documentation
8. **[`README-DEMO-MODE.md`](README-DEMO-MODE.md)** - This file
9. **[`CLAUDE.md`](CLAUDE.md)** - Project architecture guide

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                      User Request                            │
│                  (http://localhost:3000/admin)               │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  middleware.ts │
                    └────────┬───────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
     DEMO_MODE=true               DEMO_MODE=false
              │                             │
              ▼                             ▼
    ┌─────────────────┐         ┌──────────────────┐
    │ Skip ALL checks │         │ Check Supabase   │
    │ Allow request   │         │ Auth + Roles     │
    └────────┬────────┘         └────────┬─────────┘
             │                           │
             │                    ┌──────┴──────┐
             │                    │             │
             │                  Authorized   Unauthorized
             │                    │             │
             │                    │             ▼
             │                    │      ┌──────────────┐
             │                    │      │ Redirect to  │
             │                    │      │ /login       │
             │                    │      └──────────────┘
             │                    │
             └────────────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │ Page Component   │
            │ (admin/layout)   │
            └────────┬─────────┘
                     │
       ┌─────────────┴─────────────┐
       │                           │
  DEMO_MODE=true           DEMO_MODE=false
       │                           │
       ▼                           ▼
┌────────────────┐      ┌──────────────────┐
│ Get demo user  │      │ Verify user roles│
│ Render UI      │      │ or redirect      │
└────────────────┘      └──────────────────┘
```

## Related Files

- **Implementation**: [`lib/auth/getCurrentUserWithRoles.ts`](lib/auth/getCurrentUserWithRoles.ts)
- **Middleware**: [`middleware.ts`](middleware.ts)
- **Environment Config**: [`.env.local`](.env.local)
- **Example Config**: [`.env.local.example`](.env.local.example)
- **Project Guide**: [`CLAUDE.md`](CLAUDE.md)

---

## Support

If you encounter issues with DEMO MODE:

1. Check console logs for `[DEMO MODE]` messages
2. Verify environment variables are set correctly
3. Ensure user exists in database
4. Review troubleshooting section above
5. Check Supabase connection

For additional help, refer to [CLAUDE.md](CLAUDE.md) for project architecture details.

---

**Last Updated**: 2026-01-18
**Version**: 1.0
**Author**: TUGOL Development Team
