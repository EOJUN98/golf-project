'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { requireAdminAccess } from '@/lib/auth/getCurrentUserWithRoles';

function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('ADMIN_SETTINGS_CONFIG_MISSING:NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceRoleKey) throw new Error('ADMIN_SETTINGS_CONFIG_MISSING:SUPABASE_SERVICE_ROLE_KEY');

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isSeedEnabled() {
  return process.env.ADMIN_SEED_ENABLED === 'true' || process.env.NODE_ENV !== 'production';
}

function buildTeeOffISO(dateStr: string, timeHHMM: string) {
  return new Date(`${dateStr}T${timeHHMM}:00+09:00`).toISOString();
}

function isWeekend(dateStr: string) {
  // dateStr is YYYY-MM-DD in KST context; weekday calculation in local is fine for deterministic seed.
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  const day = d.getDay();
  return day === 0 || day === 6;
}

const HORIZON_DAYS = 14;
const TEE_TIME_SLOTS = ['06:30', '07:50', '09:10', '11:00', '12:20', '13:40', '15:30', '16:50', '18:10'];
const WEATHER_HOURS = [6, 7, 8, 9, 11, 12, 13, 15, 16, 18];

function formatKstDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatKstTimeHHMM(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === 'hour')?.value || '00';
  const minute = parts.find((part) => part.type === 'minute')?.value || '00';
  return `${hour}:${minute}`;
}

function buildFutureKstDateKeys(days: number): string[] {
  const todayKst = formatKstDate(new Date());
  const base = new Date(`${todayKst}T00:00:00+09:00`);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() + index);
    return formatKstDate(date);
  });
}

function teeTimeKey(dateStr: string, timeHHMM: string) {
  return `${dateStr}|${timeHHMM}`;
}

function weatherKey(dateStr: string, hour: number) {
  return `${dateStr}|${hour}`;
}

function buildWeatherPattern(dayOffset: number) {
  const cloudy = dayOffset % 3 === 1;
  const rainy = dayOffset % 3 === 2;
  return {
    pop: rainy ? 70 : cloudy ? 40 : 10,
    rn1: rainy ? 2 : 0,
    wsd: 2,
  };
}

async function ensureFutureTeeTimes(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  golfClubId: number,
  updatedBy: string,
  dateKeys: string[]
): Promise<number> {
  if (dateKeys.length === 0) return 0;

  const rangeStartISO = new Date(`${dateKeys[0]}T00:00:00+09:00`).toISOString();
  const rangeEndISO = new Date(`${dateKeys[dateKeys.length - 1]}T23:59:59.999+09:00`).toISOString();

  const { data: existingRows, error } = await supabase
    .from('tee_times')
    .select('tee_off')
    .eq('golf_club_id', golfClubId)
    .gte('tee_off', rangeStartISO)
    .lte('tee_off', rangeEndISO);

  if (error) {
    throw new Error(`Failed to check tee_times in horizon: ${error.message}`);
  }

  const existing = new Set(
    (existingRows || []).map((row) => teeTimeKey(formatKstDate(new Date(row.tee_off)), formatKstTimeHHMM(new Date(row.tee_off))))
  );

  const rows: Database['public']['Tables']['tee_times']['Insert'][] = [];
  dateKeys.forEach((dateStr) => {
    const weekdayBase = isWeekend(dateStr) ? 160_000 : 120_000;
    TEE_TIME_SLOTS.forEach((slot) => {
      const key = teeTimeKey(dateStr, slot);
      if (existing.has(key)) return;
      rows.push({
        golf_club_id: golfClubId,
        tee_off: buildTeeOffISO(dateStr, slot),
        base_price: weekdayBase,
        current_price: weekdayBase,
        status: 'OPEN',
        updated_by: updatedBy,
      });
    });
  });

  if (rows.length === 0) return 0;

  const { error: insertError } = await supabase.from('tee_times').insert(rows);
  if (insertError) {
    throw new Error(`Failed to insert tee_times: ${insertError.message}`);
  }

  return rows.length;
}

