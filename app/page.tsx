import { Home, Ticket, User, Menu } from 'lucide-react';
import { getTeeTimesByDate } from '@/utils/supabase/queries';
import TeeTimeList from '@/components/TeeTimeList';
import SiteHeader from '@/components/SiteHeader';
import PageCanvas from '@/components/layout/PageCanvas';

export const dynamic = 'force-dynamic'; // Ensure fresh data on every request

/**
 * SDD-02: Date Picker + Main Booking Screen Multi-Date UI
 *
 * This server component handles:
 * 1. URL query parameter ?date=YYYY-MM-DD parsing
 * 2. Date validation and range checking (0 to MAX_FORWARD_DAYS)
 * 3. Fallback to today's date for invalid/out-of-range dates
 * 4. Server-side data fetching with fresh pricing
 */

// Configuration: Maximum days forward users can select (14 or 30 days)
const MAX_FORWARD_DAYS = 14;

export default async function MainPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const resolvedParams = await searchParams;
  const dateStr = resolvedParams.date;

  // Parse and validate date
  let selectedDate = new Date();

  if (dateStr) {
    const parsedDate = new Date(dateStr);

    // Validate date format (check if valid date object)
    if (isNaN(parsedDate.getTime())) {
      console.warn(`[SDD-02] Invalid date format: ${dateStr}, falling back to today`);
      selectedDate = new Date();
    } else {
      // Validate date range (0 to MAX_FORWARD_DAYS from today)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset to midnight for comparison

      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + MAX_FORWARD_DAYS);

      const inputDate = new Date(parsedDate);
      inputDate.setHours(0, 0, 0, 0);

      // Check if date is in the past
      if (inputDate < today) {
        console.warn(`[SDD-02] Date ${dateStr} is in the past, falling back to today`);
        selectedDate = new Date();
      }
      // Check if date exceeds max forward range
      else if (inputDate > maxDate) {
        console.warn(`[SDD-02] Date ${dateStr} exceeds ${MAX_FORWARD_DAYS} days forward, falling back to today`);
        selectedDate = new Date();
      }
      // Valid date within range
      else {
        selectedDate = parsedDate;
      }
    }
  }

  // Server-side Fetching - automatically uses logged-in user's segment
  const teeTimes = await getTeeTimesByDate(selectedDate, undefined, undefined);

  // Format date as YYYY-MM-DD for client component
  const dateForClient = selectedDate.toISOString().slice(0, 10);

  return (
    <PageCanvas>
      <SiteHeader />

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Client Component for Interactive List */}
        <TeeTimeList
          initialTeeTimes={teeTimes}
          initialDate={selectedDate}
          initialDateStr={dateForClient}
          maxForwardDays={MAX_FORWARD_DAYS}
        />
      </div>

      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-200 flex justify-around py-4 text-xs font-medium text-gray-400 z-50 pb-safe">
        <button className="flex flex-col items-center text-black"><Home size={24} className="mb-1" />홈</button>
        <button className="flex flex-col items-center hover:text-black"><Ticket size={24} className="mb-1" />예약</button>
        <button className="flex flex-col items-center hover:text-black"><User size={24} className="mb-1" />MY</button>
        <button className="flex flex-col items-center hover:text-black"><Menu size={24} className="mb-1" />메뉴</button>
      </nav>
    </PageCanvas>
  );
}
