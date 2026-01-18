/**
 * Round Review Page
 *
 * Create review and round record after completing a round
 * Includes:
 * - Total score
 * - Hole-by-hole scores
 * - Putts per hole
 * - Caddy evaluation
 * - Course evaluation
 * - Course issue reporting (complaints)
 *
 * **MOCK DATA MODE**: Uses fake data
 */

import RoundReviewClient from '@/components/my/RoundReviewClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RoundReviewPage({ params }: PageProps) {
  const { id } = await params;

  // Mock reservation data
  const mockReservation = {
    id: parseInt(id),
    tee_time_id: 101,
    status: 'COMPLETED',
    tee_times: {
      id: 101,
      tee_off: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      golf_clubs: {
        id: 1,
        name: '인천 클럽72',
        location_name: '인천 서구',
      },
    },
  };

  return <RoundReviewClient reservation={mockReservation as any} />;
}
