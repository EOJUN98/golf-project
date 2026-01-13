"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { MapPin, Gift, Home, Ticket, User, Menu, Loader2, Timer, Calendar as CalendarIcon, Sun, Moon, Sunrise } from 'lucide-react';
import DateSelector from '@/components/DateSelector';
import BookingModal from '@/components/BookingModal';
import { getTeeTimesByDate, TeeTimeWithPricing } from '@/utils/supabase/queries';

export default function MainPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [teeTimes, setTeeTimes] = useState<TeeTimeWithPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);

  // 1부/2부/3부 탭 상태
  const [selectedPart, setSelectedPart] = useState<'part1' | 'part2' | 'part3'>('part1');
  
  // Booking modal state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedTeeTime, setSelectedTeeTime] = useState<TeeTimeWithPricing | null>(null);
  
  // Panic mode state
  const [showPanic, setShowPanic] = useState(false);
  const [timeLeft, setTimeLeft] = useState(59 * 60 + 59);

  useEffect(() => {
    async function fetchTeeTimesForDate() {
      setLoading(true);
      try {
        const data = await getTeeTimesByDate(selectedDate);
        setTeeTimes(data);
        
        setSelectedPart('part1');
        
        setUserInfo({
          segment: 'PRESTIGE',
          isNearby: true,
        });

        if (data.length > 0 && Math.random() > 0.7) {
          setTimeout(() => setShowPanic(true), 2000);
        }
      } catch (error) {
        console.error('Failed to fetch tee times:', error);
        setTeeTimes([]);
      } finally {
        setLoading(false);
      }
    }

    fetchTeeTimesForDate();
  }, [selectedDate]);

  const filteredTeeTimes = useMemo(() => {
    return teeTimes.filter((time) => {
      const hour = new Date(time.tee_off).getHours(); 

      if (selectedPart === 'part1') return hour < 11;               
      if (selectedPart === 'part2') return hour >= 11 && hour < 17; 
      if (selectedPart === 'part3') return hour >= 17;              
      return false;
    });
  }, [teeTimes, selectedPart]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
    getTeeTimesByDate(selectedDate).then(setTeeTimes);
  };

  if (loading) {
    return (
      <div className="flex h-screen justify-center items-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto shadow-2xl overflow-hidden relative">
      
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

      <header className="bg-white p-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <h1 className="text-2xl font-black text-black tracking-tighter">TUGOL</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center text-sm font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            <MapPin size={14} className="mr-1 text-blue-500" />
            인천 (Club 72)
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-24">
        
        <div className="bg-black text-white p-5 m-4 rounded-2xl relative overflow-hidden cursor-pointer">
          <div className="relative z-10">
            <div className="text-xs font-bold text-yellow-400 mb-1">
              {userInfo?.segment === 'PRESTIGE' ? '👑 VIP PRESTIGE' : '😀 WELCOME'}
            </div>
            <h2 className="text-lg font-bold leading-tight">
              {userInfo?.isNearby ? '📍 현재 골프장 근처시군요!' : '회원님,'}<br/>
              오늘 <span className="text-yellow-400">특별 혜택</span>을 확인하세요.
            </h2>
          </div>
          <div className="absolute right-[-20px] bottom-[-20px] opacity-20">
            <Gift size={100} />
          </div>
        </div>

        <div className="sticky top-0 bg-gray-50 z-10 pt-2">
           <DateSelector 
            selectedDate={selectedDate} 
            onDateChange={setSelectedDate} 
          />
        
          <div className="px-4 py-2 bg-gray-50">
            <div className="flex gap-2 p-1 bg-white rounded-xl shadow-sm border border-gray-100">
              <button
                onClick={() => setSelectedPart('part1')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all ${
                  selectedPart === 'part1' ? 'bg-black text-yellow-400 shadow-md scale-100' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                <Sunrise size={14} /> 1부(아침)
              </button>
              <button
                onClick={() => setSelectedPart('part2')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all ${
                  selectedPart === 'part2' ? 'bg-black text-yellow-400 shadow-md scale-100' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                <Sun size={14} /> 2부(오후)
              </button>
              <button
                onClick={() => setSelectedPart('part3')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all ${
                  selectedPart === 'part3' ? 'bg-black text-yellow-400 shadow-md scale-100' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                <Moon size={14} /> 3부(야간)
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 pt-2">
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
              {filteredTeeTimes.map((item, index) => (
                <div 
                  key={index} 
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
      </div>

      {selectedTeeTime && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          teeTime={selectedTeeTime}
          userId={1}
          userSegment={userInfo?.segment || 'SMART'}
          onSuccess={handleBookingSuccess}
        />
      )}

      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-200 flex justify-around py-4 text-xs font-medium text-gray-400 z-50 pb-safe">
        <button className="flex flex-col items-center text-black"><Home size={24} className="mb-1" />홈</button>
        <button className="flex flex-col items-center hover:text-black"><Ticket size={24} className="mb-1" />예약</button>
        <button className="flex flex-col items-center hover:text-black"><User size={24} className="mb-1" />MY</button>
        <button className="flex flex-col items-center hover:text-black"><Menu size={24} className="mb-1" />메뉴</button>
      </nav>
    </div>
  );
}