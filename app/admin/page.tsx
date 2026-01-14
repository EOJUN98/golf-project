import { supabase } from '@/lib/supabase';
import AdminDashboard from '@/components/AdminDashboard';
import { TeeTime } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // Server-side Fetching
  const { data: teeTimes } = await supabase
    .from('tee_times')
    .select('*')
    .order('tee_off', { ascending: true });

  const { data: reservations } = await supabase
    .from('reservations')
    .select('final_price');

  const totalRevenue = reservations?.reduce((acc: number, curr: any) => acc + (curr.final_price || 0), 0) || 0;
  const bookedCount = teeTimes?.filter((t: TeeTime) => t.status === 'BOOKED').length || 0;

  return (
    <AdminDashboard 
      initialTeeTimes={teeTimes as TeeTime[] || []} 
      stats={{ totalRevenue, bookedCount }} 
    />
  );
}
