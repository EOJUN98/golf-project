/**
 * MY Page - Membership & Economic Info Tab
 *
 * Displays:
 * - Membership tier and status
 * - Points/mileage balance
 * - Payment methods
 * - Active gifts and vouchers
 */

'use client';

import {
  Crown,
  Star,
  Coins,
  CreditCard,
  Gift,
  Plus,
  ChevronRight,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import type { UserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';

interface MembershipTabProps {
  user: UserWithRoles;
  membership: any;
  paymentMethods: any[];
  gifts: any[];
}

export default function MembershipTab({
  user,
  membership,
  paymentMethods,
  gifts,
}: MembershipTabProps) {
  // Membership tier badge
  const getMembershipBadge = (type: string | null) => {
    const config: Record<string, any> = {
      GOLD: {
        bg: 'bg-gradient-to-r from-yellow-500 to-yellow-700',
        icon: '👑',
        label: 'GOLD',
        desc: '골드 회원',
      },
      SILVER: {
        bg: 'bg-gradient-to-r from-gray-400 to-gray-600',
        icon: '⭐',
        label: 'SILVER',
        desc: '실버 회원',
      },
      BRONZE: {
        bg: 'bg-gradient-to-r from-orange-400 to-orange-600',
        icon: '🥉',
        label: 'BRONZE',
        desc: '브론즈 회원',
      },
      FREE: {
        bg: 'bg-gradient-to-r from-gray-500 to-gray-700',
        icon: '🌱',
        label: 'FREE',
        desc: '무료 회원',
      },
    };

    return config[type || 'FREE'] || config.FREE;
  };

  const membershipBadge = getMembershipBadge(membership?.membership_type);

  return (
    <div className="p-4 space-y-4">
      {/* Membership Status */}
      <div className={`${membershipBadge.bg} text-white rounded-2xl p-6 shadow-lg`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{membershipBadge.icon}</span>
            <div>
              <h2 className="text-2xl font-black">{membershipBadge.label}</h2>
              <p className="text-sm opacity-90">{membershipBadge.desc}</p>
            </div>
          </div>
          {membership && (
            <div className="text-right">
              <p className="text-xs opacity-75">티어 레벨</p>
              <p className="text-3xl font-black">{membership.tier_level || 1}</p>
            </div>
          )}
        </div>

        {/* Membership validity */}
        {membership && membership.valid_until && (
          <div className="pt-4 border-t border-white/20">
            <div className="flex items-center justify-between text-sm">
              <span className="opacity-75">유효 기간</span>
              <span className="font-bold">
                {new Date(membership.valid_until).toLocaleDateString('ko-KR')}
              </span>
            </div>
          </div>
        )}

        {!membership && (
          <div className="pt-4 border-t border-white/20 text-center">
            <p className="text-sm opacity-90">멤버십에 가입하고 혜택을 받아보세요!</p>
            <button className="mt-3 px-4 py-2 bg-white text-gray-900 rounded-lg font-bold hover:bg-gray-100 transition-colors">
              멤버십 가입하기
            </button>
          </div>
        )}
      </div>

      {/* Points & Mileage */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Coins size={20} className="text-yellow-600" />
          포인트 & 마일리지
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Current Points */}
          <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl">
            <p className="text-sm text-gray-600 mb-1">보유 포인트</p>
            <p className="text-2xl font-black text-yellow-900">
              {membership?.points_balance?.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-gray-500 mt-1">P</p>
          </div>

          {/* Lifetime Points */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
            <p className="text-sm text-gray-600 mb-1">누적 포인트</p>
            <p className="text-2xl font-black text-blue-900">
              {membership?.points_lifetime?.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-gray-500 mt-1">P</p>
          </div>
        </div>

        {!membership && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-sm text-gray-600">
              포인트 정보가 준비 중입니다.
            </p>
          </div>
        )}
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <CreditCard size={20} className="text-blue-600" />
            결제 수단
          </h3>
          <button className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium">
            <Plus size={16} />
            추가
          </button>
        </div>

        {paymentMethods.length > 0 ? (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-green-500 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded flex items-center justify-center">
                      <CreditCard size={20} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">
                        {method.nickname || method.payment_type}
                      </p>
                      <p className="text-sm text-gray-500">{method.masked_number}</p>
                    </div>
                  </div>
                  {method.is_default && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">
                      기본
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-gray-50 rounded-lg text-center">
            <CreditCard size={32} className="text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-3">
              등록된 결제 수단이 없습니다
            </p>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
              결제 수단 추가하기
            </button>
          </div>
        )}
      </div>

      {/* Active Gifts & Vouchers */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Gift size={20} className="text-pink-600" />
          선물 & 쿠폰
          {gifts.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
              {gifts.length}
            </span>
          )}
        </h3>

        {gifts.length > 0 ? (
          <div className="space-y-3">
            {gifts.map((gift) => (
              <div
                key={gift.id}
                className="p-4 border-2 border-pink-200 bg-gradient-to-r from-pink-50 to-pink-100 rounded-xl"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Gift size={16} className="text-pink-600" />
                      <span className="text-xs font-bold text-pink-700 bg-pink-200 px-2 py-0.5 rounded">
                        {gift.gift_type}
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-900">{gift.gift_name}</h4>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar size={14} />
                    <span>
                      {new Date(gift.valid_until).toLocaleDateString('ko-KR')}까지
                    </span>
                  </div>
                  {gift.discount_rate && (
                    <span className="font-bold text-pink-700">
                      {gift.discount_rate}% 할인
                    </span>
                  )}
                  {gift.gift_value && (
                    <span className="font-bold text-pink-700">
                      {gift.gift_value.toLocaleString()}원
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-gray-50 rounded-lg text-center">
            <Gift size={32} className="text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              사용 가능한 쿠폰이 없습니다
            </p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-5">
        <h3 className="font-bold text-gray-900 mb-4">이용 통계</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">총 예약</p>
            <p className="text-lg font-bold text-gray-900">0</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">완료</p>
            <p className="text-lg font-bold text-green-600">0</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">취소</p>
            <p className="text-lg font-bold text-red-600">0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
