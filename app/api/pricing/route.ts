import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { calculatePricing } from '@/utils/pricingEngine';
import { Database } from '@/types/database';

type TeeTime = Database['public']['Tables']['tee_times']['Row'];
type Weather = Database['public']['Tables']['weather_cache']['Row'];
type User = Database['public']['Tables']['users']['Row'];
type GolfClub = Database['public']['Tables']['golf_clubs']['Row'];

type ExternalSnapshotRow = {
  course_name: string;
  play_date: string | null;
  final_price: number | null;
  crawled_at: string;
  availability_status: 'AVAILABLE' | 'NO_DATA' | 'AUTH_REQUIRED' | 'REMOVED' | 'FAILED';
};

function isValidDateParam(value: string | null): value is string {
  if (!value) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function weatherToText(weather: Weather | null) {
  if (!weather) return 'Unknown';
  if (weather.rn1 >= 1 || weather.pop >= 60) return 'Rain';
  if (weather.pop >= 30) return 'Cloudy';
  return 'Sunny';
}

function selectClosestWeather(teeOffISO: string, weatherRows: Weather[]): Weather | null {
  if (weatherRows.length === 0) return null;
  const targetHour = new Date(teeOffISO).getHours();

  let best: Weather | null = null;
  let bestGap = Number.POSITIVE_INFINITY;

  for (const weather of weatherRows) {
    const gap = Math.abs(weather.target_hour - targetHour);
    if (gap < bestGap) {
      best = weather;
      bestGap = gap;
    }
  }

  return best;
}

function toSeoulDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function normalizeCourseName(name: string): string {
  return name.replace(/\s+/g, '').toLowerCase();
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const searchParams = request.nextUrl.searchParams;

  const dateParam = searchParams.get('date');
  const clubIdParam = searchParams.get('golfClubId');
  const distanceParam = searchParams.get('userDistanceKm');
  const limitParam = searchParams.get('limit');

  const normalizedDateParam = isValidDateParam(dateParam) ? dateParam : null;
  const hasDateFilter = normalizedDateParam !== null;
  const golfClubId = clubIdParam ? Number(clubIdParam) : null;
  const userDistanceKm = distanceParam ? Number(distanceParam) : undefined;
  const parsedLimit = limitParam ? Number(limitParam) : 50;
  const limit = Number.isFinite(parsedLimit)
    ? Math.max(1, Math.min(200, Math.floor(parsedLimit)))
    : 50;

  let teeTimeQuery = supabase
    .from('tee_times')
    .select('*')
    .eq('status', 'OPEN')
    .order('tee_off', { ascending: true })
    .limit(limit);

  if (hasDateFilter) {
    const startISO = new Date(`${normalizedDateParam}T00:00:00+09:00`).toISOString();
    const endISO = new Date(`${normalizedDateParam}T23:59:59.999+09:00`).toISOString();
    teeTimeQuery = teeTimeQuery.gte('tee_off', startISO).lte('tee_off', endISO);
  } else {
    teeTimeQuery = teeTimeQuery.gte('tee_off', now.toISOString());
  }

  if (Number.isFinite(golfClubId)) {
    teeTimeQuery = teeTimeQuery.eq('golf_club_id', Number(golfClubId));
  }

  const { data: teeTimes, error: teeTimesError } = await teeTimeQuery;
  if (teeTimesError) {
    return NextResponse.json(
      { status: 'error', error: 'Failed to fetch tee times' },
      { status: 500 }
    );
  }

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let user: User | null = null;
  if (authUser) {
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
    user = userData;
  }

  let weatherRows: Weather[] = [];
  const weatherDate = hasDateFilter
    ? normalizedDateParam
    : teeTimes && teeTimes.length > 0
      ? toSeoulDate(new Date(teeTimes[0].tee_off))
      : toSeoulDate(now);

  const { data: weatherData, error: weatherError } = await supabase
    .from('weather_cache')
    .select('*')
    .eq('target_date', weatherDate)
    .order('target_hour', { ascending: true });

  if (!weatherError && weatherData) {
    weatherRows = weatherData;
  }

  const results = (teeTimes || []).map((teeTime: TeeTime) => {
    const weather = selectClosestWeather(teeTime.tee_off, weatherRows);
    const pricing = calculatePricing({
      teeTime,
      user: user || undefined,
      weather: weather || undefined,
      userDistanceKm: Number.isFinite(userDistanceKm) ? userDistanceKm : undefined,
      now,
    });

    return {
      ...teeTime,
      finalPrice: pricing.finalPrice,
      originalPrice: pricing.basePrice,
      discountRate: Math.round(pricing.discountRate * 100),
      isBlocked: pricing.isBlocked,
      blockReason: pricing.blockReason,
      factors: pricing.factors,
      stepStatus: pricing.stepStatus,
      panicMode: pricing.panicMode,
    };
  });

  // External market reference (crawler snapshots):
  // Attach latest available external final price per course/date as a reference signal.
  const teeTimeRows = teeTimes || [];
  const clubIds = Array.from(new Set(teeTimeRows.map((row) => row.golf_club_id)));

  let clubNameById = new Map<number, string>();
  if (clubIds.length > 0) {
    const { data: clubs } = await supabase
      .from('golf_clubs')
      .select('id, name')
      .in('id', clubIds);

    clubNameById = new Map(
      (clubs || []).map((club: Pick<GolfClub, 'id' | 'name'>) => [club.id, club.name])
    );
  }

  const dateFilters = Array.from(
    new Set(teeTimeRows.map((row) => toSeoulDate(new Date(row.tee_off))))
  );

  const marketSnapshotByKey = new Map<string, ExternalSnapshotRow>();

  if (dateFilters.length > 0) {
    const firstDate = dateFilters[0];
    const lastDate = dateFilters[dateFilters.length - 1];

    const externalQuery = (supabase as any)
      .from('external_price_snapshots')
      .select('course_name, play_date, final_price, crawled_at, availability_status')
      .gte('play_date', firstDate)
      .lte('play_date', lastDate)
      .order('crawled_at', { ascending: false })
      .limit(2000);

    const { data: externalSnapshots } = await externalQuery;

    for (const row of (externalSnapshots || []) as ExternalSnapshotRow[]) {
      if (!row.play_date) continue;
      const key = `${normalizeCourseName(row.course_name)}|${row.play_date}`;
      if (marketSnapshotByKey.has(key)) continue;
      marketSnapshotByKey.set(key, row);
    }
  }

  const enrichedResults = results.map((row) => {
    const courseName = clubNameById.get(row.golf_club_id);
    const playDate = toSeoulDate(new Date(row.tee_off));
    const key = courseName ? `${normalizeCourseName(courseName)}|${playDate}` : null;
    const marketSnapshot = key ? marketSnapshotByKey.get(key) : undefined;

    const marketPrice =
      marketSnapshot &&
      marketSnapshot.availability_status === 'AVAILABLE' &&
      marketSnapshot.final_price !== null
        ? Number(marketSnapshot.final_price)
        : null;

    const marketDelta =
      marketPrice !== null ? Math.round(Number(row.finalPrice) - marketPrice) : null;

    return {
      ...row,
      marketReference: marketSnapshot
        ? {
            courseName: marketSnapshot.course_name,
            playDate: marketSnapshot.play_date,
            finalPrice: marketPrice,
            crawledAt: marketSnapshot.crawled_at,
            availabilityStatus: marketSnapshot.availability_status,
            deltaFromMarket: marketDelta,
          }
        : null,
    };
  });

  const referenceWeather = weatherRows.length > 0 ? weatherRows[0] : null;

  return NextResponse.json({
    status: 'success',
    data: enrichedResults,
    user: {
      segment: user?.segment || null,
      isNearby: Number.isFinite(userDistanceKm) ? (userDistanceKm as number) <= 15 : null,
    },
    weather: {
      rainProb: referenceWeather?.pop ?? null,
      status: weatherToText(referenceWeather),
    },
    meta: {
      engine: 'v2-step-down',
      generatedAt: now.toISOString(),
      marketReference: {
        enabled: true,
        snapshotKeys: marketSnapshotByKey.size,
      },
      filters: {
        date: normalizedDateParam,
        golfClubId: Number.isFinite(golfClubId) ? golfClubId : null,
        limit,
      },
    },
  });
}
