'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Clock, Calendar, User, Menu } from 'lucide-react';

/**
 * Bottom Navigation Bar Component
 *
 * Mobile-optimized bottom navigation with 5 main tabs:
 * - 홈 (Home): Main tee time search page
 * - 티타임 (Tee Times): Golf course list with map
 * - 예약 (Reservations): User's current and past reservations
 * - MY: User profile, stats, membership, and rounds history
 * - 메뉴 (Menu): Settings and customer service
 *
 * Active tab is highlighted based on current pathname.
 */
export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    {
      name: '홈',
      icon: Home,
      href: '/',
      isActive: pathname === '/',
    },
    {
      name: '티타임',
      icon: Clock,
      href: '/teetimes',
      isActive: pathname.startsWith('/teetimes'),
    },
    {
      name: '예약',
      icon: Calendar,
      href: '/my/reservations',
      isActive: pathname.startsWith('/my/reservations'),
    },
    {
      name: 'MY',
      icon: User,
      href: '/my',
      isActive: pathname === '/my',
    },
    {
      name: '메뉴',
      icon: Menu,
      href: '/menu',
      isActive: pathname.startsWith('/menu'),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.isActive;

          return (
            <button
              key={tab.name}
              onClick={() => router.push(tab.href)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
                isActive
                  ? 'text-green-600 scale-105'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon
                size={24}
                className={`mb-1 ${isActive ? 'stroke-2' : 'stroke-1.5'}`}
              />
              <span
                className={`text-xs font-medium ${
                  isActive ? 'font-bold' : 'font-normal'
                }`}
              >
                {tab.name}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
