/**
 * SDD-06: Admin Suspended Users List Component
 *
 * Client component for displaying and managing suspended users
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminUserRow } from '@/types/adminManagement';
import { unsuspendUser } from '@/app/admin/actions';
import { Loader2, UserX, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  suspendedUsers: AdminUserRow[];
  includeExpired: boolean;
}

export default function AdminSuspendedUsersList({
  suspendedUsers,
  includeExpired
}: Props) {
  const router = useRouter();
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUnsuspend = async (userId: string, userEmail: string) => {
    if (!confirm(`${userEmail} 사용자의 정지를 해제하시겠습니까?`)) {
      return;
    }

    setProcessing(userId);
    setError(null);

    try {
      // SDD-08: No adminUserId needed - uses session
      const result = await unsuspendUser({
        userId,
        reason: 'Admin manual unsuspend'
      });

      if (result.success) {
        alert(result.message);
        router.refresh();
      } else {
        setError(result.error || 'Failed to unsuspend user');
        alert(`정지 해제 실패: ${result.message}`);
      }
    } catch (err: any) {
      setError(err.message);
      alert(`오류 발생: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const toggleIncludeExpired = () => {
    router.push(`/admin/users/suspended?includeExpired=${!includeExpired}`);
  };

  const getSuspensionBadge = (user: AdminUserRow) => {
    const now = new Date();
    const expiresAt = user.suspension_expires_at ? new Date(user.suspension_expires_at) : null;

    if (!expiresAt) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          영구 정지
        </span>
      );
    }

    if (expiresAt < now) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          만료됨
        </span>
      );
    }

    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
        임시 정지
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Controls */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeExpired}
                onChange={toggleIncludeExpired}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">만료된 정지 포함</span>
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용자</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">정지 사유</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">정지 일시</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">만료 일시</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">노쇼 횟수</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">예약 가능</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {suspendedUsers.map(user => {
              const suspendedAt = user.suspended_at
                ? new Date(user.suspended_at).toLocaleString('ko-KR')
                : '-';
              const expiresAt = user.suspension_expires_at
                ? new Date(user.suspension_expires_at).toLocaleString('ko-KR')
                : '영구';

              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">{user.name || user.email}</p>
                      <p className="text-gray-500">{user.email}</p>
                      <p className="text-gray-400 text-xs mt-1">ID: {user.id.slice(0, 8)}...</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {getSuspensionBadge(user)}
                      {user.suspended_reason && (
                        <span className="text-xs text-gray-600">{user.suspended_reason}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {suspendedAt}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {expiresAt}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className={`font-bold ${user.no_show_count > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {user.no_show_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.canBook ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        가능
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                        <UserX className="w-4 h-4" />
                        불가
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUnsuspend(user.id, user.email)}
                        disabled={processing === user.id}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {processing === user.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            처리 중
                          </>
                        ) : (
                          '정지 해제'
                        )}
                      </button>

                      <span className="text-gray-300">|</span>

                      <button
                        onClick={() => router.push(`/admin/reservations?userId=${user.id}`)}
                        className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                      >
                        예약 보기
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {suspendedUsers.length === 0 && (
          <div className="text-center py-12">
            <UserX className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">정지된 사용자가 없습니다</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t bg-gray-50">
        <p className="text-sm text-gray-600">
          총 {suspendedUsers.length}명의 정지된 사용자
        </p>
      </div>
    </div>
  );
}
