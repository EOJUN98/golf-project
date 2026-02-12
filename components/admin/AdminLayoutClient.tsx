/**
 * SDD-08: Admin Layout Client Component
 *
 * Client-side admin layout with navigation and user info display
 */

'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Calendar,
  Settings,
  BarChart3,
  Activity,
  Home,
  LogOut,
  Shield,
  DollarSign,
  UserX
} from 'lucide-react';
import { supabaseClient } from '@/lib/supabase/client';
import { UserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';

interface AdminLayoutClientProps {
  children: React.ReactNode;
  user: UserWithRoles;
}

export default function AdminLayoutClient({ children, user }: AdminLayoutClientProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full">
        <div className="p-6">
          {/* Logo/Title */}
          <div className="flex items-center gap-2 mb-8">
            <Shield className="text-blue-600" size={32} />
            <div>
              <h1 className="text-xl font-bold text-gray-900">TUGOL Admin</h1>
              <p className="text-xs text-gray-500">관리자 대시보드</p>
            </div>
          </div>

          {/* User Info */}
          <div className="mb-6 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name || user.email}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {user.isSuperAdmin && (
                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                  SUPER ADMIN
                </span>
              )}
              {user.isClubAdmin && !user.isSuperAdmin && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                  CLUB ADMIN
                </span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
            >
              <BarChart3 size={20} />
              <span className="font-medium">대시보드</span>
            </Link>

            <Link
              href="/admin/reservations"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
            >
              <Calendar size={20} />
              <span className="font-medium">예약 관리</span>
            </Link>

            <Link
              href="/admin/tee-times"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
            >
              <Calendar size={20} />
              <span className="font-medium">티타임 관리</span>
            </Link>

            <Link
              href="/admin/users"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
            >
              <Users size={20} />
              <span className="font-medium">회원 관리</span>
            </Link>

            <Link
              href="/admin/no-show"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
            >
              <UserX size={20} />
              <span className="font-medium">노쇼 관리</span>
            </Link>

            <Link
              href="/admin/settlements"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
            >
              <DollarSign size={20} />
              <span className="font-medium">정산 관리</span>
            </Link>

            {user.isSuperAdmin && (
              <Link
                href="/admin/crawler"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
              >
                <Activity size={20} />
                <span className="font-medium">크롤링 모니터</span>
              </Link>
            )}

            <Link
              href="/admin/settings"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
            >
              <Settings size={20} />
              <span className="font-medium">설정</span>
            </Link>
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 w-64 p-6 border-t border-gray-200">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mb-2"
          >
            <Home size={20} />
            <span className="font-medium">메인으로</span>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full"
          >
            <LogOut size={20} />
            <span className="font-medium">로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
