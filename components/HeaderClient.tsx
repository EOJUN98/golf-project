/**
 * SDD-08: Header Client Component
 *
 * Client-side header with auth state and navigation
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';
import { supabaseClient } from '@/lib/supabase/client';
import { User, LogOut, Calendar, Shield } from 'lucide-react';

interface HeaderClientProps {
  user: UserWithRoles | null;
}

export default function HeaderClient({ user }: HeaderClientProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <h1 className="text-2xl font-black italic text-green-600">TUGOL</h1>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-4">
            {user ? (
              <>
                {/* My Reservations */}
                <Link
                  href="/reservations"
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-green-600 transition-colors"
                >
                  <Calendar size={18} />
                  <span className="hidden sm:inline">내 예약</span>
                </Link>

                {/* Admin Menu (only for admins) */}
                {(user.isSuperAdmin || user.isAdmin || user.isClubAdmin) && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Shield size={18} />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                )}

                {/* User Menu */}
                <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {user.name || user.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.isSuperAdmin && 'SUPER ADMIN'}
                      {user.isAdmin && !user.isSuperAdmin && 'ADMIN'}
                      {user.isClubAdmin && !user.isSuperAdmin && !user.isAdmin && 'CLUB ADMIN'}
                      {!user.isSuperAdmin && !user.isAdmin && !user.isClubAdmin && '일반 회원'}
                    </p>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-red-600 transition-colors"
                    title="로그아웃"
                  >
                    <LogOut size={18} />
                    <span className="hidden sm:inline">로그아웃</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Login Button */}
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <User size={18} />
                  <span>로그인</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
