/**
 * SDD-10: MY Page Enhanced UX - Tab Navigation & Content
 *
 * Tabbed interface for:
 * - Profile & Skills
 * - Membership & Economy
 * - Round History
 */

'use client';

import { useState } from 'react';
import {
  User,
  Trophy,
  Wallet,
} from 'lucide-react';
import ProfileTab from './ProfileTab';
import MembershipTab from './MembershipTab';
import RoundsTab from './RoundsTab';
import type { UserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';

export type MyPageTab = 'profile' | 'membership' | 'rounds';

interface MyPageTabsProps {
  user: UserWithRoles;
  userStats: any;
  membership: any;
  paymentMethods: any[];
  gifts: any[];
  rounds: any[];
}

export default function MyPageTabs({
  user,
  userStats,
  membership,
  paymentMethods,
  gifts,
  rounds,
}: MyPageTabsProps) {
  const [activeTab, setActiveTab] = useState<MyPageTab>('profile');
  const tabs = [
    {
      id: 'profile' as MyPageTab,
      label: '프로필',
      icon: User,
      subtitle: '실력 & 통계',
    },
    {
      id: 'membership' as MyPageTab,
      label: '멤버십',
      icon: Wallet,
      subtitle: '포인트 & 혜택',
      badge: gifts.length > 0 ? gifts.length : undefined,
    },
    {
      id: 'rounds' as MyPageTab,
      label: '라운드',
      icon: Trophy,
      subtitle: '기록 & 스코어',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto pb-20">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex flex-col items-center justify-center
                  py-3 relative transition-all duration-200
                  ${
                    isActive
                      ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <div className="relative">
                  <Icon size={20} className="mb-1" />
                  {tab.badge && tab.badge > 0 && (
                    <div className="absolute -top-1 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </div>
                  )}
                </div>
                <span className="text-xs font-bold">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'profile' && (
          <ProfileTab user={user} userStats={userStats} />
        )}
        {activeTab === 'membership' && (
          <MembershipTab
            user={user}
            membership={membership}
            paymentMethods={paymentMethods}
            gifts={gifts}
          />
        )}
        {activeTab === 'rounds' && <RoundsTab user={user} rounds={rounds} />}
      </div>
    </div>
  );
}
