/**
 * Round Review Client Component
 *
 * Form to record round details and write review
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  Star,
  User,
  MapPin,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface RoundReviewClientProps {
  reservation: {
    id: number;
    tee_time_id: number;
    status: string;
    tee_times: {
      id: number;
      tee_off: string;
      golf_clubs: {
        id: number;
        name: string;
        location_name: string;
      };
    };
  };
}

export default function RoundReviewClient({
  reservation,
}: RoundReviewClientProps) {
  const router = useRouter();

  // Form state
  const [totalScore, setTotalScore] = useState<number>(90);
  const [holeScores, setHoleScores] = useState<number[]>(Array(18).fill(5));
  const [holePutts, setHolePutts] = useState<number[]>(Array(18).fill(2));
  const [caddyRating, setCaddyRating] = useState<number>(5);
  const [courseRating, setCourseRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');
  const [issueText, setIssueText] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleHoleScoreChange = (hole: number, score: number) => {
    const newScores = holeScores.map((s, i) => (i === hole ? score : s));
    setHoleScores(newScores);
    setTotalScore(newScores.reduce((sum, s) => sum + s, 0));
  };

  const handleHolePuttsChange = (hole: number, putts: number) => {
    setHolePutts((prev) => prev.map((p, i) => (i === hole ? putts : p)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 flex items-center justify-center">
        <div className="text-center p-8">
          <CheckCircle size={64} className="text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            라운드 기록 저장 완료!
          </h2>
          <p className="text-gray-600 mb-6">
            소중한 후기 감사합니다
          </p>
          <button
            onClick={() => router.push('/my/reservations')}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors"
          >
            예약 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <button
          onClick={() => router.back()}
          className="text-green-600 font-medium mb-2"
        >
          ← 뒤로
        </button>
        <h1 className="text-2xl font-black text-gray-900">라운드 후기 작성</h1>
        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
          <MapPin size={14} />
          <span>{reservation.tee_times.golf_clubs.name}</span>
          <span className="text-gray-400">·</span>
          <span>
            {new Date(reservation.tee_times.tee_off).toLocaleDateString(
              'ko-KR'
            )}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Total Score */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Trophy size={18} className="text-green-600" />
            총 스코어
          </h2>
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={totalScore}
              onChange={(e) => setTotalScore(parseInt(e.target.value))}
              className="text-4xl font-black text-green-600 w-32 border-b-2 border-green-600 focus:outline-none text-center"
              min="50"
              max="150"
            />
            <span className="text-gray-600">타</span>
          </div>
        </div>

        {/* Hole Scores */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200">
          <h2 className="font-bold text-gray-900 mb-3">홀별 스코어 및 퍼트</h2>
          <div className="space-y-3">
            {[...Array(18)].map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-3 gap-3 items-center p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-green-600">
                    {index + 1}홀
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">스코어:</label>
                  <input
                    type="number"
                    value={holeScores[index]}
                    onChange={(e) =>
                      handleHoleScoreChange(index, parseInt(e.target.value))
                    }
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-center font-bold"
                    min="1"
                    max="15"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">퍼트:</label>
                  <input
                    type="number"
                    value={holePutts[index]}
                    onChange={(e) =>
                      handleHolePuttsChange(index, parseInt(e.target.value))
                    }
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-center font-bold"
                    min="0"
                    max="10"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Caddy Rating */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <User size={18} className="text-green-600" />
            캐디 평가
          </h2>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setCaddyRating(rating)}
                className={`p-2 rounded-lg transition-colors ${
                  caddyRating >= rating
                    ? 'text-yellow-400'
                    : 'text-gray-300'
                }`}
              >
                <Star
                  size={32}
                  className={caddyRating >= rating ? 'fill-current' : ''}
                />
              </button>
            ))}
            <span className="ml-2 text-gray-600">{caddyRating}/5</span>
          </div>
        </div>

        {/* Course Rating */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <MapPin size={18} className="text-green-600" />
            구장 평가
          </h2>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setCourseRating(rating)}
                className={`p-2 rounded-lg transition-colors ${
                  courseRating >= rating
                    ? 'text-yellow-400'
                    : 'text-gray-300'
                }`}
              >
                <Star
                  size={32}
                  className={courseRating >= rating ? 'fill-current' : ''}
                />
              </button>
            ))}
            <span className="ml-2 text-gray-600">{courseRating}/5</span>
          </div>
        </div>

        {/* Review Text */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200">
          <h2 className="font-bold text-gray-900 mb-3">후기 작성</h2>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="라운드 경험을 공유해주세요..."
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:border-green-600"
            rows={5}
          />
        </div>

        {/* Issue Report */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <AlertCircle size={18} className="text-yellow-600" />
            구장 이슈 등록 (컴플레인)
          </h2>
          <textarea
            value={issueText}
            onChange={(e) => setIssueText(e.target.value)}
            placeholder="구장에서 발생한 문제가 있다면 알려주세요..."
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:border-yellow-600"
            rows={4}
          />
          <p className="text-xs text-gray-500 mt-2">
            * 컴플레인은 운영팀이 확인 후 처리됩니다
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-lg hover:bg-green-700 transition-colors"
        >
          후기 저장하기
        </button>
      </form>
    </div>
  );
}
