"use client";

import React from 'react';
import { Calendar } from 'lucide-react';

/**
 * SDD-02: Enhanced Date Selector for User Main Booking Screen
 *
 * Features:
 * - Configurable maxForwardDays (default: 14)
 * - Golf green theme for selected dates
 * - Mobile-friendly horizontal scroll
 * - Touch-friendly button sizes (minimum 40px)
 * - Browser history navigation support
 */

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  maxForwardDays?: number; // SDD-02: Configurable range (default 14)
}

export default function DateSelector({
  selectedDate,
  onDateChange,
  maxForwardDays = 14
}: DateSelectorProps) {
  // Generate date array from today to maxForwardDays
  const dates = Array.from({ length: maxForwardDays }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString();
  };

  const formatDate = (date: Date) => {
    return {
      day: date.getDate(),
      weekday: ['일', '월', '화', '수', '목', '금', '토'][date.getDay()],
      month: date.getMonth() + 1,
    };
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={18} className="text-green-600" />
        <h2 className="text-sm font-bold text-gray-700">날짜 선택</h2>
        <span className="text-[10px] text-gray-400 ml-auto">
          오늘부터 {maxForwardDays}일
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {dates.map((date, index) => {
          const { day, weekday, month } = formatDate(date);
          const selected = isSelected(date);
          const today = isToday(date);

          return (
            <button
              key={index}
              onClick={() => onDateChange(date)}
              aria-label={`${month}월 ${day}일 ${weekday}요일 선택`}
              className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-xl border-2 transition-all ${
                selected
                  ? 'bg-green-600 border-green-600 text-white shadow-lg scale-105'
                  : today
                  ? 'bg-white border-green-300 text-green-700 hover:border-green-400'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'
              }`}
            >
              <div className={`text-[10px] font-medium ${
                selected ? 'text-green-100' : 'text-gray-500'
              }`}>
                {month}월
              </div>
              <div className="text-xl font-black">
                {day}
              </div>
              <div className={`text-[11px] font-bold ${
                selected
                  ? 'text-green-100'
                  : today
                  ? 'text-green-600'
                  : 'text-gray-500'
              }`}>
                {today ? '오늘' : weekday}
              </div>
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
