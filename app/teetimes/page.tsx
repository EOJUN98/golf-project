import TeeTimesClient from '@/components/teetimes/TeeTimesClient';
import PageCanvas from '@/components/layout/PageCanvas';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function TeeTimesPage() {
  const supabase = await createSupabaseServerClient();
  const [clubsResult, teeTimesResult] = await Promise.all([
    supabase
      .from('golf_clubs')
      .select('id, name, location_name, location_lat, location_lng')
      .order('name', { ascending: true }),
    supabase
      .from('tee_times')
      .select('golf_club_id, base_price')
      .eq('status', 'OPEN')
      .gte('tee_off', new Date().toISOString()),
  ]);

  if (clubsResult.error) {
    console.error('[TeeTimesPage] Failed to fetch golf clubs:', clubsResult.error);
  }

  if (teeTimesResult.error) {
    console.error('[TeeTimesPage] Failed to fetch open tee times:', teeTimesResult.error);
  }

  const clubs = clubsResult.data || [];
  const openTeeTimes = teeTimesResult.data || [];

  const lowestPriceMap = new Map<number, number>();
  for (const teeTime of openTeeTimes) {
    const currentLowest = lowestPriceMap.get(teeTime.golf_club_id);
    if (currentLowest === undefined || teeTime.base_price < currentLowest) {
      lowestPriceMap.set(teeTime.golf_club_id, teeTime.base_price);
    }
  }

  const referenceLat = 37.5665;
  const referenceLng = 126.978;
  const toRadians = (degree: number) => (degree * Math.PI) / 180;
  const calcDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const earthRadiusKm = 6371;
    const deltaLat = toRadians(lat2 - lat1);
    const deltaLng = toRadians(lng2 - lng1);
    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(deltaLng / 2) *
        Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(earthRadiusKm * c * 10) / 10;
  };

  const golfCourses = clubs
    .filter((club) => lowestPriceMap.has(club.id))
    .map((club) => {
      const latitude = club.location_lat ?? referenceLat;
      const longitude = club.location_lng ?? referenceLng;
      const lowestPrice = lowestPriceMap.get(club.id) ?? 0;
      const distanceKm = calcDistanceKm(referenceLat, referenceLng, latitude, longitude);

      return {
        id: club.id,
        name: club.name,
        location_name: club.location_name,
        latitude,
        longitude,
        lowest_price: lowestPrice,
        avg_rating: 0,
        total_reviews: 0,
        distance_km: distanceKm,
        description: `${club.location_name} 지역 골프장`,
        facilities: ['클럽하우스', '프로샵'],
      };
    });

  return (
    <PageCanvas>
      <TeeTimesClient golfCourses={golfCourses} />
    </PageCanvas>
  );
}
