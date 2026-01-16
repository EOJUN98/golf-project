# TUGOL Authentication System - Implementation Guide

## Overview

Complete email/password authentication system with login, signup, and session management integrated with Supabase Auth.

## What's Been Implemented

### 1. Server Actions ([app/login/actions.ts](app/login/actions.ts))
- ✅ `login(formData)` - Email/password login with validation
- ✅ `signup(formData)` - User registration with name and phone
- ✅ `logout()` - Session cleanup and redirect

### 2. Login/Signup Page ([app/login/page.tsx](app/login/page.tsx))
- ✅ Tabbed interface (로그인 / 회원가입)
- ✅ Email/password authentication
- ✅ Kakao OAuth integration (preserved from existing)
- ✅ Form validation
- ✅ URL message display
- ✅ Responsive design

### 3. Site Header ([components/SiteHeader.tsx](components/SiteHeader.tsx))
- ✅ Dynamic auth state display
- ✅ User name/avatar when logged in
- ✅ Login button when logged out
- ✅ Logout confirmation
- ✅ Navigation to reservations

### 4. Main Page Integration ([app/page.tsx](app/page.tsx))
- ✅ Uses new SiteHeader component
- ✅ Automatically fetches user segment for pricing
- ✅ Removed hardcoded mock segment

## Features

### Login Page Features

#### Tabbed Interface
```
┌─────────────────────────────────┐
│  [로그인]  |  회원가입           │
├─────────────────────────────────┤
│                                 │
│  📧 이메일                       │
│  🔒 비밀번호                     │
│                                 │
│  [로그인 버튼]                   │
│                                 │
│  ──────── 또는 ────────          │
│                                 │
│  [💬 카카오로 시작하기]          │
│                                 │
└─────────────────────────────────┘
```

#### Input Fields
**로그인 탭:**
- 이메일 (required)
- 비밀번호 (required)

**회원가입 탭:**
- 이메일 * (required)
- 비밀번호 * (6자 이상, required)
- 이름 * (required)
- 전화번호 (optional)

#### Validation
- Email format validation (browser native)
- Password minimum length: 6 characters
- Required field validation
- Server-side error messages

#### Message Display
URL query parameter `?message=...` displays alert:
```typescript
// Success message
/login?message=회원가입이 완료되었습니다. 로그인해주세요.

// Error message
/login?message=이메일과 비밀번호를 입력해주세요
```

### Site Header Features

#### Logged-Out State
```
┌──────────────────────────────────────┐
│ TUGOL    📍 인천 (Club 72)  [로그인] │
└──────────────────────────────────────┘
```

#### Logged-In State
```
┌────────────────────────────────────────────────────┐
│ TUGOL    📍 인천 (Club 72)  [👤 홍길동]  [🚪 로그아웃] │
└────────────────────────────────────────────────────┘
```

#### Features:
- **User Name Display:** Fetched from database
- **Click User Badge:** Navigate to `/reservations`
- **Logout Button:** Confirmation dialog
- **Real-time Updates:** Listens to auth state changes

## Authentication Flow

### Registration Flow

```
User visits /login → Clicks "회원가입" tab
  ↓
Fills form (email, password, name, phone)
  ↓
Submits form → signup() server action
  ↓
Supabase Auth creates user with metadata
  ↓
Database trigger creates user in public.users
  ↓
Redirect to /login?message=성공
  ↓
User logs in
```

### Login Flow

```
User visits /login
  ↓
Enters email + password
  ↓
Submits form → login() server action
  ↓
supabase.auth.signInWithPassword()
  ↓
Success → Redirect to /
  ↓
SiteHeader shows user name
  ↓
Pricing uses real user segment
```

### Logout Flow

```
User clicks logout button
  ↓
Confirmation dialog
  ↓
logout() server action
  ↓
supabase.auth.signOut()
  ↓
Redirect to /
  ↓
SiteHeader shows login button
```

## Database Integration

### User Creation Trigger

When `supabase.auth.signUp()` is called with metadata:
```typescript
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      name: '홍길동',
      phone: '010-1234-5678'
    }
  }
});
```

