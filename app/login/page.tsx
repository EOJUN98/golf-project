"use client";

import { createBrowserClient } from '@supabase/ssr';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  // 1. 브라우저용 Supabase 클라이언트 만들기
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleKakaoLogin = async () => {
    setLoading(true);
    try {
      // 2. 카카오 로그인 시작
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          // 로그인 끝나면 이리로 돌아오라고 지정
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      alert('로그인 실패 ㅠㅠ');
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl text-center">
        <h1 className="mb-2 text-2xl font-black italic text-green-600">TUGOL</h1>
        <p className="mb-8 text-gray-500">3초만에 로그인하고 골프치러 가요!</p>

        <button
          onClick={handleKakaoLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-4 text-black font-bold hover:bg-[#FDD835] transition-colors"
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            // 카카오 로고 (SVG)
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-black">
              <path d="M12 3C5.373 3 0 7.373 0 12.768c0 3.394 2.15 6.417 5.378 8.16l-.88 3.287a.55.55 0 0 0 .676.657l3.78-1.55c.983.25 2.016.386 3.046.386 6.627 0 12-4.373 12-9.768S18.627 3 12 3z"/>
            </svg>
          )}
          카카오로 시작하기
        </button>
      </div>
    </div>
  );
}