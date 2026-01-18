/**
 * MY Main Page - User Profile, Stats, Membership, and Rounds
 *
 * Displays comprehensive user information in 3 main sections:
 * 1. Profile & Golf Skills (ProfileTab)
 * 2. Membership & Economic Info (MembershipTab)
 * 3. Round History (RoundsTab)
 *
 * **MOCK DATA MODE**: Uses fake data instead of Supabase
 */

import MyPageTabs from '@/components/my/MyPageTabs';

export const dynamic = 'force-dynamic';

export default async function MyPage() {
  // Mock user data
  const mockUser = {
    id: 'mock-user-1',
    email: 'demo@tugol.dev',
    name: '김골프',
    phone: '010-1234-5678',
    segment_type: 'PRESTIGE',
    segment_score: 87.5,
    total_bookings: 45,
    total_spent: 8500000,
    no_show_count: 0,
    no_show_risk_score: 15,
    roles: ['user'],
  };

  // Mock user stats
  const mockUserStats = {
    id: 1,
    user_id: 'mock-user-1',
    handicap: 12.5,
    handicap_trend: 'IMPROVING',
    avg_score: 88.3,
    driving_distance: 245,
    fairway_accuracy: 68.5,
    gir_rate: 55.2,
    total_rounds: 42,
    completed_rounds: 40,
    best_score: 82,
    avg_booking_lead_time: 7,
  };

  // Mock membership
  const mockMembership = {
    id: 1,
    user_id: 'mock-user-1',
    membership_type: 'GOLD',
    tier_level: 3,
    points_balance: 15800,
    points_lifetime: 45200,
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
  };

  // Mock payment methods
  const mockPaymentMethods = [
    {
      id: 1,
      user_id: 'mock-user-1',
      payment_type: '신용카드',
      masked_number: '**** **** **** 1234',
      nickname: '주카드',
      is_default: true,
      is_active: true,
      created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      user_id: 'mock-user-1',
      payment_type: '체크카드',
      masked_number: '**** **** **** 5678',
      nickname: '보조카드',
      is_default: false,
      is_active: true,
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  // Mock gifts
  const mockGifts = [
    {
      id: 1,
      user_id: 'mock-user-1',
      gift_type: '할인쿠폰',
      gift_name: '주중 라운드 15% 할인',
      discount_rate: 15,
      gift_value: null,
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      is_used: false,
      used_at: null,
    },
    {
      id: 2,
      user_id: 'mock-user-1',
      gift_type: '포인트',
      gift_name: '신규가입 축하 포인트',
      discount_rate: null,
      gift_value: 10000,
      valid_until: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      is_used: false,
      used_at: null,
    },
  ];

  // Mock rounds
  const mockRounds = [
    {
      id: 1,
      user_id: 'mock-user-1',
      golf_club_id: 1,
      played_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      total_score: 87,
      front_nine: 44,
      back_nine: 43,
      tee_box: '블루',
      fairways_hit: 10,
      greens_in_regulation: 11,
      total_putts: 32,
      weather_condition: '맑음',
      wind_speed: 5,
      temperature: 22,
      notes: '드라이버 샷이 좋았음. 퍼팅 연습 필요.',
      playing_partners: ['이친구', '박동료'],
      golf_clubs: {
        id: 1,
        name: '인천 클럽72',
        location_name: '인천',
      },
    },
    {
      id: 2,
      user_id: 'mock-user-1',
      golf_club_id: 2,
      played_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      total_score: 92,
      front_nine: 47,
      back_nine: 45,
      tee_box: '화이트',
      fairways_hit: 8,
      greens_in_regulation: 9,
      total_putts: 35,
      weather_condition: '흐림',
      wind_speed: 12,
      temperature: 18,
      notes: '바람이 강해서 어려웠음.',
      playing_partners: ['김동료'],
      golf_clubs: {
        id: 2,
        name: '서울컨트리클럽',
        location_name: '서울',
      },
    },
    {
      id: 3,
      user_id: 'mock-user-1',
      golf_club_id: 1,
      played_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      total_score: 85,
      front_nine: 42,
      back_nine: 43,
      tee_box: '블루',
      fairways_hit: 11,
      greens_in_regulation: 12,
      total_putts: 30,
      weather_condition: '맑음',
      wind_speed: 3,
      temperature: 25,
      notes: '시즌 베스트 스코어!',
      playing_partners: ['이친구', '박동료', '최동료'],
      golf_clubs: {
        id: 1,
        name: '인천 클럽72',
        location_name: '인천',
      },
    },
  ];

  return (
    <MyPageTabs
      user={mockUser as any}
      userStats={mockUserStats}
      membership={mockMembership}
      paymentMethods={mockPaymentMethods}
      gifts={mockGifts}
      rounds={mockRounds}
    />
  );
}
