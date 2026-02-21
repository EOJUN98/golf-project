import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClientOptional } from '@/lib/supabase/admin';
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
  payload: unknown;
};

type ManualNote = {
  text: string | null;
  traits: string[];
  updatedAt: string | null;
  updatedByEmail: string | null;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseTraits(rawTraits: unknown): string[] {
  if (!Array.isArray(rawTraits)) return [];

  const traits: string[] = [];
  const seen = new Set<string>();

  for (const item of rawTraits) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    traits.push(trimmed);
  }

  return traits;
}

function parseManualNote(payload: unknown): ManualNote | null {
  if (!isRecord(payload)) return null;
  const raw = payload.manual_note;
  if (!isRecord(raw)) return null;

  const textRaw = typeof raw.text === 'string' ? raw.text.trim() : '';
  const traits = parseTraits(raw.traits);

  if (!textRaw && traits.length === 0) return null;

  return {
    text: textRaw || null,
    traits,
    updatedAt: typeof raw.updated_at === 'string' ? raw.updated_at : null,
    updatedByEmail: typeof raw.updated_by_email === 'string' ? raw.updated_by_email : null,
  };
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClientOptional();
  const marketSnapshotClient = adminClient ?? supabase;
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

    const externalQuery = (marketSnapshotClient as any)
      .from('external_price_snapshots')
      .select('course_name, play_date, final_price, crawled_at, availability_status, payload')
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

  const results = teeTimeRows.map((teeTime: TeeTime) => {
    const weather = selectClosestWeather(teeTime.tee_off, weatherRows);
    const courseName = clubNameById.get(teeTime.golf_club_id);
    const playDate = toSeoulDate(new Date(teeTime.tee_off));
    const key = courseName ? `${normalizeCourseName(courseName)}|${playDate}` : null;
    const marketSnapshot = key ? marketSnapshotByKey.get(key) : undefined;
    const manualNote = parseManualNote(marketSnapshot?.payload);
    const marketTraits = manualNote?.traits || [];

    const marketPrice =
      marketSnapshot &&
      marketSnapshot.availability_status === 'AVAILABLE' &&
      marketSnapshot.final_price !== null
        ? Number(marketSnapshot.final_price)
        : null;

    const pricing = calculatePricing({
      teeTime,
      user: user || undefined,
      weather: weather || undefined,
      marketPrice,
      marketTraits,
      userDistanceKm: Number.isFinite(userDistanceKm) ? userDistanceKm : undefined,
      now,
    });

    const marketDelta =
      marketPrice !== null ? Math.round(Number(pricing.finalPrice) - marketPrice) : null;

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
      marketReference: marketSnapshot
        ? {
            courseName: marketSnapshot.course_name,
            playDate: marketSnapshot.play_date,
            finalPrice: marketPrice,
            crawledAt: marketSnapshot.crawled_at,
            availabilityStatus: marketSnapshot.availability_status,
            deltaFromMarket: marketDelta,
            manualNote: manualNote?.text || null,
            manualTraits: marketTraits,
            manualNoteUpdatedAt: manualNote?.updatedAt || null,
            manualNoteUpdatedByEmail: manualNote?.updatedByEmail || null,
          }
        : null,
    };
  });

  const referenceWeather = weatherRows.length > 0 ? weatherRows[0] : null;

  return NextResponse.json({
    status: 'success',
    data: results,
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
