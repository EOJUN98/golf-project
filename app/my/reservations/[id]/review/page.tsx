/**
 * Reservation Review Page (Completed)
 *
 * **MOCK DATA MODE**: Uses fake data
 */

import PageCanvas from '@/components/layout/PageCanvas';
import ReservationReviewClient from '@/components/my/ReservationReviewClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReservationReviewPage({ params }: PageProps) {
  const { id } = await params;

  const mockReservation = {
    id,
    course_name: '서울컨트리클럽',
    location_name: '서울 강남구',
    tee_off: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  return (
    <PageCanvas>
      <ReservationReviewClient reservation={mockReservation} />
    </PageCanvas>
  );
}
