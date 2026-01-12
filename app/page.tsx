"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  MapPin, Home, Ticket, User, Menu, Loader2, Timer, Settings, 
  LogIn, LogOut // 아이콘 추가
} from 'lucide-react';
import PriceCard from '@/components/PriceCard';
import WeatherWidget from '@/components/WeatherWidget';
import BookingModal from '@/components/BookingModal';
import { calculatePrice, isPanicMode, shouldBlockTeeTime } from '@/utils/pricingEngine';
import { supabase } from '@/lib/supabase';
import { createBrowserClient } from '@supabase/ssr'; // 로그인 확인용
import type { WeatherData, LocationInfo, UserSegment, TeeTimeStatus } from '@/types/database';

// ==================================================================
// MOCK DATA 
// ==================================================================

const MOCK_USER = {
  id: 1, // *중요* 실제 로그인 구현 후에는 DB의 user.id를 써야 함
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

// ... (나머지 MOCK 데이터들은 너무 길어서 생략, 아래 로직에 영향 없음) ...
const MOCK_TEE_TIMES = [
  { id: 1, teeOffTime: new Date(Date.now() + 45 * 60 * 1000), basePrice: 250000, weather: MOCK_WEATHER_SUNNY, status: 'OPEN' as TeeTimeStatus },
  { id: 2, teeOffTime: new Date(Date.now() + 90 * 60 * 1000), basePrice: 280000, weather: MOCK_WEATHER_SUNNY, status: 'OPEN' as TeeTimeStatus },
  { id: 3, teeOffTime: new Date(Date.now() + 120 * 60 * 1000), basePrice: 250000, weather: MOCK_WEATHER_SUNNY, status: 'OPEN' as TeeTimeStatus },
];

export default function MainPage() {
  const [processedTeeTimes, setProcessedTeeTimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanic, setShowPanic] = useState(false);
  const [panicTeeTime, setPanicTeeTime] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(59 * 60 + 59);
  const [error, setError] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedTeeTime, setSelectedTeeTime] = useState<any>(null);
  
  // 로그인 유저 상태
  const [user, setUser] = useState<any>(null);

  // 초기 데이터 로드 및 로그인 확인
  useEffect(() => {
    // 1. 로그인 상태 확인
    const checkUser = async () => {
      const supabaseBrowser = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      setUser(user);
    };
    checkUser();

    // 2. 티타임 데이터 가져오기
    async function fetchTeeTimes() {
      try {
        const { data: teeTimes, error: fetchError } = await supabase
          .from('tee_times')
          .select('*')
          .gte('tee_off', new Date().toISOString())
          .order('tee_off', { ascending: true })
          .limit(10);

        if (fetchError) console.warn('Supabase fetch failed, using mock');

        // 데이터가 없으면 MOCK 사용
        const dataSource = teeTimes && teeTimes.length > 0 ? teeTimes : MOCK_TEE_TIMES.map(mock => ({
          id: mock.id,
          tee_off: mock.teeOffTime.toISOString(),
          base_price: mock.basePrice,
          status: mock.status,
          weather_condition: mock.weather,
          golf_club_id: null,
        }));

        const processed = dataSource.map((teeTime: any) => {
          const weather = typeof teeTime.weather_condition === 'string'
            ? JSON.parse(teeTime.weather_condition)
            : teeTime.weather_condition || MOCK_WEATHER_SUNNY;

          const teeOffStr = teeTime.tee_off || teeTime.tee_off_time;
          const teeOffTime = new Date(teeOffStr);
          const shouldBlock = shouldBlockTeeTime(weather);
          const finalStatus = shouldBlock ? 'BLOCKED' : teeTime.status;

          const pricing = calculatePrice({
            basePrice: teeTime.base_price,
            teeOffTime: teeOffTime,
            weather: weather,
            location: MOCK_USER.location,
            userSegment: MOCK_USER.segment,
          });

          const isPanic = isPanicMode(teeOffTime, teeTime.status === 'BOOKED', MOCK_USER.location);

          return {
            id: teeTime.id,
            teeOffTime: teeOffTime,
            basePrice: teeTime.base_price,
            weather: weather,
            ...pricing,
            status: finalStatus,
            isPanic,
            time: teeOffTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          };
        });

        setProcessedTeeTimes(processed);

        const panicItem = processed.find((t) => t.isPanic && t.status === 'OPEN');
        if (panicItem) {
          setPanicTeeTime(panicItem);
          setTimeout(() => setShowPanic(true), 2000);
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    }

    fetchTeeTimes();

    const timer = setInterval(() => setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    const supabaseBrowser = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabaseBrowser.auth.signOut();
    window.location.reload(); // 새로고침해서 상태 초기화
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) return <div className="flex h-screen justify-center items-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto shadow-2xl overflow-hidden relative">
      
      {/* 패닉 팝업 */}
      {showPanic && panicTeeTime && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col justify-center items-center p-6 animate-in fade-in zoom-in duration-300">
           {/* ... (기존 패닉 UI 유지) ... */}
           <div className="text-white text-center mb-4">
             <h2 className="text-2xl font-bold text-yellow-400">PANIC DEAL!</h2>
             <p>지금 예약하면 특가!</p>
           </div>
           <button onClick={() => setShowPanic(false)} className="text-white underline">닫기</button>
        </div>
      )}

      {/* --- Header (로그인 상태 반영) --- */}
      <header className="bg-white p-4 flex justify-between items-center sticky top-0 z-10 shadow-sm border-b border-gray-100">
        <h1 className="text-2xl font-black text-black tracking-tighter italic">TUGOL</h1>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
            <MapPin size={12} className="mr-1 text-blue-500" />
            인천
          </div>

          {user ? (
            // 로그인 상태: 관리자 버튼 + 로그아웃 버튼
            <div className="flex items-center gap-1">
              <Link href="/admin" className="p-2 text-gray-400 hover:text-gray-900 rounded-full transition-colors">
                 <Settings size={20} />
              </Link>
              <button 
                onClick={handleLogout} 
                className="p-2 text-red-400 hover:text-red-600 rounded-full transition-colors"
                title="로그아웃"
              >
                 <LogOut size={20} />
              </button>
            </div>
          ) : (
            // 로그아웃 상태: 로그인 버튼
            <Link 
              href="/login" 
              className="flex items-center gap-1 bg-[#FEE500] text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#FDD835] transition-colors"
            >
              <LogIn size={14} />
              로그인
            </Link>
          )}
        </div>
      </header>

      <WeatherWidget rainProb={10} userSegment={MOCK_USER.segment} />

      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
        <h3 className="font-bold text-gray-800 mb-3 text-lg">실시간 티타임</h3>
        <div className="space-y-3">
          {processedTeeTimes.map((teeTime) => (
            <PriceCard
              key={teeTime.id}
              time={teeTime.time}
              basePrice={teeTime.basePrice}
              finalPrice={teeTime.finalPrice}
              reasons={teeTime.reasons}
              status={teeTime.status}
              onClick={() => {
                if (teeTime.status === 'OPEN') {
                  setSelectedTeeTime(teeTime);
                  setShowBookingModal(true);
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* 하단 Nav */}
      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-200 flex justify-around py-4 text-xs font-medium text-gray-400 z-40">
        <Link href="/" className="flex flex-col items-center text-black"><Home size={24} className="mb-1" />홈</Link>
        <Link href="/reservations" className="flex flex-col items-center hover:text-black"><Ticket size={24} className="mb-1" />예약</Link>
        <button className="flex flex-col items-center hover:text-black"><User size={24} className="mb-1" />MY</button>
        <button className="flex flex-col items-center hover:text-black"><Menu size={24} className="mb-1" />메뉴</button>
      </nav>

      {/* 예약 모달 */}
      {selectedTeeTime && (
        <BookingModal
          isOpen={showBookingModal}
          onClose={() => { setShowBookingModal(false); setSelectedTeeTime(null); }}
          teeTime={selectedTeeTime}
          userId={user?.id || MOCK_USER.id} // 로그인 유저 ID 사용
          userSegment={MOCK_USER.segment}
          onSuccess={() => window.location.reload()}
        />
      )}
    </div>
  );
}