import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { requireAdminAccess } from '@/lib/auth/getCurrentUserWithRoles';

export const dynamic = 'force-dynamic';

type Segment = Database['public']['Tables']['users']['Row']['segment'];

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('ADMIN_API_CONFIG_MISSING:NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!serviceRoleKey) {
    throw new Error('ADMIN_API_CONFIG_MISSING:SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isSegment(value: unknown): value is Segment {
  return value === 'FUTURE' || value === 'PRESTIGE' || value === 'SMART' || value === 'CHERRY';
}

function mapAdminApiError(err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
  if (message === 'UNAUTHORIZED') return { status: 401, error: 'UNAUTHORIZED' as const };
  if (message === 'FORBIDDEN') return { status: 403, error: 'FORBIDDEN' as const };
  if (message.startsWith('ADMIN_API_CONFIG_MISSING:')) return { status: 500, error: message };
  return { status: 500, error: message };
}

/**
 * GET /api/admin/users
 * Query:
 * - q: search text (email/name/phone)
 * - segment: FUTURE|PRESTIGE|SMART|CHERRY
 * - limit/offset: pagination
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdminAccess();
    const supabase = getSupabaseAdminClient();

    const searchParams = req.nextUrl.searchParams;
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const segmentRaw = searchParams.get('segment');
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 200), 1), 1000);
    const offset = Math.max(Number(searchParams.get('offset') || 0), 0);

    let query = supabase
      .from('users')
      .select(
        [
          'id',
          'email',
          'name',
          'phone',
          'segment',
          'segment_override_by',
          'segment_override_at',
          'cherry_score',
          'no_show_count',
          'total_bookings',
          'total_spent',
          'blacklisted',
          'blacklist_reason',
          'blacklisted_at',
          'is_admin',
          'is_super_admin',
          'is_suspended',
          'suspended_reason',
          'suspended_at',
          'suspension_expires_at',
          'created_at',
          'updated_at',
        ].join(',')
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (isSegment(segmentRaw)) {
      query = query.eq('segment', segmentRaw);
    }

    if (q) {
      // Supabase OR syntax uses comma-separated conditions.
      query = query.or(`email.ilike.%${q}%,name.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ users: data || [], limit, offset });
  } catch (err) {
    const mapped = mapAdminApiError(err);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}

type PatchBody =
  | { action: 'set-segment'; userId: string; segment: Segment }
  | { action: 'toggle-admin'; userId: string; isAdmin: boolean }
  | { action: 'set-blacklisted'; userId: string; blacklisted: boolean; reason?: string | null }
  | { action: 'recalculate-segment'; userId: string };

/**
 * PATCH /api/admin/users
 * Body: see PatchBody
 */
export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await requireAdminAccess();
    const supabase = getSupabaseAdminClient();

    const body = (await req.json()) as Partial<PatchBody>;
    const action = body.action;

    if (!action) {
      return NextResponse.json({ error: 'Missing required field: action' }, { status: 400 });
    }

    if (action === 'set-segment') {
      if (typeof body.userId !== 'string' || !isSegment((body as any).segment)) {
        return NextResponse.json({ error: 'Invalid payload for set-segment' }, { status: 400 });
      }

      const { error } = await supabase
        .from('users')
        .update({
          segment: (body as any).segment,
          segment_override_by: currentUser.id,
          segment_override_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', body.userId);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'toggle-admin') {
      if (typeof body.userId !== 'string' || typeof (body as any).isAdmin !== 'boolean') {
        return NextResponse.json({ error: 'Invalid payload for toggle-admin' }, { status: 400 });
      }

      // Safety: do not allow changing superadmin via this endpoint.
      const { data: target, error: fetchError } = await supabase
        .from('users')
        .select('id, email, is_super_admin')
        .eq('id', body.userId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      if (target.is_super_admin) {
        return NextResponse.json({ error: 'Cannot modify super admin status via toggle-admin' }, { status: 400 });
      }

      const { error } = await supabase.from('users').update({ is_admin: (body as any).isAdmin }).eq('id', body.userId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'set-blacklisted') {
      if (typeof body.userId !== 'string' || typeof (body as any).blacklisted !== 'boolean') {
        return NextResponse.json({ error: 'Invalid payload for set-blacklisted' }, { status: 400 });
      }

      const blacklisted = (body as any).blacklisted;
      const reason = typeof (body as any).reason === 'string' ? (body as any).reason : null;

      const { error } = await supabase
        .from('users')
        .update({
          blacklisted,
          blacklist_reason: blacklisted ? reason : null,
          blacklisted_at: blacklisted ? new Date().toISOString() : null,
          blacklisted_by: blacklisted ? currentUser.id : null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', body.userId);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'recalculate-segment') {
      if (typeof body.userId !== 'string') {
        return NextResponse.json({ error: 'Invalid payload for recalculate-segment' }, { status: 400 });
      }

      const { data, error } = await (supabase as any).rpc('calculate_user_segment', {
        user_id_param: body.userId,
      });
      if (error) throw error;

      return NextResponse.json({ success: true, newSegment: data });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    const mapped = mapAdminApiError(err);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
