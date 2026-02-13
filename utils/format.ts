/**
 * Shared formatting utilities
 */

/** Format date in Korean locale (e.g. "2025년 1월 15일 (수)") */
export function formatKoreanDate(
  date: string | Date,
  options?: { includeWeekday?: boolean; includeTime?: boolean }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const { includeWeekday = true, includeTime = false } = options ?? {};

  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(includeWeekday && { weekday: 'short' }),
    ...(includeTime && { hour: '2-digit', minute: '2-digit' }),
  };

  return d.toLocaleDateString('ko-KR', dateOptions);
}

/** Format Korean Won (e.g. "144,000원") */
export function formatWon(amount: number): string {
  return `${amount.toLocaleString()}원`;
}

/** Format time from ISO string (e.g. "14:30") */
export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
