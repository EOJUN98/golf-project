/**
 * SDD-08: Forbidden Page
 *
 * Displayed when user tries to access admin area without permissions
 */

import Link from 'next/link';
import { Shield, Home } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <Shield className="text-red-600" size={32} />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">접근 권한 없음</h1>
        <p className="text-gray-600 mb-6">
          이 페이지에 접근할 권한이 없습니다.
          <br />
          관리자 계정으로 로그인해주세요.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Home size={18} />
            메인으로 돌아가기
          </Link>

          <Link
            href="/login"
            className="px-6 py-3 text-gray-700 hover:text-gray-900 transition-colors"
          >
            다른 계정으로 로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
