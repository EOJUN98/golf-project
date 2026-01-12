import { NextResponse } from 'next/server';

// ==================================================================
// 1. [설정] 인증키 및 골프장 위치 (환경변수에서 불러오기)
// ==================================================================
const SERVICE_KEY = process.env.WEATHER_API_KEY!; // ! = 무조건 있다고 TypeScript에 알려줌

const GRID_X = parseInt(process.env.GRID_X || '54'); // 인천 (Club 72)
const GRID_Y = parseInt(process.env.GRID_Y || '123');

const CONFIG = {
  MAX_DISCOUNT_RATE: 0.4, // 최대 40%
  RAIN_DISCOUNT: 0.2,     // 비 오면 20%
  CLOUDY_DISCOUNT: 0.1,   // 흐리면 10%
  URGENT_DISCOUNT: 0.15,  // 임박 15%
  LBS_DISCOUNT: 0.1,      // 지역주민 10%
};

// ==================================================================
// 2. [함수] 기상청 시간 계산 & API 호출 (app.js 로직 이식)
// ==================================================================
async function getRealWeather() {
  const now = new Date();
  
  // 한국 시간(KST) 보정
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(now.getTime() + kstOffset);

  const timeBlocks = [2, 5, 8, 11, 14, 17, 20, 23];
  let baseHour = 23;
  let baseDateStr = "";
  
  let hour = kstDate.getUTCHours();
  const safeHour = hour - 1; // 1시간 전 데이터 요청 (안전빵)

  for (let t of timeBlocks) if (t <= safeHour) baseHour = t;

  // 날짜 계산
  if (hour < 2) {
    const yesterday = new Date(kstDate.getTime() - 24 * 60 * 60 * 1000);
    const yYear = yesterday.getUTCFullYear();
    const yMonth = ('0' + (yesterday.getUTCMonth() + 1)).slice(-2);
    const yDay = ('0' + yesterday.getUTCDate()).slice(-2);
    baseDateStr = `${yYear}${yMonth}${yDay}`;
    baseHour = 23;
  } else {
    const year = kstDate.getUTCFullYear();
    const month = ('0' + (kstDate.getUTCMonth() + 1)).slice(-2);
    const day = ('0' + kstDate.getUTCDate()).slice(-2);
    baseDateStr = `${year}${month}${day}`;
  }
  const baseTimeStr = ('0' + baseHour).slice(-2) + "00";

  // API 호출
  const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst`;
  const queryParams = '?' + new URLSearchParams({
    serviceKey: SERVICE_KEY,
    pageNo: '1', numOfRows: '50', dataType: 'JSON',
    base_date: baseDateStr, base_time: baseTimeStr, nx: String(GRID_X), ny: String(GRID_Y)
  }).toString();

  try {
    const res = await fetch(url + queryParams, { next: { revalidate: 600 } }); // 10분 캐싱
    const json = await res.json();
    
    if (json.response?.header?.resultCode === '00') {
      const items = json.response.body.items.item;
      // 강수확률(POP) 찾기
      const popItem = items.find((item: any) => item.category === 'POP');
      const rainProb = popItem ? parseInt(popItem.fcstValue) : 0;
      return { rainProb, status: 'success' };
    }
    return { rainProb: 0, status: 'api_error' }; // 에러 시 맑음 처리
  } catch (e) {
    console.error(e);
    return { rainProb: 0, status: 'network_error' };
  }
}

// ==================================================================
// 3. [메인] API 응답 핸들러 (GET)
// ==================================================================
export async function GET() {
  // 1. 진짜 날씨 가져오기
  const weatherData = await getRealWeather();
  const rainProb = weatherData.rainProb; // 실제 강수확률
  
  // 2. 가상 유저 & 티타임
  const mockUser = { isNearby: true, segment: 'PRESTIGE' };
  let teeTimes = [
    { time: '07:20', basePrice: 250000 },
    { time: '08:00', basePrice: 250000 },
    { time: '13:00', basePrice: 280000 },
  ];

  // 3. 가격 계산 로직
  const calculatedTimes = teeTimes.map((tee) => {
    let finalPrice = tee.basePrice;
    let discountReasons = [];
    let totalDiscountRate = 0;

    // (A) 진짜 날씨 반영
    if (rainProb >= 60) {
      totalDiscountRate += CONFIG.RAIN_DISCOUNT;
      discountReasons.push(`☔️ 비 예보(${rainProb}%)`);
    } else if (rainProb >= 30) {
      totalDiscountRate += CONFIG.CLOUDY_DISCOUNT;
      discountReasons.push(`☁️ 흐림(${rainProb}%)`);
    }

    // (B) 임박 티 & LBS
    const hour = parseInt(tee.time.split(':')[0]);
    if (hour < 9) {
      totalDiscountRate += CONFIG.URGENT_DISCOUNT;
      discountReasons.push('⏰ 임박 티');
    }
    if (mockUser.isNearby) {
      totalDiscountRate += CONFIG.LBS_DISCOUNT;
      discountReasons.push('📍 이웃 할인');
    }

    // (C) 수익 방어
    if (totalDiscountRate > CONFIG.MAX_DISCOUNT_RATE) {
      totalDiscountRate = CONFIG.MAX_DISCOUNT_RATE;
      discountReasons.push('🛡 한도 적용');
    }

    finalPrice = tee.basePrice * (1 - totalDiscountRate);

    return {
      ...tee,
      finalPrice: Math.round(finalPrice / 1000) * 1000,
      discountRate: Math.round(totalDiscountRate * 100),
      reasons: discountReasons,
    };
  });

  return NextResponse.json({
    status: 'success',
    data: calculatedTimes,
    user: mockUser,
    weather: { rainProb, isRaining: rainProb >= 50 } // 프론트엔드로 날씨 정보 전달
  });
}