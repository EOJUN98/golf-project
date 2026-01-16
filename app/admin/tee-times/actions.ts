'use server';

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type TeeTime = Database['public']['Tables']['tee_times']['Row'];
type TeeTimeInsert = Database['public']['Tables']['tee_times']['Insert'];
type TeeTimeUpdate = Database['public']['Tables']['tee_times']['Update'];
type GolfClub = Database['public']['Tables']['golf_clubs']['Row'];

// =====================================================
// Helper: Get current user and check permissions
// =====================================================

interface UserRole {
  userId: string;
  isSuperAdmin: boolean;
  isClubAdmin: boolean;
  accessibleClubIds: number[];
}

async function getUserRole(): Promise<UserRole | null> {
  try {
    // Get current session
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    if (!sessionUser) {
      return null;
    }

    // Get user details
    const { data: dbUser, error: userError } = await (supabase as any)
      .from('users')
      .select('id, is_super_admin, is_admin')
      .eq('id', sessionUser.id)
      .single();

    if (userError || !dbUser) {
      return null;
    }

    // If super admin, return with full access
    if (dbUser.is_super_admin) {
      return {
        userId: dbUser.id,
        isSuperAdmin: true,
        isClubAdmin: false,
        accessibleClubIds: [], // Empty means all clubs
      };
    }

    // If club admin, get accessible clubs
    if (dbUser.is_admin) {
      const { data: clubAdmins, error: clubError } = await (supabase as any)
        .from('club_admins')
        .select('golf_club_id')
        .eq('user_id', dbUser.id);

      if (!clubError && clubAdmins) {
        return {
          userId: dbUser.id,
          isSuperAdmin: false,
          isClubAdmin: true,
          accessibleClubIds: clubAdmins.map((ca: any) => ca.golf_club_id),
        };
      }
    }

    // Regular user - no admin access
    return null;
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

    if (role.isSuperAdmin) {
      // Super admin can see all clubs
      const { data, error } = await (supabase as any)
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

      const { data, error } = await (supabase as any)
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
    if (!role.isSuperAdmin && !role.accessibleClubIds.includes(golfClubId)) {
      return { success: false, error: 'Access denied to this golf club' };
    }

    // Calculate date range (UTC)
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const utcMidnight = Date.UTC(year, month, day, 0, 0, 0, 0);
    const utcDayEnd = utcMidnight + (24 * 60 * 60 * 1000) - 1;

    const startISO = new Date(utcMidnight).toISOString();
    const endISO = new Date(utcDayEnd).toISOString();

    // Query tee times
    const { data, error } = await (supabase as any)
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
    if (!role.isSuperAdmin && !role.accessibleClubIds.includes(payload.golf_club_id)) {
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

    const { data, error } = await (supabase as any)
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

    // Get existing tee time to check permissions and status
    const { data: existing, error: fetchError } = await (supabase as any)
      .from('tee_times')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: 'Tee time not found' };
    }

    // Permission check
    if (!role.isSuperAdmin && !role.accessibleClubIds.includes(existing.golf_club_id)) {
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
    const { data, error } = await (supabase as any)
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

    // Get existing tee time
    const { data: existing, error: fetchError } = await (supabase as any)
      .from('tee_times')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: 'Tee time not found' };
    }

    // Permission check
    if (!role.isSuperAdmin && !role.accessibleClubIds.includes(existing.golf_club_id)) {
      return { success: false, error: 'Access denied to this golf club' };
    }

    // Block deleting if BOOKED
    if (existing.status === 'BOOKED') {
      return { success: false, error: 'Cannot block booked tee time' };
    }

    // Update to BLOCKED status
    const { error } = await (supabase as any)
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

    // Get existing tee time
    const { data: existing, error: fetchError } = await (supabase as any)
      .from('tee_times')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: 'Tee time not found' };
    }

    // Permission check
    if (!role.isSuperAdmin && !role.accessibleClubIds.includes(existing.golf_club_id)) {
      return { success: false, error: 'Access denied to this golf club' };
    }

    // Only unblock if currently BLOCKED
    if (existing.status !== 'BLOCKED') {
      return { success: false, error: 'Tee time is not blocked' };
    }

    // Update to OPEN status
    const { error } = await (supabase as any)
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
