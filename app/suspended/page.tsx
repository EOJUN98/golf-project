/**
 * SDD-08: Suspended Account Page
 *
 * Displayed when suspended user tries to access the system
 */

import Link from 'next/link';
import { UserX, Home, Mail } from 'lucide-react';
import { getCurrentUserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function SuspendedPage() {
  const user = await getCurrentUserWithRoles();

  // Get suspension details if user is logged in
  let suspensionDetails: {
    suspended_reason: string | null;
    suspended_at: string | null;
    suspension_expires_at: string | null;
  } | null = null;

  if (user) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('users')
      .select('suspended_reason, suspended_at, suspension_expires_at')
      .eq('id', user.id)
      .single();

    if (data) {
      suspensionDetails = data as {
        suspended_reason: string | null;
        suspended_at: string | null;
        suspension_expires_at: string | null;
      };
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
          <UserX className="text-orange-600" size={32} />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">계정이 정지되었습니다</h1>

        {suspensionDetails ? (
          <div className="mb-6 space-y-3">
            {suspensionDetails.suspended_reason && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm font-medium text-orange-900 mb-1">정지 사유:</p>
                <p className="text-sm text-orange-700">{suspensionDetails.suspended_reason}</p>
              </div>
            )}

            {suspensionDetails.suspended_at && (
              <p className="text-sm text-gray-600">
                정지 일시: {new Date(suspensionDetails.suspended_at).toLocaleString('ko-KR')}
              </p>
            )}

            {suspensionDetails.suspension_expires_at && (
              <p className="text-sm text-gray-600">
                해제 예정: {new Date(suspensionDetails.suspension_expires_at).toLocaleString('ko-KR')}
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-600 mb-6">
            귀하의 계정은 현재 이용이 정지된 상태입니다.
          </p>
        )}

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Mail className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-left">
              <p className="text-sm font-medium text-blue-900 mb-1">문의하기</p>
              <p className="text-sm text-blue-700">
                정지 사유에 이의가 있거나 문의사항이 있으신 경우
                <br />
                고객센터로 문의해주세요.
              </p>
              <p className="text-sm font-medium text-blue-900 mt-2">
                support@tugol.com
              </p>
            </div>
          </div>
        </div>

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
