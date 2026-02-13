'use client';

import { useEffect, useState } from 'react';
import { Database } from '@/types/database';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Trophy,
  AlertCircle,
  CheckCircle,
  Crown,
  Star,
  TrendingUp,
  Search,
  Filter
} from 'lucide-react';

type UserRow = Database['public']['Tables']['users']['Row'];
type SegmentType = Database['public']['Tables']['users']['Row']['segment'];

const SEGMENT_OPTIONS: { value: SegmentType; label: string; color: string; icon: React.ReactNode }[] = [
  {
    value: 'FUTURE',
    label: '퓨처 (신규)',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: <User size={16} />
  },
  {
    value: 'SMART',
    label: '스마트 (일반)',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: <TrendingUp size={16} />
  },
  {
    value: 'CHERRY',
    label: '체리 (우수)',
    color: 'bg-pink-100 text-pink-700 border-pink-300',
    icon: <Star size={16} />
  },
  {
    value: 'PRESTIGE',
    label: '프레스티지 (VIP)',
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    icon: <Crown size={16} />
  },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSegment, setFilterSegment] = useState<SegmentType | 'ALL'>('ALL');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    void fetchUsers();
  }, [filterSegment]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('q', searchTerm.trim());
      if (filterSegment !== 'ALL') params.set('segment', filterSegment);
      params.set('limit', '500');
      params.set('offset', '0');

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || '회원 목록을 불러오는데 실패했습니다.');
      }

      setUsers((json.users || []) as UserRow[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert(error instanceof Error ? error.message : '회원 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const updateUserSegment = async (userId: string, newSegment: SegmentType) => {
    setUpdatingUserId(userId);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ action: 'set-segment', userId, segment: newSegment }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || '등급 업데이트에 실패했습니다.');

      await fetchUsers();
    } catch (error) {
      console.error('Error updating segment:', error);
      alert(error instanceof Error ? error.message : '등급 업데이트에 실패했습니다.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    const confirmMessage = currentStatus
      ? '관리자 권한을 제거하시겠습니까?'
      : '관리자 권한을 부여하시겠습니까?';

    if (!confirm(confirmMessage)) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ action: 'toggle-admin', userId, isAdmin: !currentStatus }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || '권한 변경에 실패했습니다.');

      await fetchUsers();
    } catch (error) {
      console.error('Error toggling admin:', error);
      alert(error instanceof Error ? error.message : '권한 변경에 실패했습니다.');
    }
  };

  const toggleBlacklistStatus = async (userId: string, currentStatus: boolean) => {
    const reason = currentStatus
      ? null
      : prompt('차단 사유를 입력하세요:');

    if (!currentStatus && !reason) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          action: 'set-blacklisted',
          userId,
          blacklisted: !currentStatus,
          reason,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || '차단 처리에 실패했습니다.');

      await fetchUsers();
    } catch (error) {
      console.error('Error toggling blacklist:', error);
      alert(error instanceof Error ? error.message : '차단 처리에 실패했습니다.');
    }
  };

  // Filter users based on search and segment
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm);

    const matchesSegment = filterSegment === 'ALL' || user.segment === filterSegment;

    return matchesSearch && matchesSegment;
  });

  const getSegmentConfig = (segment: SegmentType) => {
    return SEGMENT_OPTIONS.find(opt => opt.value === segment) || SEGMENT_OPTIONS[0];
  };

  const handleSearch = async () => {
    await fetchUsers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">회원 관리</h1>
          <p className="text-gray-600 mt-1">
            총 {users.length}명 | 필터링됨: {filteredUsers.length}명
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          새로고침
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="이메일, 이름, 전화번호로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSearch();
                }
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Segment Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={filterSegment}
              onChange={(e) => setFilterSegment(e.target.value as SegmentType | 'ALL')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="ALL">모든 등급</option>
              {SEGMENT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            검색 적용
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  회원 정보
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  현재 등급
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  등급 변경
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Cherry Score
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  통계
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map(user => {
                const segmentConfig = getSegmentConfig(user.segment);
                const isUpdating = updatingUserId === user.id;

                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    {/* User Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.name || '이름 없음'}
                            {user.is_admin && (
                              <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                                관리자
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                            <Mail size={14} />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Phone size={14} />
                              {user.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                            <Calendar size={12} />
                            가입: {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Current Segment */}
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${segmentConfig.color}`}>
                        {segmentConfig.icon}
                        <span className="font-medium">{segmentConfig.label}</span>
                      </div>
                      {user.segment_override_by && (
                        <div className="text-xs text-gray-500 mt-1">
                          (수동 설정됨)
                        </div>
                      )}
                    </td>

                    {/* Segment Selector */}
                    <td className="px-6 py-4">
                      <select
                        value={user.segment}
                        onChange={(e) => updateUserSegment(user.id, e.target.value as SegmentType)}
                        disabled={isUpdating}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                      >
                        {SEGMENT_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Cherry Score */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Trophy size={16} className="text-yellow-500" />
                        <span className="font-semibold text-lg">{user.cherry_score}</span>
                        <span className="text-gray-400 text-sm">/ 100</span>
                      </div>
                    </td>

                    {/* Statistics */}
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        <div className="text-gray-700">
                          예약: <span className="font-medium">{user.total_bookings || 0}회</span>
                        </div>
                        <div className="text-gray-700">
                          지출: <span className="font-medium">{(user.total_spent || 0).toLocaleString()}원</span>
                        </div>
                        <div className="text-gray-700">
                          노쇼: <span className={`font-medium ${user.no_show_count > 0 ? 'text-red-600' : ''}`}>
                            {user.no_show_count || 0}회
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {user.blacklisted ? (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle size={20} />
                          <div>
                            <div className="font-medium">차단됨</div>
                            {user.blacklist_reason && (
                              <div className="text-xs text-gray-500">{user.blacklist_reason}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle size={20} />
                          <span className="font-medium">정상</span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleBlacklistStatus(user.id, user.blacklisted)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            user.blacklisted
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {user.blacklisted ? '차단 해제' : '차단'}
                        </button>

                        <button
                          onClick={() => toggleAdminStatus(user.id, user.is_admin || false)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            user.is_admin
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          }`}
                        >
                          {user.is_admin ? '관리자 해제' : '관리자 설정'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              검색 결과가 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {SEGMENT_OPTIONS.map(segment => {
          const count = users.filter(u => u.segment === segment.value).length;
          return (
            <div key={segment.value} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">{segment.label}</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{count}명</div>
                </div>
                <div className={`p-3 rounded-lg ${segment.color}`}>
                  {segment.icon}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
