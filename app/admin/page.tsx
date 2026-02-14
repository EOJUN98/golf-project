import AdminDashboard from '@/components/AdminDashboardNew';
import { Database } from '@/types/database';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/lib/auth/getCurrentUserWithRoles';
import { createSupabaseAdminClientOptional } from '@/lib/supabase/admin';

type TeeTime = Database['public']['Tables']['tee_times']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireAdminAccess();
  const adminClient = createSupabaseAdminClientOptional();
  const supabase = adminClient ?? await createSupabaseServerClient();
  const usingServiceRole = Boolean(adminClient);

  // Server-side Fetching
  const teeTimesResult = await supabase
    .from('tee_times')
    .select('*')
    .order('tee_off', { ascending: true });

  const reservationsResult = await supabase
    .from('reservations')
    .select('final_price, created_at')
    .order('created_at', { ascending: true });

  // Fetch all users for user management tab
  const usersResult = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  const dataErrors: { teeTimes?: string; reservations?: string; users?: string } = {};

  if (teeTimesResult.error) dataErrors.teeTimes = teeTimesResult.error.message;
  if (reservationsResult.error) dataErrors.reservations = reservationsResult.error.message;
  if (usersResult.error) dataErrors.users = usersResult.error.message;

  const teeTimes = teeTimesResult.data || [];
  const reservations = reservationsResult.data || [];
  const users = usersResult.data || [];

  // Aggregate Daily Revenue
  const revenueByDate: Record<string, number> = {};
  let totalRevenue = 0;

  reservations?.forEach((r: any) => {
    const date = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'numeric',
      day: 'numeric',
    }).format(new Date(r.created_at));
    revenueByDate[date] = (revenueByDate[date] || 0) + (r.final_price || 0);
    totalRevenue += (r.final_price || 0);
  });

  const chartData = Object.entries(revenueByDate).map(([date, amount]) => ({
    date,
    amount
  }));

  const bookedCount = teeTimes?.filter((t: TeeTime) => t.status === 'BOOKED').length || 0;

  return (
    <AdminDashboard
      initialTeeTimes={teeTimes as TeeTime[] || []}
      initialUsers={users as UserRow[] || []}
      stats={{ totalRevenue, bookedCount, chartData }}
      dataStatus={{ usingServiceRole, errors: dataErrors }}
    />
  );
}
