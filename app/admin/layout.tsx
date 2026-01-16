'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  Users,
  Calendar,
  Settings,
  BarChart3,
  Home,
  LogOut,
  Shield,
  Loader2
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdminStatus() {
      try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push('/');
          return;
        }

        // Check if user is admin
        const { data: user, error } = await (supabase as any)
          .from('users')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();

        if (error || !user?.is_admin) {
          router.push('/');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Admin check failed:', error);
        router.push('/');
      } finally {
        setIsChecking(false);
      }
    }

    checkAdminStatus();
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-gray-600">관리자 권한 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

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
              href="/admin/users"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
            >
              <Users size={20} />
              <span className="font-medium">회원 관리</span>
            </Link>

            <Link
              href="/admin/tee-times"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
            >
              <Calendar size={20} />
              <span className="font-medium">티타임 관리</span>
            </Link>

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
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}
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
