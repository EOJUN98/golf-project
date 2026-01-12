// ==================================================================
// Supabase Query Functions for TUGOL
// ==================================================================

import { supabase } from '@/lib/supabase';

export interface TeeTimeWithPricing {
  id: number;
  tee_off: string;
  base_price: number;
  status: string;
  time: string;
  teeOffTime: Date;
  basePrice: number;
  finalPrice: number;
  reasons: string[];
  weather: {
    sky?: string;
    temperature?: number;
    rainProb: number;
  };
}

/**
 * Fetch tee times for a specific date
 * @param date - The date to fetch tee times for
 * @returns Array of tee times with pricing data
 */
export async function getTeeTimesByDate(date: Date): Promise<TeeTimeWithPricing[]> {
  try {
    // Calculate start and end of day in ISO format
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    console.log('Fetching tee times for:', {
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString()
    });

    // Query Supabase
    const { data, error } = await supabase
      .from('tee_times')
      .select('*')
      .eq('status', 'OPEN')
      .gte('tee_off', startOfDay.toISOString())
      .lte('tee_off', endOfDay.toISOString())
      .order('tee_off', { ascending: true });

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('No tee times found for this date');
      return [];
    }

    console.log(`Found ${data.length} tee times`);

    // Transform data to match the expected format
    const transformedData: TeeTimeWithPricing[] = data.map((teeTime: any) => {
      const teeOffDate = new Date(teeTime.tee_off);
      const hours = teeOffDate.getHours().toString().padStart(2, '0');
      const minutes = teeOffDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;

      // Calculate discount based on weather and time
      let finalPrice = teeTime.base_price;
      const reasons: string[] = [];
      
      // Mock weather discount (you can integrate real weather API here)
      const mockRainProb = Math.random() * 100;
      if (mockRainProb > 50) {
        finalPrice *= 0.8;
        reasons.push('우천할인 20%');
      }

      // Time-based discount (closer to tee time)
      const now = new Date();
      const hoursUntilTeeOff = (teeOffDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilTeeOff < 24) {
        finalPrice *= 0.9;
        reasons.push('당일특가 10%');
      }

      return {
        id: teeTime.id,
        tee_off: teeTime.tee_off,
        base_price: teeTime.base_price,
        status: teeTime.status,
        time: timeString,
        teeOffTime: teeOffDate,
        basePrice: teeTime.base_price,
        finalPrice: Math.round(finalPrice),
        reasons,
        weather: {
          sky: mockRainProb > 70 ? '비' : mockRainProb > 40 ? '흐림' : '맑음',
          temperature: Math.round(20 + Math.random() * 10),
          rainProb: Math.round(mockRainProb),
        },
      };
    });

    return transformedData;
  } catch (error) {
    console.error('Error fetching tee times:', error);
    throw error;
  }
}

/**
 * Get available dates (dates that have tee times)
 * @returns Array of dates with available tee times
 */
export async function getAvailableDates(): Promise<Date[]> {
  try {
    const now = new Date();
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(now.getDate() + 14);

    const { data, error } = await supabase
      .from('tee_times')
      .select('tee_off')
      .eq('status', 'OPEN')
      .gte('tee_off', now.toISOString())
      .lte('tee_off', twoWeeksLater.toISOString())
      .order('tee_off', { ascending: true });

    if (error) {
      console.error('Error fetching available dates:', error);
      return [];
    }

    // Extract unique dates
    const uniqueDates = new Set<string>();
    data?.forEach((item: any) => {
      const date = new Date(item.tee_off);
      const dateString = date.toDateString();
      uniqueDates.add(dateString);
    });

    return Array.from(uniqueDates).map(dateString => new Date(dateString));
  } catch (error) {
    console.error('Error in getAvailableDates:', error);
    return [];
  }
}
