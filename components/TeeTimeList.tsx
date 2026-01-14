"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Gift, Timer, Calendar as CalendarIcon, Sunrise, Sun, Moon, Loader2 } from 'lucide-react';
import DateSelector from '@/components/DateSelector';
import BookingModal from '@/components/BookingModal';
import { TeeTimeWithPricing } from '@/utils/supabase/queries';
import { UserSegment } from '@/types/database';

interface TeeTimeListProps {
  initialTeeTimes: TeeTimeWithPricing[];
  initialDate: Date;
}

export default function TeeTimeList({ initialTeeTimes, initialDate }: TeeTimeListProps) {
  // 1. Hydration Mismatch 방지를 위한 마운트 상태 추가
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [teeTimes, setTeeTimes] = useState<TeeTimeWithPricing[]>(initialTeeTimes);
  
  // Sync state with props when server refetches
  useEffect(() => {
    setTeeTimes(initialTeeTimes);
    setSelectedDate(initialDate);
  }, [initialTeeTimes, initialDate]);

  const [selectedPart, setSelectedPart] = useState<'part1' | 'part2' | 'part3'>('part1');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedTeeTime, setSelectedTeeTime] = useState<TeeTimeWithPricing | null>(null);
  
  // Panic mode
  const [showPanic, setShowPanic] = useState(false);
  const [timeLeft, setTimeLeft] = useState(59 * 60 + 59);

  // 2. 마운트 처리: 컴포넌트가 브라우저에 올라온 후 mounted를 true로 변경
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle Date Change
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 10);
    router.push(`/?date=${localISOTime}`);
  };

  // Filter Logic
  const filteredTeeTimes = useMemo(() => {
    return teeTimes.filter((time) => {
      const date = new Date(time.tee_off);
      const hour = date.getHours();
      const minutes = date.getMinutes();
      const totalMinutes = hour * 60 + minutes;

      // Gap-filling logic to ensure no tee times are hidden
      if (selectedPart === 'part1') return totalMinutes < 660; // Until 11:00
      if (selectedPart === 'part2') return totalMinutes >= 660 && totalMinutes < 1020; // 11:00 ~ 17:00
      if (selectedPart === 'part3') return totalMinutes >= 1020; // 17:00 ~
      return false;
    });
  }, [teeTimes, selectedPart]);

  // Panic Timer
  useEffect(() => {
    if (!mounted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    
    if (teeTimes.length > 0 && Math.random() > 0.8) {
       const timeout = setTimeout(() => setShowPanic(true), 2000);
       return () => {
         clearTimeout(timeout);
         clearInterval(timer);
       };
    }
    return () => clearInterval(timer);
  }, [teeTimes, mounted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleTeeTimeClick = (teeTime: TeeTimeWithPricing) => {
    setSelectedTeeTime(teeTime);
    setIsBookingModalOpen(true);
  };

  const handleBookingSuccess = () => {
    setIsBookingModalOpen(false);
    router.refresh(); 
  };

  // Mock User Info
  const userInfo = {
      segment: 'PRESTIGE' as UserSegment,
      isNearby: true
  };

  // 3. 조건부 렌더링: 마운트 전에는 Loader2 표시 (Hydration Mismatch 해결)
  if (!mounted) {
    return (
      <div className="flex h-full justify-center items-center bg-gray-50 min-h-[400px]">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Panic Overlay */}
      {showPanic && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col justify-center items-center p-6 animate-in fade-in zoom-in duration-300">
           <div className="absolute top-10 right-0 w-full flex justify-center">
            <div className="bg-red-600 text-white font-black px-4 py-1 rounded-full animate-pulse flex items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.7)]">
              <Timer size={16} />
              마감임박 {formatTime(timeLeft)}
            </div>
          </div>
          <div className="text-center text-white mb-8">
            <h2 className="text-3xl font-black italic mb-2 text-yellow-400 drop-shadow-lg">PANIC DEAL!</h2>
            <p className="text-gray-300 text-lg leading-snug">고객님 위치에서 <span className="text-white font-bold underline">딱 25분</span> 걸립니다.<br/>지금 출발하면 이 가격!</p>
          </div>
          <div className="bg-white text-black p-6 rounded-3xl w-full max-w-xs text-center transform rotate-1 shadow-2xl border-4 border-yellow-400 relative">
            <div className="absolute -top-3 -left-3 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">CLUB 72</div>
            <h3 className="text-gray-500 font-bold mb-1">오늘 14:00 티오프</h3>
            <div className="text-4xl font-black text-red-600 mb-2 tracking-tighter">120,000원</div>
            <p className="text-xs text-gray-400 line-through mb-4">정가 280,000원</p>
            <button onClick={() => setShowPanic(false)} className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-colors shadow-lg active:scale-95">⚡️ 지금 바로 잡기</button>
          </div>
          <button onClick={() => setShowPanic(false)} className="mt-8 text-gray-500 underline text-sm hover:text-white transition-colors">괜찮습니다, 비싸게 칠게요.</button>
        </div>
      )}

      {/* Banner */}
      <div className="bg-black text-white p-5 m-4 rounded-2xl relative overflow-hidden cursor-pointer">
          <div className="relative z-10">
            <div className="text-xs font-bold text-yellow-400 mb-1">
              {userInfo.segment === 'PRESTIGE' ? '👑 VIP PRESTIGE' : '😀 WELCOME'}
            </div>
            <h2 className="text-lg font-bold leading-tight">
              {userInfo.isNearby ? '📍 현재 골프장 근처시군요!' : '회원님,'}<br/>
              오늘 <span className="text-yellow-400">특별 혜택</span>을 확인하세요.
            </h2>
          </div>
          <div className="absolute right-[-20px] bottom-[-20px] opacity-20">
            <Gift size={100} />
          </div>
      </div>

      {/* Date & Part Selector */}
      <div className="sticky top-0 bg-gray-50 z-10 pt-2">
           <DateSelector 
            selectedDate={selectedDate} 
            onDateChange={handleDateChange} 
          />
        
          <div className="px-4 py-2 bg-gray-50">
            <div className="flex gap-2 p-1 bg-white rounded-xl shadow-sm border border-gray-100">
              <button
                onClick={() => setSelectedPart('part1')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold rounded-lg transition-all ${
                  selectedPart === 'part1' ? 'bg-black text-yellow-400 shadow-md scale-100' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                <Sunrise size={14} /> 1부 (05:00~07:30)
              </button>
              <button
                onClick={() => setSelectedPart('part2')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold rounded-lg transition-all ${
                  selectedPart === 'part2' ? 'bg-black text-yellow-400 shadow-md scale-100' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                <Sun size={14} /> 2부 (11:00~14:30)
              </button>
              <button
                onClick={() => setSelectedPart('part3')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold rounded-lg transition-all ${
                  selectedPart === 'part3' ? 'bg-black text-yellow-400 shadow-md scale-100' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                <Moon size={14} /> 3부 (17:00~19:30)
              </button>
            </div>
          </div>
      </div>

      {/* List */}
      <div className="px-4 pt-2 flex-1">
          <h3 className="font-bold text-gray-800 mb-3 text-lg flex items-center justify-between">
            <span>실시간 티타임</span>
            <span className="text-[10px] font-normal text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
              {filteredTeeTimes.length}개 검색됨
            </span>
          </h3>
          
          {filteredTeeTimes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
              <CalendarIcon size={40} className="text-gray-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-700 mb-1">
                예약 마감
              </h3>
              <p className="text-sm text-gray-400">
                선택하신 시간대({selectedPart === 'part1' ? '1부' : selectedPart === 'part2' ? '2부' : '3부'})는<br/>모두 예약되었습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-8">
              {filteredTeeTimes.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => handleTeeTimeClick(item)}
                  className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-200 transition-all active:scale-[0.98]"
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-gray-900 font-mono tracking-tight">
                        {new Date(item.tee_off).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        selectedPart === 'part3' ? 'bg-purple-100 text-purple-700' :
                        selectedPart === 'part2' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {selectedPart === 'part1' ? 'Morning' : selectedPart === 'part2' ? 'Day' : 'Night'}
                      </span>
                    </div>
                    <div className="text-right">
                      {item.finalPrice < item.basePrice && (
                        <div className="text-xs text-gray-400 line-through decoration-gray-400">
                          {item.basePrice.toLocaleString()}
                        </div>
                      )}
                      <div className={`text-xl font-black ${item.finalPrice < item.basePrice ? 'text-red-500' : 'text-gray-900'}`}>
                        {item.finalPrice.toLocaleString()}<span className="text-sm font-normal text-gray-500">원</span>
                      </div>
                    </div>
                  </div>
                  {item.reasons && item.reasons.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-50">
                       <div className="flex flex-wrap gap-1">
                        {item.reasons.map((reason: string, idx: number) => (
                            <span key={idx} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                {reason}
                            </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
      </div>

      {selectedTeeTime && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          teeTime={selectedTeeTime}
          userId={1} 
          userSegment={userInfo.segment}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
}