async function ensureFutureWeatherCache(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  dateKeys: string[]
): Promise<number> {
  if (dateKeys.length === 0) return 0;

  const { data: existingRows, error } = await supabase
    .from('weather_cache')
    .select('target_date, target_hour')
    .gte('target_date', dateKeys[0])
    .lte('target_date', dateKeys[dateKeys.length - 1]);

  if (error) {
    throw new Error(`Failed to check weather_cache in horizon: ${error.message}`);
  }

  const existing = new Set(
    (existingRows || []).map((row) => weatherKey(row.target_date, row.target_hour))
  );

  const rows: Database['public']['Tables']['weather_cache']['Insert'][] = [];
  dateKeys.forEach((dateStr, dayOffset) => {
    const pattern = buildWeatherPattern(dayOffset);
    WEATHER_HOURS.forEach((hour) => {
      const key = weatherKey(dateStr, hour);
      if (existing.has(key)) return;
      rows.push({
        target_date: dateStr,
        target_hour: hour,
        pop: pattern.pop,
        rn1: pattern.rn1,
        wsd: pattern.wsd,
      });
    });
  });

  if (rows.length === 0) return 0;

  const { error: insertError } = await supabase.from('weather_cache').insert(rows);
  if (insertError) {
    throw new Error(`Failed to insert weather_cache: ${insertError.message}`);
  }

  return rows.length;
}

export async function seedCoreData(_formData: FormData): Promise<void> {
  const currentUser = await requireAdminAccess();

  if (!currentUser.isSuperAdmin) {
    redirect('/admin/settings?message=FORBIDDEN%3A%20super%20admin%20only');
  }

  if (!isSeedEnabled()) {
    redirect('/admin/settings?message=SEED_DISABLED%3A%20set%20ADMIN_SEED_ENABLED%3Dtrue%20(or%20use%20non-production)%20to%20enable%20seeding.');
  }

  const supabase = getSupabaseServiceClient();

  // 1) Ensure at least one golf club exists.
  const clubName = 'Club 72';
  const { data: existingClub, error: existingClubError } = await supabase
    .from('golf_clubs')
    .select('id,name,location_name')
    .eq('name', clubName)
    .maybeSingle();

  if (existingClubError) {
    redirect(`/admin/settings?message=${encodeURIComponent(`Failed to check golf_clubs: ${existingClubError.message}`)}`);
  }

  let clubId = existingClub?.id ?? null;
  if (!clubId) {
    const { data: insertedClub, error: insertClubError } = await supabase
      .from('golf_clubs')
      .insert({
        name: clubName,
        location_name: '인천',
        location_lat: 37.4692,
        location_lng: 126.4407,
      })
      .select('id')
      .single();

    if (insertClubError) {
      redirect(`/admin/settings?message=${encodeURIComponent(`Failed to insert golf_club: ${insertClubError.message}`)}`);
    }

    clubId = insertedClub.id;
  }

  // 2) Top-up tee_times/weather_cache for the next N days (idempotent).
  const horizonDateKeys = buildFutureKstDateKeys(HORIZON_DAYS);

  let insertedTeeRows = 0;
  let insertedWeatherRows = 0;
  try {
    insertedTeeRows = await ensureFutureTeeTimes(supabase, clubId, currentUser.id, horizonDateKeys);
    insertedWeatherRows = await ensureFutureWeatherCache(supabase, horizonDateKeys);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown seed error';
    redirect(`/admin/settings?message=${encodeURIComponent(message)}`);
  }

  revalidatePath('/admin');
  revalidatePath('/admin/tee-times');
  revalidatePath('/');
  const successMessage = `Seed completed: +${insertedTeeRows} tee_times, +${insertedWeatherRows} weather_cache (future ${HORIZON_DAYS}d top-up)`;
  redirect(`/admin/settings?message=${encodeURIComponent(successMessage)}`);
}
