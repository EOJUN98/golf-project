'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, User, LogOut, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logout } from '@/app/login/actions';

export default function SiteHeader() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    async function checkUser() {
      try {
        const { data: { user: sessionUser } } = await supabase.auth.getUser();

        if (sessionUser) {
          setUser(sessionUser);

          // Fetch user name from database
          const { data: dbUser } = await (supabase as any)
            .from('users')
            .select('name')
            .eq('id', sessionUser.id)
            .single();

          if (dbUser?.name) {
            setUserName(dbUser.name);
          } else {
            // Fallback to email if no name
            setUserName(sessionUser.email?.split('@')[0] || 'User');
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    }

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        setUserName('');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      try {
        await logout();
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
  };

  return (
    <header className="bg-white p-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
      <h1
        onClick={() => router.push('/')}
        className="text-2xl font-black text-black tracking-tighter cursor-pointer hover:text-green-600 transition-colors"
      >
        TUGOL
      </h1>

      <div className="flex items-center gap-3">
        {/* Location Badge */}
        <div className="flex items-center text-sm font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
          <MapPin size={14} className="mr-1 text-blue-500" />
          인천 (Club 72)
        </div>

        {/* SDD-09: Admin Access Button - Demo Mode */}
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors text-sm font-medium border border-purple-300"
          title="관리자 페이지 (Demo)"
        >
          <Shield size={14} />
          <span className="hidden sm:inline">Admin</span>
        </button>

        {/* Auth Buttons */}
        {loading ? (
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
        ) : user ? (
          <div className="flex items-center gap-2">
            {/* SDD-09: MY Menu - Link to user's reservations */}
            <button
              onClick={() => router.push('/my/reservations')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors text-sm font-medium"
              title="내 예약"
            >
              <User size={16} />
              <span>MY</span>
            </button>

            {/* User Info Dropdown (could be expanded to dropdown menu) */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              {userName}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="로그아웃"
            >
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors text-sm font-bold"
          >
            로그인
          </button>
        )}
      </div>
    </header>
  );
}
