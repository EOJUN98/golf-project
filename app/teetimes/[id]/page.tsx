import { notFound } from 'next/navigation';
import GolfCourseDetailClient from '@/components/teetimes/GolfCourseDetailClient';
import PageCanvas from '@/components/layout/PageCanvas';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GolfCourseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const clubId = Number(id);
  if (!Number.isFinite(clubId)) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const [clubResult, weatherResult, reviewCountResult] = await Promise.all([
    supabase
      .from('golf_clubs')
      .select('id, name, location_name, location_lat, location_lng')
      .eq('id', clubId)
      .single(),
    supabase
      .from('weather_cache')
      .select('*')
      .eq('target_date', today)
      .order('target_hour', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('reservations')
      .select('id, tee_times!inner(golf_club_id)', { head: true, count: 'exact' })
      .eq('status', 'COMPLETED')
      .eq('tee_times.golf_club_id', clubId),
  ]);

  if (clubResult.error || !clubResult.data) {
    notFound();
  }

  if (weatherResult.error) {
    console.error('[GolfCourseDetailPage] Failed to fetch weather:', weatherResult.error);
  }

  if (reviewCountResult.error) {
    console.error('[GolfCourseDetailPage] Failed to fetch review count:', reviewCountResult.error);
  }

  const weatherRow = weatherResult.data;
  const reviewCount = reviewCountResult.count ?? 0;
  const rainProbability = weatherRow?.pop ?? 0;
  const rainfall = weatherRow?.rn1 ?? 0;
  const weatherCondition = rainfall >= 1 || rainProbability >= 60
    ? '비'
    : rainProbability >= 30
      ? '흐림'
      : '맑음';

  const course = {
    id: clubResult.data.id,
    name: clubResult.data.name,
    location_name: clubResult.data.location_name,
    description: `${clubResult.data.location_name} 지역 골프장입니다.`,
    avg_rating: 0,
    total_reviews: reviewCount,
    facilities: ['클럽하우스', '프로샵'],
    total_length: 0,
    par: 72,
    green_speed: 0,
    green_type: '정보 없음',
    slope_rating: 0,
    course_rating: 0,
    holes: 18,
    strategy_tips: [
      '티오프 전 최신 기상 상태를 확인하세요.',
      '코스 진행 안내는 구장 공지를 우선 확인하세요.',
    ],
    weather: {
      temperature: 20,
      condition: weatherCondition,
      wind_speed: weatherRow?.wsd ?? 0,
      wind_direction: '정보 없음',
      rain_probability: rainProbability,
      rainfall,
    },
    notices: [],
  };

  return (
    <PageCanvas>
      <GolfCourseDetailClient course={course} />
    </PageCanvas>
  );
}
