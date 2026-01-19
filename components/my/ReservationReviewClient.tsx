/**
 * Reservation Review Client
 *
 * Allows users to leave a review and record round details.
 */

'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, MapPin, Calendar, Clock, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ReservationReviewClientProps {
  reservation: {
    id: string;
    course_name: string;
    location_name: string;
    tee_off: string;
  };
}

export default function ReservationReviewClient({
  reservation,
}: ReservationReviewClientProps) {
  const router = useRouter();
  const holes = useMemo(() => Array.from({ length: 18 }, (_, i) => i + 1), []);
  const [caddyRating, setCaddyRating] = useState<number | null>(null);
  const [courseRating, setCourseRating] = useState<number | null>(null);

  return (
    <div className="flex flex-col flex-1 overflow-y-auto pb-24">
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-black text-gray-900 mt-2">후기 & 라운드 기록</h1>
        <div className="mt-3 p-3 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <MapPin size={14} className="text-green-600" />
            <span className="font-bold">{reservation.course_name}</span>
            <span className="text-xs text-gray-500">({reservation.location_name})</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              <span>
                {new Date(reservation.tee_off).toLocaleDateString('ko-KR')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>
                {new Date(reservation.tee_off).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <section className="bg-white rounded-2xl border border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">후기</h2>
          <textarea
            className="w-full min-h-[120px] border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="라운드 후기를 남겨주세요."
          />
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">라운드 기록</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="text-xs text-gray-600">
              총 스코어
              <input
                type="number"
                min={50}
                max={150}
                className="mt-2 w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="예: 86"
              />
            </label>
            <label className="text-xs text-gray-600">
              라운드 평점 메모
              <input
                type="text"
                className="mt-2 w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="예: 드라이버 감각 좋음"
              />
            </label>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 text-xs font-semibold text-gray-600 px-3 py-2">
              <div>홀</div>
              <div>스코어</div>
              <div>퍼트</div>
            </div>
            <div className="divide-y divide-gray-200">
              {holes.map((hole) => (
                <div key={hole} className="grid grid-cols-3 items-center px-3 py-2 gap-2">
                  <div className="text-sm font-bold text-gray-800">{hole}홀</div>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    className="border border-gray-200 rounded-md p-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="-"
                  />
                  <input
                    type="number"
                    min={0}
                    max={6}
                    className="border border-gray-200 rounded-md p-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="-"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-2">캐디 평가</h2>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={`caddy-${value}`}
                  type="button"
                  onClick={() => setCaddyRating(value)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm font-medium ${
                    caddyRating === value
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'
                  }`}
                >
                  <Star size={14} className={caddyRating === value ? 'fill-white' : 'text-yellow-400'} />
                  {value}점
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-2">구장 평가</h2>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={`course-${value}`}
                  type="button"
                  onClick={() => setCourseRating(value)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm font-medium ${
                    courseRating === value
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'
                  }`}
                >
                  <Star size={14} className={courseRating === value ? 'fill-white' : 'text-yellow-400'} />
                  {value}점
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-2">
            구장 이슈 등록 (컴플레인)
          </h2>
          <textarea
            className="w-full min-h-[120px] border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="코스 상태, 진행 이슈 등 남기고 싶은 내용을 입력하세요."
          />
        </section>

        <button
          type="button"
          className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-lg hover:bg-green-700 transition-colors"
        >
          후기 저장하기
        </button>
      </main>
    </div>
  );
}