The database trigger automatically creates a row in `public.users`:
```sql
-- Trigger function (already exists in your DB)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### User Data Structure

```typescript
// public.users table
{
  id: string (UUID from auth.users)
  email: string
  name: string | null        // From signup form
  phone: string | null       // From signup form
  segment: 'FUTURE'          // Default for new users
  cherry_score: 0            // Default
  is_admin: false            // Default
  // ... other fields
}
```

## Server Actions Details

### login(formData)

**Input:**
```typescript
FormData {
  email: string
  password: string
}
```

**Process:**
1. Extract email and password
2. Validate required fields
3. Call `supabase.auth.signInWithPassword()`
4. Handle errors with redirect
5. Revalidate layout
6. Redirect to `/`

**Error Handling:**
- Missing fields → `/login?message=이메일과 비밀번호를 입력해주세요`
- Invalid credentials → `/login?message={error.message}`
- Network error → `/login?message=로그인 중 오류가 발생했습니다`

### signup(formData)

**Input:**
```typescript
FormData {
  email: string
  password: string
  name: string
  phone?: string
}
```

**Process:**
1. Extract all fields
2. Validate email, password, name
3. Check password length ≥ 6
4. Call `supabase.auth.signUp()` with metadata
5. Redirect with success message

**Metadata Injection:**
```typescript
options: {
  data: {
    name,    // Goes to auth.users.raw_user_meta_data
    phone    // Picked up by trigger → public.users
  }
}
```

**Error Handling:**
- Missing required fields → redirect with message
- Password too short → `/login?message=비밀번호는 6자 이상이어야 합니다`
- Email already exists → Supabase error message
- Database error → Generic error message

### logout()

**Process:**
1. Call `supabase.auth.signOut()`
2. Revalidate all pages
3. Redirect to `/`

**No confirmation in action** - handled in SiteHeader component.

## SiteHeader Component

### State Management

```typescript
const [user, setUser] = useState<any>(null);
const [userName, setUserName] = useState<string>('');
const [loading, setLoading] = useState(true);
```

### User Fetching

```typescript
// 1. Get session user
const { data: { user: sessionUser } } = await supabase.auth.getUser();

// 2. Fetch name from database
const { data: dbUser } = await supabase
  .from('users')
  .select('name')
  .eq('id', sessionUser.id)
  .single();

