import Link from 'next/link';
import { MapPin, User, LogOut, Shield } from 'lucide-react';
import { logout } from '@/app/login/actions';
import { getCurrentUserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';

export default async function SiteHeader() {
  const user = await getCurrentUserWithRoles();
  const canAccessAdmin = Boolean(user && (user.isSuperAdmin || user.isAdmin || user.isClubAdmin));
  const userRoleLabel = !user
    ? ''
    : (user.isSuperAdmin || user.isAdmin)
      ? 'ADMIN'
        : user.isClubAdmin
          ? 'CLUB ADMIN'
          : 'MEMBER';

  return (
    <header className="bg-white p-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
      <Link href="/" className="text-2xl font-black text-black tracking-tighter cursor-pointer hover:text-green-600 transition-colors">
        TUGOL
      </Link>

      <div className="flex items-center gap-2">
        {/* Location Badge */}
        <div className="hidden sm:flex items-center text-sm font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
          <MapPin size={14} className="mr-1 text-blue-500" />
          인천 (Club 72)
        </div>

        {/* Auth Buttons */}
        {user ? (
          <div className="flex items-center gap-2">
            {canAccessAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors text-sm font-medium border border-purple-300"
                title="관리자 페이지"
              >
                <Shield size={14} />
                <span className="hidden sm:inline">관리자 콘솔</span>
              </Link>
            )}

            {/* SDD-09: MY Menu - Link to user's reservations */}
            <Link
              href="/my/reservations"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors text-sm font-medium"
              title="내 예약"
            >
              <User size={16} />
              <span>MY</span>
            </Link>

            {/* User role badge */}
            <div className="flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-semibold">
              {userRoleLabel}
            </div>

            {/* Logout Button */}
            <form action={logout}>
              <button
                type="submit"
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="로그아웃"
              >
                <LogOut size={20} />
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors text-sm font-bold"
          >
            로그인
          </Link>
        )}
      </div>
    </header>
  );
}
