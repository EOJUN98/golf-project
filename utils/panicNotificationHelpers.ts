/**
 * SDD-03: Panic Notification Helpers
 *
 * Functions to create and manage panic deal notifications.
 * These notifications are created when isPanicCandidate = true
 * but are NOT automatically sent (requires separate push service).
 */

import { Database } from '../types/database';
import { PricingResult } from './pricingEngineV2';
import { PANIC_CONFIG } from './pricingConfig';

type TeeTime = Database['public']['Tables']['tee_times']['Row'];
type GolfClub = Database['public']['Tables']['golf_clubs']['Row'];
type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];

// =====================================================
// Notification Creation
// =====================================================

/**
 * Create a panic deal notification for a tee time
 *
 * @param teeTime - The tee time slot
 * @param golfClub - Golf club details
 * @param pricingResult - Pricing calculation result
 * @param supabase - Supabase client (service role recommended)
 * @returns Created notification or null if error/already exists
 */
export async function createPanicNotification(
  teeTime: TeeTime,
  golfClub: GolfClub,
  pricingResult: PricingResult,
  supabase: any
): Promise<Database['public']['Tables']['notifications']['Row'] | null> {
  try {
    // 1. Check if notification already exists (avoid duplicates)
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('tee_time_id', teeTime.id)
      .eq('type', 'PANIC_DEAL')
      .in('status', ['PENDING', 'SENT'])
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Within last 2 hours
      .single();

    if (existing) {
      console.log(`[createPanicNotification] Notification already exists for tee_time_id: ${teeTime.id}`);
      return null;
    }

    // 2. Calculate time left
    const teeOff = new Date(teeTime.tee_off);
    const now = new Date();
    const minutesLeft = Math.floor((teeOff.getTime() - now.getTime()) / (1000 * 60));

    // 3. Build notification payload
    const payload = {
      original_price: pricingResult.basePrice,
      final_price: pricingResult.finalPrice,
      discount_rate: pricingResult.discountRate,
      minutes_left: minutesLeft,
      golf_club_name: golfClub.name,
      golf_club_location: golfClub.location_name,
      tee_off: teeTime.tee_off,
      factors: pricingResult.factors
    };

    // 4. Create notification record
    const notification: NotificationInsert = {
      user_id: null, // Broadcast to all nearby users (will be filtered by push service)
      tee_time_id: teeTime.id,
      type: 'PANIC_DEAL',
      title: buildPanicTitle(minutesLeft, pricingResult.discountRate),
      message: buildPanicMessage(
        golfClub.name,
        pricingResult.basePrice,
        pricingResult.finalPrice,
        minutesLeft
      ),
      payload: payload as any,
      status: 'PENDING',
      priority: PANIC_CONFIG.NOTIFICATION_PRIORITY,
      expires_at: new Date(
        now.getTime() + PANIC_CONFIG.NOTIFICATION_EXPIRY_MINS * 60 * 1000
      ).toISOString()
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) {
      console.error('[createPanicNotification] Error creating notification:', error);
      return null;
    }

    console.log(`[createPanicNotification] Created notification for tee_time_id: ${teeTime.id}`);
    return data;
  } catch (error) {
    console.error('[createPanicNotification] Exception:', error);
    return null;
  }
}

// =====================================================
// Batch Panic Notification Creation
// =====================================================

/**
 * Scan all tee times and create panic notifications for candidates
 *
 * This function should be run periodically (e.g., every 5 minutes)
 * by a background job or cron.
 *
 * @param supabase - Supabase client (service role)
 * @returns Number of notifications created
 */