setUserName(dbUser?.name || sessionUser.email?.split('@')[0]);
```

### Auth State Listener

```typescript
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    setUser(session.user);
    // Fetch name...
  } else {
    setUser(null);
    setUserName('');
  }
});
```

**Benefits:**
- Real-time updates when user logs in/out
- No page refresh needed
- Consistent across all tabs

### Logout Handler

```typescript
const handleLogout = async () => {
  if (confirm('로그아웃 하시겠습니까?')) {
    await logout();
  }
};
```

## Integration with Pricing Engine

### Before (Hardcoded)
```typescript
// app/page.tsx (OLD)
const teeTimes = await getTeeTimesByDate(date, 'PRESTIGE', undefined);
```

### After (Dynamic)
```typescript
// app/page.tsx (NEW)
const teeTimes = await getTeeTimesByDate(date, undefined, undefined);
```

### What Changed in getTeeTimesByDate()

```typescript
// utils/supabase/queries.ts
export async function getTeeTimesByDate(date, userSegment?, userDistanceKm?) {
  // NEW: Fetch logged-in user
  const { data: { user: sessionUser } } = await supabase.auth.getUser();

  if (sessionUser?.id) {
    // Fetch user data from database
    const { data: dbUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', sessionUser.id)
      .single();

    if (dbUser) {
      actualUser = dbUser;
      actualUserSegment = dbUser.segment;
    }
  }

  // Use real user data in pricing engine
  ctx.user = actualUser;
  const result = calculatePricing(ctx);
}
```

**Result:** Prices automatically adjust based on user segment!

## Testing Checklist

### Manual Testing

#### 1. Registration Flow
- [ ] Visit `/login`
- [ ] Click "회원가입" tab
- [ ] Fill all required fields
- [ ] Submit form
- [ ] Verify success message
- [ ] Check database: `SELECT * FROM public.users WHERE email = '...'`

#### 2. Login Flow
- [ ] Enter credentials on login tab
- [ ] Submit form
- [ ] Should redirect to `/`
- [ ] Header should show user name
- [ ] Prices should reflect user segment

#### 3. Logout Flow
- [ ] Click logout button in header
- [ ] Confirm dialog
- [ ] Should redirect to `/`
- [ ] Header should show "로그인" button

#### 4. Session Persistence
- [ ] Log in
- [ ] Refresh page
- [ ] Should remain logged in
- [ ] Close browser
- [ ] Reopen
- [ ] Should still be logged in (if session valid)

#### 5. Error Handling
- [ ] Try login with wrong password
- [ ] Verify error message displays
- [ ] Try signup with existing email
- [ ] Verify Supabase error message
- [ ] Leave required fields empty
- [ ] Verify validation messages

#### 6. Kakao Login (Preserved)
- [ ] Click "카카오로 시작하기"
- [ ] Complete Kakao OAuth
- [ ] Should create user in database
- [ ] Should redirect to main page

### Database Verification

```sql
-- Check if user was created
SELECT id, email, name, phone, segment, created_at
FROM public.users
WHERE email = 'test@example.com';

-- Check auth user metadata
SELECT id, email, raw_user_meta_data
FROM auth.users
WHERE email = 'test@example.com';

-- Verify trigger worked
SELECT COUNT(*) FROM public.users WHERE id = (
  SELECT id FROM auth.users WHERE email = 'test@example.com'
);
-- Should return 1
```

### API Testing

```bash
# Test login action
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=test@example.com&password=password123"

# Should redirect to / with session cookie
```

## Troubleshooting

### Issue: Signup creates auth user but not database user

**Cause:** Database trigger not firing or failing

**Solution:**
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check trigger function
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'handle_new_user';

-- Manually create user if needed
INSERT INTO public.users (id, email, name, phone, segment)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'test@example.com'),
  'test@example.com',
  'Test User',
  NULL,
  'FUTURE'
);
```

### Issue: User name not showing in header

**Cause:** Name not saved during signup or RLS policy blocking query

**Solution:**
```sql
-- Check if name exists
SELECT id, email, name FROM public.users WHERE email = '...';

-- Update name if missing
UPDATE public.users
SET name = 'User Name'
WHERE email = '...';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'users';
```

### Issue: Login redirects but user not logged in

**Cause:** Session not persisting or Supabase client configuration

**Solution:**
```typescript
// Check .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

// Verify Supabase client creation
import { createBrowserClient } from '@supabase/ssr';
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Issue: Prices not updating after segment change

**Cause:** Cache or page not re-fetching

**Solution:**
1. Hard refresh (Cmd+Shift+R)
2. Check `export const dynamic = 'force-dynamic'` in page.tsx
3. Verify `getTeeTimesByDate()` is fetching user correctly:
```typescript
console.log('User segment:', dbUser.segment);
```

## Security Considerations

### Password Requirements
- Minimum 6 characters (enforced in form + action)
- Consider adding: uppercase, number, special char requirements

### Session Security
- Supabase handles session tokens (JWT)
- Cookies are httpOnly and secure
- Sessions expire after inactivity (configurable in Supabase)

### RLS Policies
Already implemented:
```sql
-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.users FOR SELECT
USING (auth.uid()::text = id);
```

### XSS Prevention
- All user input sanitized by React
- No `dangerouslySetInnerHTML` used
- Form values escaped automatically

### CSRF Protection
- Server Actions use Next.js built-in CSRF protection
- POST requests require valid Next.js session

## Future Enhancements

### Phase 1: Email Verification ✅ READY
```typescript
// Already supported by Supabase
await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`
  }
});
```

### Phase 2: Password Reset
```typescript
// Add to login page
const handlePasswordReset = async (email: string) => {
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`
  });
};
```

### Phase 3: Social Login Expansion
- Google OAuth
- Apple Sign In
- Naver Login

### Phase 4: Two-Factor Authentication
- SMS verification
- Authenticator app
- Email OTP

### Phase 5: User Profile Page
- Update name, phone
- Change password
- View booking history
- Manage preferences

## API Reference

### Server Actions

#### `login(formData: FormData): Promise<never>`
Authenticates user with email/password.

**FormData Fields:**
- `email: string` (required)
- `password: string` (required)

**Returns:** Redirects to `/` on success or `/login?message=...` on error.

#### `signup(formData: FormData): Promise<never>`
Creates new user account.

**FormData Fields:**
- `email: string` (required)
- `password: string` (required, min 6 chars)
- `name: string` (required)
- `phone: string` (optional)

**Returns:** Redirects to `/login?message=회원가입이 완료되었습니다` on success.

#### `logout(): Promise<never>`
Signs out current user.

**Returns:** Redirects to `/`.

## Summary

✅ **Implemented:**
- Complete email/password authentication
- User registration with name and phone
- Dynamic site header with auth state
- Logout functionality
- Session management
- Integration with pricing engine

✅ **Preserved:**
- Kakao OAuth login
- Existing database structure
- All pricing logic
- Mobile-responsive design

✅ **Tested:**
- Build passes successfully
- No TypeScript errors
- All components compile

---

**Implementation Date:** 2026-01-15
**Files Created:** 3
**Files Modified:** 2
**Build Status:** ✅ SUCCESS
**Ready for Testing:** YES
