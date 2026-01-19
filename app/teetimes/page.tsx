/**
 * Tee Times Page - Golf Course List with Map
 *
 * Shows:
 * - Map with golf course locations
 * - List of golf courses with lowest prices
 * - Click on price to see course details
 *
 * **MOCK DATA MODE**: Uses fake data
 */

import TeeTimesClient from '@/components/teetimes/TeeTimesClient';
import PageCanvas from '@/components/layout/PageCanvas';

export const dynamic = 'force-dynamic';

export default async function TeeTimesPage() {
  // Mock golf courses data
  const mockGolfCourses = [
    {
      id: 1,
      name: '인천 클럽72',
      location_name: '인천 서구',
      latitude: 37.4563,
      longitude: 126.6345,
      lowest_price: 60000,
      avg_rating: 4.5,
      total_reviews: 1250,
      distance_km: 5.2,
      description: '도심에서 가까운 명품 골프장',
      facilities: ['레스토랑', '프로샵', '사우나', '연습장'],
    },
    {
      id: 2,
      name: '서울컨트리클럽',
      location_name: '서울 강남구',
      latitude: 37.4979,
      longitude: 127.0276,
      lowest_price: 85000,
      avg_rating: 4.8,
      total_reviews: 2100,
      distance_km: 12.3,
      description: '프리미엄 골프 코스',
      facilities: ['레스토랑', '프로샵', '사우나', '연습장', '호텔'],
    },
    {
      id: 3,
      name: '제주 오션뷰 CC',
      location_name: '제주도',
      latitude: 33.4890,
      longitude: 126.4983,
      lowest_price: 120000,
      avg_rating: 4.9,
      total_reviews: 890,
      distance_km: 450.0,
      description: '바다 전망의 환상적인 코스',
      facilities: ['레스토랑', '프로샵', '사우나', '연습장', '호텔', 'SPA'],
    },
    {
      id: 4,
      name: '경기 레이크사이드',
      location_name: '경기 용인',
      latitude: 37.2411,
      longitude: 127.1775,
      lowest_price: 72000,
      avg_rating: 4.3,
      total_reviews: 650,
      distance_km: 28.5,
      description: '호수 옆 아름다운 코스',
      facilities: ['레스토랑', '프로샵', '연습장'],
    },
    {
      id: 5,
      name: '강원 파인힐스',
      location_name: '강원 평창',
      latitude: 37.3704,
      longitude: 128.3900,
      lowest_price: 95000,
      avg_rating: 4.7,
      total_reviews: 780,
      distance_km: 156.0,
      description: '산악 지형의 챌린징 코스',
      facilities: ['레스토랑', '프로샵', '사우나', '연습장', '펜션'],
    },
  ];

  return (
    <PageCanvas>
      <TeeTimesClient golfCourses={mockGolfCourses} />
    </PageCanvas>
  );
}