export async function scanAndCreatePanicNotifications(
  supabase: any
): Promise<number> {
  try {
    // 1. Get all OPEN tee times within panic window (next 30 minutes)
    const now = new Date();
    const maxTime = new Date(now.getTime() + PANIC_CONFIG.MAX_MINUTES_BEFORE_TEEOFF * 60 * 1000);

    const { data: teeTimes, error: teeTimeError } = await supabase
      .from('tee_times')
      .select(`
        *,
        golf_clubs (*)
      `)
      .eq('status', 'OPEN')
      .gte('tee_off', now.toISOString())
      .lte('tee_off', maxTime.toISOString());

    if (teeTimeError || !teeTimes) {
      console.error('[scanAndCreatePanicNotifications] Error fetching tee times:', teeTimeError);
      return 0;
    }

    console.log(`[scanAndCreatePanicNotifications] Found ${teeTimes.length} candidate tee times`);

    // 2. For each tee time, check if it needs a notification
    let createdCount = 0;

    for (const teeTime of teeTimes) {
      // Calculate pricing (you may need to fetch weather, sales rate, etc.)
      // For now, we'll create a simple check based on time only
      const teeOff = new Date(teeTime.tee_off);
      const minutesLeft = Math.floor((teeOff.getTime() - now.getTime()) / (1000 * 60));

      // Simple panic trigger: <= 30 mins and OPEN
      if (minutesLeft <= PANIC_CONFIG.MAX_MINUTES_BEFORE_TEEOFF && minutesLeft > 0) {
        // Create a simplified pricing result (in production, call actual pricing engine)
        const simplePricingResult: PricingResult = {
          basePrice: teeTime.base_price,
          finalPrice: teeTime.base_price, // Would be calculated by pricing engine
          discountRate: 0,
          isBlocked: false,
          factors: [],
          isPanicCandidate: true,
          panicReason: minutesLeft <= 10 ? PANIC_CONFIG.URGENT_MESSAGE : PANIC_CONFIG.NORMAL_MESSAGE
        };

        const notification = await createPanicNotification(
          teeTime,
          teeTime.golf_clubs,
          simplePricingResult,
          supabase
        );

        if (notification) {
          createdCount++;
        }
      }
    }

    console.log(`[scanAndCreatePanicNotifications] Created ${createdCount} notifications`);
    return createdCount;
  } catch (error) {
    console.error('[scanAndCreatePanicNotifications] Exception:', error);
    return 0;
  }
}

// =====================================================
// Helper Functions: Message Building
// =====================================================

function buildPanicTitle(minutesLeft: number, discountRate: number): string {
  const discountPercent = Math.round(discountRate * 100);

  if (minutesLeft <= 10) {
    return `⚡️ 긴급! ${minutesLeft}분 후 티오프`;
  } else if (discountRate >= 0.2) {
    return `🔥 특가 ${discountPercent}% 할인! ${minutesLeft}분 남음`;
  } else {
    return `⏰ 공실 임박! ${minutesLeft}분 후 마감`;
  }
}

function buildPanicMessage(
  clubName: string,
  originalPrice: number,
  finalPrice: number,
  minutesLeft: number
): string {
  const discount = originalPrice - finalPrice;
  const discountRate = Math.round((discount / originalPrice) * 100);

  if (discount > 0) {
    return `${clubName} | 지금 예약하면 ${discountRate}% 할인! ${originalPrice.toLocaleString()}원 → ${finalPrice.toLocaleString()}원`;
  } else {
    return `${clubName} | ${minutesLeft}분 후 티오프! 지금 바로 예약하세요`;
  }
}

// =====================================================
// Notification Management
// =====================================================

/**
 * Mark a notification as sent
 */
export async function markNotificationAsSent(
  notificationId: string,
  supabase: any
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ status: 'SENT', sent_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      console.error('[markNotificationAsSent] Error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[markNotificationAsSent] Exception:', error);
    return false;
  }
}

/**
 * Get pending notifications for push service
 */
export async function getPendingNotifications(
  supabase: any,
  limit: number = 50
): Promise<Database['public']['Tables']['notifications']['Row'][]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        tee_times (
          tee_off,
          golf_club_id,
          golf_clubs (name, location_name)
        )
      `)
      .eq('status', 'PENDING')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[getPendingNotifications] Error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[getPendingNotifications] Exception:', error);
    return [];
  }
}

/**
 * Cleanup expired notifications
 */
export async function cleanupExpiredNotifications(
  supabase: any
): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('cleanup_expired_notifications');

    if (error) {
      console.error('[cleanupExpiredNotifications] Error:', error);
      return 0;
    }

    console.log(`[cleanupExpiredNotifications] Deleted ${data} expired notifications`);
    return data || 0;
  } catch (error) {
    console.error('[cleanupExpiredNotifications] Exception:', error);
    return 0;
  }
}
