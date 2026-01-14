import { MapPin, Home, Ticket, User, Menu } from 'lucide-react';
import { getTeeTimesByDate } from '@/utils/supabase/queries';
import TeeTimeList from '@/components/TeeTimeList';

export const dynamic = 'force-dynamic'; // Ensure fresh data on every request

export default async function MainPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const resolvedParams = await searchParams;
  const dateStr = resolvedParams.date;
  const date = dateStr ? new Date(dateStr) : new Date();

  // Server-side Fetching with 0 loading state (no client spinner for initial load)
  const teeTimes = await getTeeTimesByDate(date);

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto shadow-2xl overflow-hidden relative">
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
        {/* Client Component for Interactive List */}
        <TeeTimeList initialTeeTimes={teeTimes} initialDate={date} />
      </div>

      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-200 flex justify-around py-4 text-xs font-medium text-gray-400 z-50 pb-safe">
        <button className="flex flex-col items-center text-black"><Home size={24} className="mb-1" />홈</button>
        <button className="flex flex-col items-center hover:text-black"><Ticket size={24} className="mb-1" />예약</button>
        <button className="flex flex-col items-center hover:text-black"><User size={24} className="mb-1" />MY</button>
        <button className="flex flex-col items-center hover:text-black"><Menu size={24} className="mb-1" />메뉴</button>
      </nav>
    </div>
  );
}
