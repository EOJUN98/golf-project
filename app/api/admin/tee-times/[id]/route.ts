import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/database';
import { createSupabaseAdminClientOptional } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';

export const dynamic = 'force-dynamic';

type TeeTimeStatus = Database['public']['Tables']['tee_times']['Row']['status'];
type AdminUser = NonNullable<Awaited<ReturnType<typeof getCurrentUserWithRoles>>>;

type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

function errorResponse(status: number, code: ApiErrorCode, message: string) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Unknown error';
}

function isValidUpdateStatus(value: unknown): value is Extract<TeeTimeStatus, 'OPEN' | 'BLOCKED'> {
  return value === 'OPEN' || value === 'BLOCKED';
}

function hasAdminConsoleAccess(user: AdminUser | null): user is AdminUser {
  return Boolean(user && (user.isSuperAdmin || user.isAdmin || user.isClubAdmin));
}

function canAccessClub(user: AdminUser, golfClubId: number) {
  if (user.isSuperAdmin || user.isAdmin) return true;
  return user.isClubAdmin && user.clubIds.includes(golfClubId);
}

function toUpdatedBy(user: AdminUser) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user.id)
    ? user.id
    : null;
}

async function getSupabaseClient() {
  const adminClient = createSupabaseAdminClientOptional();
  return adminClient ?? await createSupabaseServerClient();
}

async function getAuthorizedUser() {
  const user = await getCurrentUserWithRoles();
  if (!hasAdminConsoleAccess(user)) return null;
  return user;
}

function parseId(idValue: string) {
  const id = Number(idValue);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthorizedUser();
    if (!user) return errorResponse(401, 'UNAUTHORIZED', '로그인이 필요합니다.');

    const resolved = await params;
    const id = parseId(resolved.id);
    if (!id) return errorResponse(400, 'VALIDATION_ERROR', 'id는 양의 정수여야 합니다.');

    const body = (await req.json()) as Record<string, unknown>;
    const updateData: Record<string, unknown> = {};

    if (body.base_price !== undefined) {
      const basePriceRaw = Number(body.base_price);
      if (!Number.isFinite(basePriceRaw) || basePriceRaw < 0) {
        return errorResponse(400, 'VALIDATION_ERROR', 'base_price는 0 이상의 숫자여야 합니다.');
      }
      const basePrice = Math.floor(basePriceRaw);
      updateData.base_price = basePrice;
      updateData.current_price = basePrice;
    }

    if (body.tee_off !== undefined) {
      if (typeof body.tee_off !== 'string' || Number.isNaN(new Date(body.tee_off).getTime())) {
        return errorResponse(400, 'VALIDATION_ERROR', 'tee_off는 유효한 ISO datetime이어야 합니다.');
      }
      updateData.tee_off = body.tee_off;
    }

    if (body.status !== undefined) {
      if (!isValidUpdateStatus(body.status)) {
        return errorResponse(400, 'VALIDATION_ERROR', 'status는 OPEN 또는 BLOCKED만 허용됩니다.');
      }
      updateData.status = body.status;
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse(400, 'VALIDATION_ERROR', '최소 1개 이상의 수정 필드가 필요합니다.');
    }

    const supabase = await getSupabaseClient();
    const { data: existing, error: existingError } = await supabase
      .from('tee_times')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return errorResponse(404, 'NOT_FOUND', 'Tee time not found.');
    if (!canAccessClub(user, existing.golf_club_id)) {
      return errorResponse(403, 'FORBIDDEN', '해당 골프장에 접근할 수 없습니다.');
    }
    if (existing.status === 'BOOKED') {
      return errorResponse(409, 'CONFLICT', '예약된 티타임은 수정할 수 없습니다.');
    }

    const { data, error } = await supabase
      .from('tee_times')
      .update({
        ...updateData,
        updated_by: toUpdatedBy(user),
      } as any)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = getErrorMessage(error);
    return errorResponse(500, 'INTERNAL_ERROR', message);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthorizedUser();
    if (!user) return errorResponse(401, 'UNAUTHORIZED', '로그인이 필요합니다.');

    const resolved = await params;
    const id = parseId(resolved.id);
    if (!id) return errorResponse(400, 'VALIDATION_ERROR', 'id는 양의 정수여야 합니다.');

    const supabase = await getSupabaseClient();
    const { data: existing, error: existingError } = await supabase
      .from('tee_times')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return errorResponse(404, 'NOT_FOUND', 'Tee time not found.');
    if (!canAccessClub(user, existing.golf_club_id)) {
      return errorResponse(403, 'FORBIDDEN', '해당 골프장에 접근할 수 없습니다.');
    }
    if (existing.status !== 'OPEN') {
      return errorResponse(409, 'CONFLICT', 'OPEN 상태의 티타임만 삭제할 수 있습니다.');
    }

    const { error } = await supabase.from('tee_times').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return errorResponse(500, 'INTERNAL_ERROR', message);
  }
}
