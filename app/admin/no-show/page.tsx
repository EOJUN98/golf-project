import { redirect } from 'next/navigation';
import { requireAdminAccess } from '@/lib/auth/getCurrentUserWithRoles';
import NoShowManagement from '@/components/admin/NoShowManagement';

export const dynamic = 'force-dynamic';

function getTodayKst() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default async function AdminNoShowPage() {
  try {
    await requireAdminAccess();
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      redirect('/login?redirect=/admin/no-show');
    }
    redirect('/forbidden');
  }

  return <NoShowManagement initialDate={getTodayKst()} />;
}
