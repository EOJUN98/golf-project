import { supabase } from '@/lib/supabase';
import { calculateDynamicPrice, PricingContext, WeatherData } from '@/utils/pricingEngine';

export interface TeeTimeWithPricing {
  id: number;
  tee_off: string;
  basePrice: number;
  finalPrice: number;
  price: number;
  currency: string;
  status: 'OPEN' | 'BOOKED' | 'BLOCKED';
  reasons: string[];
  weather: WeatherData;
  // Added for compatibility with UI components that might expect these
  teeOffTime: Date; 
  discountResult?: any; // Kept as optional to reduce breakage
}

function generateMockWeather(date: Date, hour: number): WeatherData {
  const seed = date.getDate() + hour; 
  const rainProb = (seed * 7) % 100;
  
  let sky = '맑음';
  if (rainProb > 30) sky = '구름';
  if (rainProb > 60) sky = '비';

  return {
    sky,
    temperature: 20 + (seed % 10) - 5,
    rainProb,
    windSpeed: (seed % 10),
  };
}

export async function getTeeTimesByDate(date: Date): Promise<TeeTimeWithPricing[]> {
  // ✅ 전략: DB 조회는 "날짜 그대로 00:00~23:59 UTC"로 하고,
  //         클라이언트로 반환할 때 -9시간 보정 (브라우저가 +9시간 할 것을 대비)

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // 해당 날짜의 00:00:00 UTC 타임스탬프 (시차 변환 없음)
  const utcMidnight = Date.UTC(year, month, day, 0, 0, 0, 0);

  // 해당 날짜의 23:59:59.999 UTC
  const utcDayEnd = utcMidnight + (24 * 60 * 60 * 1000) - 1;

  const startISO = new Date(utcMidnight).toISOString();
  const endISO = new Date(utcDayEnd).toISOString();

  const { data: teeTimes, error } = await supabase
    .from('tee_times')
    .select('*')
    .gte('tee_off', startISO)
    .lte('tee_off', endISO)
    .order('tee_off', { ascending: true });

  if (error) {
    console.error('Error fetching tee times:', error);
    return [];
  }

  const bookingTime = new Date();

  return teeTimes.map((item: any) => {
    // 1. 원본 시간 (DB에 있는 시간 그대로, Pricing Engine용)
    const originalDate = new Date(item.tee_off);

    // 2. 화면 표시용 시간 (-9시간 보정)
    // 브라우저가 +9시간 할 것을 대비해 미리 -9시간을 함
    const displayDate = new Date(originalDate.getTime() - (9 * 60 * 60 * 1000));

    // 3. Mock Weather 생성 (원본 시간 기준)
    const mockWeather = generateMockWeather(originalDate, originalDate.getHours());

    // 4. Pricing Engine 계산 (원본 시간 기준)
    const ctx: PricingContext = {
      teeOff: originalDate, // 중요: 원본 시간을 넣어야 함
      bookingTime: bookingTime,
      basePriceInput: item.base_price,
      weather: mockWeather,
      segment: 'Base',
    };

    const result = calculateDynamicPrice(ctx);

    return {
      id: item.id,
      tee_off: displayDate.toISOString(), // 중요: 화면에는 보정된 시간을 전달
      basePrice: result.basePrice,
      finalPrice: result.finalPrice,
      price: result.finalPrice,
      currency: item.currency || 'KRW',
      status: item.status,
      reasons: result.reasons,
      weather: mockWeather,
      // Backward compatibility fields
      teeOffTime: displayDate, // 화면 표시용 Date 객체도 보정된 시간 사용
      discountResult: result,
    };
  });
}