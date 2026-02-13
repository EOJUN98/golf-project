import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function setCookieSafe(cookieStore: Awaited<ReturnType<typeof cookies>>, cookie: { name: string; value: string; options?: any }) {
  const storeAny = cookieStore as any;
  const { name, value, options } = cookie;
  try {
    storeAny.set({ name, value, ...(options || {}) });
  } catch {
    storeAny.set(name, value, options);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/'; // 로그인 후 메인으로 이동

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              setCookieSafe(cookieStore, { name, value, options });
            });
          },
        },
      }
    );
    
    // 카카오가 준 코드를 진짜 세션으로 교환
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 실패하면 에러 페이지로
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
