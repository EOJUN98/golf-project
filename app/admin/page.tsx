import AdminDashboard from '@/components/AdminDashboardNew';
import { Database } from '@/types/database';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/lib/auth/getCurrentUserWithRoles';
import { createSupabaseAdminClientOptional } from '@/lib/supabase/admin';
import { calculatePricing } from '@/utils/pricingEngine';

type TeeTime = Database['public']['Tables']['tee_times']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];
type WeatherRow = Database['public']['Tables']['weather_cache']['Row'];
type ReservationRow = Pick<Database['public']['Tables']['reservations']['Row'], 'final_price' | 'created_at'>;

const REVENUE_LOOKBACK_DAYS = 14;

function toKstDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildRecentKstDateKeys(days: number, now = new Date()) {
  const todayKey = toKstDateKey(now);
  return Array.from({ length: days }, (_, idx) => addDays(todayKey, idx - (days - 1)));
}

function toChartLabel(dateKey: string) {
  const [, month, day] = dateKey.split('-');
  return `${month}/${day}`;
}

function toAmount(value: unknown) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function selectClosestWeather(teeOffISO: string, weatherRows: WeatherRow[]) {
  if (weatherRows.length === 0) return null;
  const targetHour = new Date(teeOffISO).getHours();

  let best: WeatherRow | null = null;
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

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireAdminAccess();
  const adminClient = createSupabaseAdminClientOptional();
  const supabase = adminClient ?? await createSupabaseServerClient();
  const usingServiceRole = Boolean(adminClient);
  const now = new Date();

  const revenueDateKeys = buildRecentKstDateKeys(REVENUE_LOOKBACK_DAYS, now);
  const revenueFromISO = new Date(`${revenueDateKeys[0]}T00:00:00+09:00`).toISOString();
  const revenueToISO = new Date(`${revenueDateKeys[revenueDateKeys.length - 1]}T23:59:59.999+09:00`).toISOString();

  const [teeTimesResult, reservationsResult, usersResult] = await Promise.all([
    supabase.from('tee_times').select('*').order('tee_off', { ascending: true }),
    supabase
      .from('reservations')
      .select('final_price, created_at')
      .gte('created_at', revenueFromISO)
      .lte('created_at', revenueToISO)
      .order('created_at', { ascending: true }),
    supabase.from('users').select('*').order('created_at', { ascending: false }),
  ]);

  const dataErrors: { teeTimes?: string; reservations?: string; users?: string } = {};

  if (teeTimesResult.error) dataErrors.teeTimes = teeTimesResult.error.message;
  if (reservationsResult.error) dataErrors.reservations = reservationsResult.error.message;
  if (usersResult.error) dataErrors.users = usersResult.error.message;

  const teeTimes = teeTimesResult.data || [];
  const reservations = (reservationsResult.data || []) as ReservationRow[];
  const users = usersResult.data || [];

  // Aggregate Daily Revenue (KST)
  const revenueByDate: Record<string, number> = Object.fromEntries(
    revenueDateKeys.map((dateKey) => [dateKey, 0])
  );
  let totalRevenue = 0;

  reservations.forEach((reservation) => {
    const dateKey = toKstDateKey(new Date(reservation.created_at));
    if (!(dateKey in revenueByDate)) return;
    const amount = toAmount(reservation.final_price);
    revenueByDate[dateKey] += amount;
    totalRevenue += amount;
  });

  const chartData = revenueDateKeys.map((dateKey) => ({
    date: toChartLabel(dateKey),
    amount: revenueByDate[dateKey],
  }));

  const revenueStatus: 'ok' | 'empty' | 'error' = reservationsResult.error
    ? 'error'
    : reservations.length === 0
      ? 'empty'
      : 'ok';
  const revenueMessage = reservationsResult.error
    ? reservationsResult.error.message
    : reservations.length === 0
      ? `최근 ${REVENUE_LOOKBACK_DAYS}일 예약 데이터가 없습니다.`
      : null;

  const bookedCount = teeTimes?.filter((t: TeeTime) => t.status === 'BOOKED').length || 0;

  const sampleTeeTime = teeTimes.find((teeTime) => teeTime.status === 'OPEN') || teeTimes[0] || null;
  let pricingEngine: {
    status: 'healthy' | 'degraded' | 'unavailable';
    message: string;
    sampleTeeTimeId: number | null;
  } = {
    status: 'unavailable',
    message: '샘플 티타임이 없어 엔진 상태를 확인할 수 없습니다.',
    sampleTeeTimeId: null,
  };

  if (sampleTeeTime) {
    try {
      const sampleDateKey = toKstDateKey(new Date(sampleTeeTime.tee_off));
      const { data: weatherRows } = await supabase
        .from('weather_cache')
        .select('*')
        .eq('target_date', sampleDateKey)
        .order('target_hour', { ascending: true });

      const weather = selectClosestWeather(sampleTeeTime.tee_off, (weatherRows || []) as WeatherRow[]);
      const pricing = calculatePricing({
        teeTime: sampleTeeTime,
        weather: weather || undefined,
        now,
      });

      if (pricing.isBlocked) {
        pricingEngine = {
          status: 'degraded',
          message: `샘플 #${sampleTeeTime.id} 차단 (${pricing.blockReason || 'unknown reason'})`,
          sampleTeeTimeId: sampleTeeTime.id,
        };
      } else {
        pricingEngine = {
          status: 'healthy',
          message: `샘플 #${sampleTeeTime.id} 최종가 ${Math.round(pricing.finalPrice).toLocaleString('ko-KR')}원`,
          sampleTeeTimeId: sampleTeeTime.id,
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '엔진 상태 확인 실패';
      pricingEngine = {
        status: 'degraded',
        message,
        sampleTeeTimeId: sampleTeeTime.id,
      };
    }
  }

  return (
    <AdminDashboard
      initialTeeTimes={teeTimes as TeeTime[] || []}
      initialUsers={users as UserRow[] || []}
      stats={{
        totalRevenue,
        bookedCount,
        chartData,
        revenue: {
          lookbackDays: REVENUE_LOOKBACK_DAYS,
          status: revenueStatus,
          message: revenueMessage,
        },
        pricingEngine,
      }}
      dataStatus={{ usingServiceRole, errors: dataErrors }}
    />
  );
}
