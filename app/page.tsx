"use client";

import { useEffect, useState } from 'react';
import { MapPin, Home, Ticket, User, Menu, Loader2, Timer } from 'lucide-react';
import PriceCard from '@/components/PriceCard';
import WeatherWidget from '@/components/WeatherWidget';
import { calculatePrice, isPanicMode, shouldBlockTeeTime } from '@/utils/pricingEngine';
import { supabase } from '@/lib/supabase';
import type { WeatherData, LocationInfo, UserSegment, TeeTimeStatus } from '@/types/database';

// ==================================================================
// MOCK DATA - 4 Scenarios for Testing
// ==================================================================

const MOCK_USER = {
  id: 1,
  name: '재마나이',
  segment: 'PRESTIGE' as UserSegment,
  location: {
    isNearby: true,
    distanceToClub: 8.5,
    lat: 37.4563,
    lng: 126.7052,
  } as LocationInfo,
};

const MOCK_WEATHER_SUNNY: WeatherData = {
  status: 'success',
  rainProb: 10,
  rainfall: 0,
  temperature: 18,
  sky: 'CLEAR',
};

const MOCK_WEATHER_CLOUDY: WeatherData = {
  status: 'success',
  rainProb: 40,
  rainfall: 0,
  temperature: 15,
  sky: 'CLOUDY',
};

const MOCK_WEATHER_RAIN: WeatherData = {
  status: 'success',
  rainProb: 80,
  rainfall: 5,
  temperature: 12,
  sky: 'RAIN',
};

const MOCK_WEATHER_BLOCKED: WeatherData = {
  status: 'success',
  rainProb: 90,
  rainfall: 15, // 10mm 이상 → 차단
  temperature: 10,
  sky: 'HEAVY_RAIN',
};

// Tee Times with different scenarios
const MOCK_TEE_TIMES = [
  {
    id: 1,
    teeOffTime: new Date(Date.now() + 45 * 60 * 1000), // 45분 후 - PANIC MODE
    basePrice: 250000,
    weather: MOCK_WEATHER_SUNNY,
    status: 'OPEN' as TeeTimeStatus,
  },
  {
    id: 2,
    teeOffTime: new Date(Date.now() + 90 * 60 * 1000), // 1.5시간 후
    basePrice: 280000,
    weather: MOCK_WEATHER_CLOUDY,
    status: 'OPEN' as TeeTimeStatus,
  },
  {
    id: 3,
    teeOffTime: new Date(Date.now() + 120 * 60 * 1000), // 2시간 후
    basePrice: 250000,
    weather: MOCK_WEATHER_RAIN,
    status: 'OPEN' as TeeTimeStatus,
  },
  {
    id: 4,
    teeOffTime: new Date(Date.now() + 150 * 60 * 1000), // 2.5시간 후 - BLOCKED
    basePrice: 280000,
    weather: MOCK_WEATHER_BLOCKED,
    status: 'BLOCKED' as TeeTimeStatus,
  },
  {
    id: 5,
    teeOffTime: new Date(Date.now() + 180 * 60 * 1000), // 3시간 후
    basePrice: 250000,
    weather: MOCK_WEATHER_SUNNY,
    status: 'BOOKED' as TeeTimeStatus,
  },
];

