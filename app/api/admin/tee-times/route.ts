import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClientOptional } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/lib/auth/getCurrentUserWithRoles';
import type { Database } from '@/types/database';

export const dynamic = 'force-dynamic';

type TeeTimeStatus = Database['public']['Tables']['tee_times']['Row']['status'];

type PatchBody =
  | { action: 'set-status'; id: number; status: TeeTimeStatus }
  | { action: 'update-base-price'; id: number; base_price: number };

function mapError(err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
  if (message === 'UNAUTHORIZED') return { status: 401, error: 'UNAUTHORIZED' as const };
  if (message === 'FORBIDDEN') return { status: 403, error: 'FORBIDDEN' as const };
  if (message.startsWith('ADMIN_CLIENT_CONFIG_MISSING:')) return { status: 500, error: message };
  return { status: 500, error: message };
}

function isStatus(value: unknown): value is TeeTimeStatus {
  return value === 'OPEN' || value === 'BOOKED' || value === 'BLOCKED';
}

export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await requireAdminAccess();

    const body = (await req.json()) as Partial<PatchBody>;
    const action = body.action;

    if (!action) {
      return NextResponse.json({ error: 'Missing required field: action' }, { status: 400 });
    }

    const adminClient = createSupabaseAdminClientOptional();
    const supabase = adminClient ?? await createSupabaseServerClient();

    if (action === 'set-status') {
      if (typeof (body as any).id !== 'number' || !isStatus((body as any).status)) {
        return NextResponse.json({ error: 'Invalid payload for set-status' }, { status: 400 });
      }

      const { error } = await supabase
        .from('tee_times')
        .update({
          status: (body as any).status,
          updated_by: currentUser.id,
        } as any)
        .eq('id', (body as any).id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'update-base-price') {
      if (typeof (body as any).id !== 'number' || typeof (body as any).base_price !== 'number') {
        return NextResponse.json({ error: 'Invalid payload for update-base-price' }, { status: 400 });
      }

      const basePrice = Math.floor((body as any).base_price);
      if (!Number.isFinite(basePrice) || basePrice < 0) {
        return NextResponse.json({ error: 'Invalid base_price' }, { status: 400 });
      }

      const { error } = await supabase
        .from('tee_times')
        .update({
          base_price: basePrice,
          updated_by: currentUser.id,
        } as any)
        .eq('id', (body as any).id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    const mapped = mapError(err);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}

