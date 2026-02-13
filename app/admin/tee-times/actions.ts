/**
 * SDD-01/SDD-08: Tee Time Admin Server Actions
 *
 * Updated for SDD-08: Session-based authentication
 */

'use server';

import { revalidatePath } from 'next/cache';
import { Database } from '@/types/database';
import { getCurrentUserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type TeeTime = Database['public']['Tables']['tee_times']['Row'];
type TeeTimeInsert = Database['public']['Tables']['tee_times']['Insert'];
type TeeTimeUpdate = Database['public']['Tables']['tee_times']['Update'];
type GolfClub = Database['public']['Tables']['golf_clubs']['Row'];

function getKstDayRange(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(date);
  const start = new Date(`${dateStr}T00:00:00+09:00`);
  const end = new Date(`${dateStr}T23:59:59.999+09:00`);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

// =====================================================
// SDD-08: Helper: Get current user and check permissions
// =====================================================

interface UserRole {
  userId: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isClubAdmin: boolean;
  accessibleClubIds: number[];
}

async function getUserRole(): Promise<UserRole | null> {
  try {
    const user = await getCurrentUserWithRoles();

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      isSuperAdmin: user.isSuperAdmin,
      isAdmin: user.isAdmin,
      isClubAdmin: user.isClubAdmin,
      accessibleClubIds: user.clubIds
    };
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

// =====================================================
// Action: Get accessible golf clubs
// =====================================================

export async function getAccessibleGolfClubs(): Promise<{
  success: boolean;
  clubs?: GolfClub[];
  error?: string;
}> {
  try {
    const role = await getUserRole();
    if (!role) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createSupabaseServerClient();

    if (role.isSuperAdmin || role.isAdmin) {
      // Super admin can see all clubs
      const { data, error } = await supabase
        .from('golf_clubs')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      return { success: true, clubs: data || [] };
    } else {
      // Club admin can only see their clubs
      if (role.accessibleClubIds.length === 0) {
        return { success: true, clubs: [] };
      }

      const { data, error } = await supabase
        .from('golf_clubs')
        .select('*')
        .in('id', role.accessibleClubIds)
        .order('name', { ascending: true });

      if (error) throw error;

      return { success: true, clubs: data || [] };
    }
  } catch (error) {
    console.error('Error fetching accessible golf clubs:', error);
    return { success: false, error: 'Failed to fetch golf clubs' };
  }
}

// =====================================================
// Action: Get tee times (filtered by date and club)
// =====================================================

export async function getTeeTimes(
  golfClubId: number,
  date: Date
): Promise<{
  success: boolean;
  teeTimes?: TeeTime[];
  error?: string;
}> {
  try {
    const role = await getUserRole();
    if (!role) {
      return { success: false, error: 'Unauthorized' };
    }

    // Permission check
    if (!role.isSuperAdmin && !role.isAdmin && !role.accessibleClubIds.includes(golfClubId)) {
      return { success: false, error: 'Access denied to this golf club' };
    }

    // Calculate date range in KST (Asia/Seoul)
    const { startISO, endISO } = getKstDayRange(date);

    // Query tee times
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('tee_times')
      .select('*')
      .eq('golf_club_id', golfClubId)
      .gte('tee_off', startISO)
      .lte('tee_off', endISO)
      .order('tee_off', { ascending: true });

    if (error) throw error;

    return { success: true, teeTimes: data || [] };
  } catch (error) {
    console.error('Error fetching tee times:', error);
    return { success: false, error: 'Failed to fetch tee times' };
  }
}

// =====================================================
// Action: Create tee time
// =====================================================

export async function createTeeTime(payload: {
  golf_club_id: number;
  tee_off: string;
  base_price: number;
  status?: 'OPEN' | 'BLOCKED';
}): Promise<{
  success: boolean;
  teeTime?: TeeTime;
  error?: string;
}> {
  try {
    const role = await getUserRole();
    if (!role) {
      return { success: false, error: 'Unauthorized' };
    }

    // Permission check
    if (!role.isSuperAdmin && !role.isAdmin && !role.accessibleClubIds.includes(payload.golf_club_id)) {
      return { success: false, error: 'Access denied to this golf club' };
    }

    // Validate payload
    if (!payload.tee_off || payload.base_price < 0) {
      return { success: false, error: 'Invalid tee time data' };
    }

    // Insert tee time
    const insertData: TeeTimeInsert = {
      golf_club_id: payload.golf_club_id,
      tee_off: payload.tee_off,
      base_price: payload.base_price,
      status: payload.status || 'OPEN',
      updated_by: role.userId,
    };

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('tee_times')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/admin/tee-times');
    return { success: true, teeTime: data };
  } catch (error) {
    console.error('Error creating tee time:', error);
    return { success: false, error: 'Failed to create tee time' };
  }
}

// =====================================================
// Action: Update tee time
// =====================================================

export async function updateTeeTime(
  id: number,
  payload: {
    tee_off?: string;
    base_price?: number;
    status?: 'OPEN' | 'BLOCKED';
  }
): Promise<{
  success: boolean;
  teeTime?: TeeTime;
  error?: string;
}> {
  try {
    const role = await getUserRole();
    if (!role) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createSupabaseServerClient();

    // Get existing tee time to check permissions and status
    const { data: existing, error: fetchError } = await supabase
      .from('tee_times')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: 'Tee time not found' };
    }

    // Permission check
    if (!role.isSuperAdmin && !role.isAdmin && !role.accessibleClubIds.includes(existing.golf_club_id)) {
      return { success: false, error: 'Access denied to this golf club' };
    }

    // Block editing if BOOKED
    if (existing.status === 'BOOKED') {
      return { success: false, error: 'Cannot edit booked tee time' };
    }

    // Prepare update data
    const updateData: TeeTimeUpdate = {
      ...payload,
      updated_by: role.userId,
    };

    // Update tee time
    const { data, error } = await supabase
      .from('tee_times')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/admin/tee-times');
    return { success: true, teeTime: data };
  } catch (error) {
    console.error('Error updating tee time:', error);
    return { success: false, error: 'Failed to update tee time' };
  }
}

// =====================================================
// Action: Block tee time (soft delete)
// =====================================================

export async function blockTeeTime(id: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const role = await getUserRole();
    if (!role) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createSupabaseServerClient();

    // Get existing tee time
    const { data: existing, error: fetchError } = await supabase
      .from('tee_times')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: 'Tee time not found' };
    }

    // Permission check
    if (!role.isSuperAdmin && !role.isAdmin && !role.accessibleClubIds.includes(existing.golf_club_id)) {
      return { success: false, error: 'Access denied to this golf club' };
    }

    // Block deleting if BOOKED
    if (existing.status === 'BOOKED') {
      return { success: false, error: 'Cannot block booked tee time' };
    }

    // Update to BLOCKED status
    const { error } = await supabase
      .from('tee_times')
      .update({
        status: 'BLOCKED',
        updated_by: role.userId,
      })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/admin/tee-times');
    return { success: true };
  } catch (error) {
    console.error('Error blocking tee time:', error);
    return { success: false, error: 'Failed to block tee time' };
  }
}

// =====================================================
// Action: Unblock tee time (restore to OPEN)
// =====================================================

export async function unblockTeeTime(id: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const role = await getUserRole();
    if (!role) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createSupabaseServerClient();

    // Get existing tee time
    const { data: existing, error: fetchError } = await supabase
      .from('tee_times')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: 'Tee time not found' };
    }

    // Permission check
    if (!role.isSuperAdmin && !role.isAdmin && !role.accessibleClubIds.includes(existing.golf_club_id)) {
      return { success: false, error: 'Access denied to this golf club' };
    }

    // Only unblock if currently BLOCKED
    if (existing.status !== 'BLOCKED') {
      return { success: false, error: 'Tee time is not blocked' };
    }

    // Update to OPEN status
    const { error } = await supabase
      .from('tee_times')
      .update({
        status: 'OPEN',
        updated_by: role.userId,
      })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/admin/tee-times');
    return { success: true };
  } catch (error) {
    console.error('Error unblocking tee time:', error);
    return { success: false, error: 'Failed to unblock tee time' };
  }
}
