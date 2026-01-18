/**
 * Menu Client Component
 *
 * Settings and customer service menu
 */

'use client';

import { useRouter } from 'next/navigation';
import {
  Bell,
  Globe,
  HelpCircle,
  MessageSquare,
  Megaphone,
  UserX,
  LogOut,
  ChevronRight,
  User,
} from 'lucide-react';

interface MenuClientProps {
  user: {
    id: string;
    email: string;
    name: string;
    phone: string;
  };
}

export default function MenuClient({ user }: MenuClientProps) {
  const router = useRouter();

  const menuSections = [
    {
      title: '고객센터',
      items: [
        {
          icon: Megaphone,
          label: '공지사항',
          href: '/menu/notices',
          badge: '3',
        },
        {
          icon: HelpCircle,
          label: 'FAQ',
          href: '/menu/faq',
        },
        {
          icon: MessageSquare,
          label: '1:1 문의',
          href: '/menu/inquiry',
        },
      ],
    },
    {
      title: '설정',
      items: [
        {
          icon: Globe,
          label: '언어 및 국가 설정',
          href: '/menu/language',
          description: '한국어',
        },
        {
          icon: Bell,
          label: '알림 설정',
          href: '/menu/notifications',
        },
        {
          icon: UserX,
          label: '조인 블랙리스트 관리',
          href: '/menu/blacklist',
        },
      ],
    },
  ];

  const handleLogout = () => {
    // Mock logout
    alert('로그아웃되었습니다');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <h1 className="text-2xl font-black text-gray-900 mb-2">메뉴</h1>
        <div className="flex items-center gap-3 mt-4 p-4 bg-green-50 rounded-xl">
          <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
            <User size={24} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="p-4 space-y-6">
        {menuSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-sm font-bold text-gray-500 mb-3 px-2">
              {section.title}
            </h2>
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-200">
              {section.items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => router.push(item.href)}
                    className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                      index !== section.items.length - 1
                        ? 'border-b border-gray-200'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} className="text-gray-600" />
                      <div className="text-left">
                        <p className="font-medium text-gray-900">
                          {item.label}
                        </p>
                        {item.description && (
                          <p className="text-sm text-gray-600">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight size={18} className="text-gray-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Logout Button */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <LogOut size={20} className="text-red-600" />
              <p className="font-medium text-red-600">로그아웃</p>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* App Version */}
      <div className="text-center py-6 text-sm text-gray-500">
        <p>TUGOL v1.0.0</p>
        <p className="text-xs mt-1">© 2026 TUGOL. All rights reserved.</p>
      </div>
    </div>
  );
}
