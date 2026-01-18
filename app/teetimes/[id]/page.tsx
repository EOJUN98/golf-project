/**
 * Golf Course Detail Page
 *
 * Shows comprehensive course information:
 * - Course overview and facilities
 * - Green speed, total length
 * - Course map
 * - Strategy tips
 * - Handicap information
 * - Weather forecast (wind, rain probability)
 * - Course issues (maintenance, tournaments, etc.)
 * - CTA to view tee times
 *
 * **MOCK DATA MODE**: Uses fake data
 */

import GolfCourseDetailClient from '@/components/teetimes/GolfCourseDetailClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GolfCourseDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Mock golf course detail data
  const mockCourseDetail = {
    id: parseInt(id),
    name: '인천 클럽72',
    location_name: '인천 서구',
    latitude: 37.4563,
    longitude: 126.6345,
    description: '도심에서 가까운 명품 골프장으로, 뛰어난 코스 관리와 편리한 시설로 골퍼들에게 인기가 높습니다.',
    avg_rating: 4.5,
    total_reviews: 1250,
    facilities: ['레스토랑', '프로샵', '사우나', '연습장', '락커룸', '캐디'],

    // Course details
    total_length: 6842,
    par: 72,
    green_speed: 10.5,
    green_type: 'Bent Grass',
    slope_rating: 128,
    course_rating: 72.5,
    holes: 18,

    // Course map
    course_map_url: '/images/course-map-placeholder.png',

    // Hole details (first 4 holes)
    hole_details: [
      { hole: 1, par: 4, length: 385, handicap: 7 },
      { hole: 2, par: 3, length: 165, handicap: 15 },
      { hole: 3, par: 5, length: 520, handicap: 3 },
      { hole: 4, par: 4, length: 410, handicap: 5 },
    ],

    // Strategy tips
    strategy_tips: [
      '드라이버 샷은 페어웨이 중앙을 노리세요',
      '그린 주변 벙커가 많으니 주의하세요',
      '바람이 강한 날에는 클럽 선택에 신중하세요',
      '파5 홀에서는 2온을 노릴 수 있습니다',
    ],

    // Weather forecast
    weather: {
      temperature: 22,
      condition: '맑음',
      wind_speed: 5,
      wind_direction: '서풍',
      rain_probability: 10,
      rainfall: 0,
      forecast_date: new Date().toISOString(),
    },

    // Course notices
    notices: [
      {
        id: 1,
        notice_type: 'MAINTENANCE',
        severity: 'INFO',
        title: '7번 홀 그린 보수 작업',
        description: '7번 홀 그린 일부 구역 보수 중입니다. 임시 그린을 사용하세요.',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        notice_type: 'TOURNAMENT',
        severity: 'WARNING',
        title: '주말 프로 대회 진행',
        description: '이번 주말 프로 대회가 진행됩니다. 일부 시간대 예약 제한이 있습니다.',
        start_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  };

  return <GolfCourseDetailClient course={mockCourseDetail} />;
}
