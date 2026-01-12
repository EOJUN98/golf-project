"use client";

import React from 'react';
import { Calendar } from 'lucide-react';

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export default function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  // Generate next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
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
        <Calendar size={18} className="text-blue-600" />
        <h2 className="text-sm font-bold text-gray-700">날짜 선택</h2>
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
              className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-xl border-2 transition-all ${
                selected
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
              }`}
            >
              <div className="text-[10px] font-medium opacity-70">
                {month}월
              </div>
              <div className="text-xl font-black">
                {day}
              </div>
              <div className={`text-[11px] font-bold ${
                selected ? 'text-blue-100' : today ? 'text-blue-600' : 'text-gray-500'
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
