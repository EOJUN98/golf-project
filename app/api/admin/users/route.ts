import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Record a no-show for a user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, reservationId, userId } = body;

    if (action === 'record-no-show') {
      if (!reservationId) {
        return NextResponse.json({ error: 'reservationId required' }, { status: 400 });
      }

      // Call the PostgreSQL function we created in migration
      const { data, error } = await (supabase as any).rpc('record_no_show', {
        reservation_id_param: reservationId
      });

      if (error) throw error;

      return NextResponse.json({
        message: 'No-show recorded successfully',
        data
      });
    }

    if (action === 'recalculate-segment') {
      if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 });
      }

      // Call the PostgreSQL function to recalculate segment
      const { data, error } = await (supabase as any).rpc('calculate_user_segment', {
        user_id_param: userId
      });

      if (error) throw error;

      return NextResponse.json({
        message: 'Segment recalculated',
        newSegment: data
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err: any) {
    console.error('Admin user action error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