export default function MainPage() {
  const [processedTeeTimes, setProcessedTeeTimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanic, setShowPanic] = useState(false);
  const [panicTeeTime, setPanicTeeTime] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(59 * 60 + 59);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch real data from Supabase
    async function fetchTeeTimes() {
      try {
        // Fetch today's tee times from Supabase
        const { data: teeTimes, error: fetchError } = await supabase
          .from('tee_times')
          .select(`
            id,
            tee_off_time,
            base_price,
            status,
            weather_data,
            golf_clubs (
              id,
              name,
              location_lat,
              location_lng
            )
          `)
          .gte('tee_off_time', new Date().toISOString())
          .order('tee_off_time', { ascending: true })
          .limit(10);

        if (fetchError) throw fetchError;

        // Fallback to mock data if no real data exists
        const dataSource = teeTimes && teeTimes.length > 0 ? teeTimes : MOCK_TEE_TIMES.map(mock => ({
          id: mock.id,
          tee_off_time: mock.teeOffTime.toISOString(),
          base_price: mock.basePrice,
          status: mock.status,
          weather_data: mock.weather,
          golf_clubs: null,
        }));

        // Process all tee times with pricing engine
        const processed = dataSource.map((teeTime: any) => {
          // Parse weather data (could be JSONB from DB or object from mock)
          const weather: WeatherData = typeof teeTime.weather_data === 'string'
            ? JSON.parse(teeTime.weather_data)
            : teeTime.weather_data;

          const teeOffTime = new Date(teeTime.tee_off_time);

          // Check if should be blocked by weather
          const shouldBlock = shouldBlockTeeTime(weather);
          const finalStatus = shouldBlock ? 'BLOCKED' : teeTime.status;

          // Calculate price using engine
          const pricing = calculatePrice({
            basePrice: teeTime.base_price,
            teeOffTime: teeOffTime,
            weather: weather,
            location: MOCK_USER.location,
            userSegment: MOCK_USER.segment,
          });

          // Check panic mode
          const isPanic = isPanicMode(
            teeOffTime,
            teeTime.status === 'BOOKED',
            MOCK_USER.location
          );

          return {
            id: teeTime.id,
            teeOffTime: teeOffTime,
            basePrice: teeTime.base_price,
            weather: weather,
            ...pricing,
            status: finalStatus,
            isPanic,
            time: teeOffTime.toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          };
        });

        setProcessedTeeTimes(processed);

        // Find first panic mode tee time
        const panicItem = processed.find((t) => t.isPanic && t.status === 'OPEN');
        if (panicItem) {
          setPanicTeeTime(panicItem);
          // Show panic popup after 2 seconds
          setTimeout(() => setShowPanic(true), 2000);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching tee times:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
        setLoading(false);
      }
    }

    fetchTeeTimes();

    // Timer countdown
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 시간 포맷팅 (MM:SS)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <div className="flex h-screen justify-center items-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen justify-center items-center bg-gray-50 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-700 font-bold text-lg mb-2">데이터 로드 실패</h2>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto shadow-2xl overflow-hidden relative">
      
      {/* ==================================================================
          🚨 [패닉 모드 팝업] - 조건부 렌더링
          ================================================================== */}
      {showPanic && panicTeeTime && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col justify-center items-center p-6 animate-in fade-in zoom-in duration-300">
          <div className="absolute top-10 right-0 w-full flex justify-center">
            <div className="bg-red-600 text-white font-black px-4 py-1 rounded-full animate-pulse flex items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.7)]">
              <Timer size={16} />
              마감임박 {formatTime(timeLeft)}
            </div>
          </div>

          <div className="text-center text-white mb-8">
            <h2 className="text-3xl font-black italic mb-2 text-yellow-400 drop-shadow-lg">
              PANIC DEAL!
            </h2>
            <p className="text-gray-300 text-lg leading-snug">
              고객님 위치에서 <span className="text-white font-bold underline">딱 {Math.round(MOCK_USER.location.distanceToClub! * 3)}분</span> 걸립니다.<br/>
              지금 출발하면 이 가격!
            </p>
          </div>

          <div className="bg-white text-black p-6 rounded-3xl w-full max-w-xs text-center transform rotate-1 shadow-2xl border-4 border-yellow-400 relative">
            <div className="absolute -top-3 -left-3 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              CLUB 72
            </div>
            <h3 className="text-gray-500 font-bold mb-1">오늘 {panicTeeTime.time} 티오프</h3>
            <div className="text-4xl font-black text-red-600 mb-2 tracking-tighter">
              {panicTeeTime.finalPrice.toLocaleString()}원
            </div>
            <p className="text-xs text-gray-400 line-through mb-4">정가 {panicTeeTime.basePrice.toLocaleString()}원</p>

            <button className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-colors shadow-lg active:scale-95">
              ⚡️ 지금 바로 잡기
            </button>
          </div>

          <button
            onClick={() => setShowPanic(false)}
            className="mt-8 text-gray-500 underline text-sm hover:text-white transition-colors"
          >
            괜찮습니다, 비싸게 칠게요.
          </button>
        </div>
      )}

      {/* ==================================================================
          [기본 메인 화면] - 뒤에 깔려있는 화면
          ================================================================== */}
      <header className="bg-white p-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <h1 className="text-2xl font-black text-black tracking-tighter">TUGOL</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center text-sm font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            <MapPin size={14} className="mr-1 text-blue-500" />
            인천 (Club 72)
          </div>
        </div>
      </header>

      <WeatherWidget
        rainProb={MOCK_WEATHER_SUNNY.rainProb}
        locationMessage={MOCK_USER.location.isNearby ? '현재 골프장 근처시군요!' : undefined}
        userSegment={MOCK_USER.segment}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        <h3 className="font-bold text-gray-800 mb-3 text-lg flex items-center">
          실시간 AI 추천가
          <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">Live</span>
        </h3>

        <div className="space-y-3">
          {processedTeeTimes.map((teeTime) => (
            <PriceCard
              key={teeTime.id}
              time={teeTime.time}
              basePrice={teeTime.basePrice}
              finalPrice={teeTime.finalPrice}
              reasons={teeTime.reasons}
              status={teeTime.status}
              onClick={() => console.log('클릭:', teeTime.id)}
            />
          ))}
        </div>
      </div>

      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-200 flex justify-around py-4 text-xs font-medium text-gray-400 z-50">
        <button className="flex flex-col items-center text-black"><Home size={24} className="mb-1" />홈</button>
        <button className="flex flex-col items-center hover:text-black"><Ticket size={24} className="mb-1" />예약</button>
        <button className="flex flex-col items-center hover:text-black"><User size={24} className="mb-1" />MY</button>
        <button className="flex flex-col items-center hover:text-black"><Menu size={24} className="mb-1" />메뉴</button>
      </nav>
    </div>
  );
}