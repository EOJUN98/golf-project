import AdminDashboard from '@/components/AdminDashboardNew';
import { Database } from '@/types/database';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/lib/auth/getCurrentUserWithRoles';

type TeeTime = Database['public']['Tables']['tee_times']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireAdminAccess();
  const supabase = await createSupabaseServerClient();

  // Server-side Fetching
  const { data: teeTimes } = await supabase
    .from('tee_times')
    .select('*')
    .order('tee_off', { ascending: true });

  const { data: reservations } = await supabase
    .from('reservations')
    .select('final_price, created_at')
    .order('created_at', { ascending: true });

  // Fetch all users for user management tab
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  // Aggregate Daily Revenue
  const revenueByDate: Record<string, number> = {};
  let totalRevenue = 0;

  reservations?.forEach((r: any) => {
    const date = new Date(r.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
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
    />
  );
}
