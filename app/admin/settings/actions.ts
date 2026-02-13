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

  // 2) Seed tee times for the next 14 days if empty.
  const { data: existingTeeTime, error: teeCheckError } = await supabase
    .from('tee_times')
    .select('id')
    .eq('golf_club_id', clubId)
    .limit(1)
    .maybeSingle();

  if (teeCheckError) {
    redirect(`/admin/settings?message=${encodeURIComponent(`Failed to check tee_times: ${teeCheckError.message}`)}`);
  }

  if (!existingTeeTime) {
    const timeSlots = ['06:30', '07:50', '09:10', '11:00', '12:20', '13:40', '15:30', '16:50', '18:10'];
    const rows: Database['public']['Tables']['tee_times']['Insert'][] = [];

    const todayKst = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const base = new Date(`${todayKst}T00:00:00+09:00`);

    for (let i = 0; i < 14; i += 1) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
      const weekdayBase = isWeekend(dateStr) ? 160_000 : 120_000;
      for (const time of timeSlots) {
        rows.push({
          golf_club_id: clubId,
          tee_off: buildTeeOffISO(dateStr, time),
          base_price: weekdayBase,
          status: 'OPEN',
          updated_by: currentUser.id,
        });
      }
    }

    const { error: insertTeeError } = await supabase.from('tee_times').insert(rows);
    if (insertTeeError) {
      redirect(`/admin/settings?message=${encodeURIComponent(`Failed to insert tee_times: ${insertTeeError.message}`)}`);
    }
  }

  // 3) Seed minimal weather cache rows for the next 14 days if empty.
  const { data: existingWeather, error: weatherCheckError } = await supabase
    .from('weather_cache')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (weatherCheckError) {
    redirect(`/admin/settings?message=${encodeURIComponent(`Failed to check weather_cache: ${weatherCheckError.message}`)}`);
  }

  if (!existingWeather) {
    const hours = [6, 7, 8, 9, 11, 12, 13, 15, 16, 18];
    const rows: Database['public']['Tables']['weather_cache']['Insert'][] = [];

    const todayKst = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const base = new Date(`${todayKst}T00:00:00+09:00`);

    for (let i = 0; i < 14; i += 1) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

      // Simple deterministic variation: make every 3rd day cloudy/rainy.
      const cloudy = i % 3 === 1;
      const rainy = i % 3 === 2;

      for (const hour of hours) {
        rows.push({
          target_date: dateStr,
          target_hour: hour,
          pop: rainy ? 70 : cloudy ? 40 : 10,
          rn1: rainy ? 2 : 0,
          wsd: 2,
        });
      }
    }

    const { error: insertWeatherError } = await supabase.from('weather_cache').insert(rows);
    if (insertWeatherError) {
      redirect(`/admin/settings?message=${encodeURIComponent(`Failed to insert weather_cache: ${insertWeatherError.message}`)}`);
    }
  }

  revalidatePath('/admin');
  revalidatePath('/admin/tee-times');
  revalidatePath('/');
  redirect('/admin/settings?message=Seed%20completed%3A%20golf_clubs%20%2F%20tee_times%20%2F%20weather_cache');
}
