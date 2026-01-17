'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  Plus,
  Edit,
  Ban,
  CheckCircle,
  AlertCircle,
  MapPin,
  Loader2
} from 'lucide-react';
import { Database } from '@/types/database';
import {
  getAccessibleGolfClubs,
  getTeeTimes,
  createTeeTime,
  updateTeeTime,
  blockTeeTime,
  unblockTeeTime
} from './actions';

type TeeTime = Database['public']['Tables']['tee_times']['Row'];
type GolfClub = Database['public']['Tables']['golf_clubs']['Row'];

export default function AdminTeeTimesPage() {
  const [clubs, setClubs] = useState<GolfClub[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [teeTimes, setTeeTimes] = useState<TeeTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTeeTime, setEditingTeeTime] = useState<TeeTime | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    tee_off_time: '08:00',
    base_price: 100000,
    status: 'OPEN' as 'OPEN' | 'BLOCKED'
  });

  // Fetch accessible clubs on mount
  useEffect(() => {
    async function fetchClubs() {
      setLoading(true);
      const result = await getAccessibleGolfClubs();

      if (result.success && result.clubs) {
        setClubs(result.clubs);
        if (result.clubs.length > 0) {
          setSelectedClubId(result.clubs[0].id);
        }
      } else {
        alert(result.error || 'Failed to load golf clubs');
      }
      setLoading(false);
    }

    fetchClubs();
  }, []);

  // Fetch tee times when club or date changes
  useEffect(() => {
    if (selectedClubId) {
      fetchTeeTimes();
    }
  }, [selectedClubId, selectedDate]);

  const fetchTeeTimes = async () => {
    if (!selectedClubId) return;

    setFetching(true);
    const result = await getTeeTimes(selectedClubId, selectedDate);

    if (result.success && result.teeTimes) {
      setTeeTimes(result.teeTimes);
    } else {
      alert(result.error || 'Failed to load tee times');
      setTeeTimes([]);
    }
    setFetching(false);
  };

  const handleCreateTeeTime = async () => {
    if (!selectedClubId) return;

    // Combine date and time
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const teeOffISO = new Date(`${dateStr}T${formData.tee_off_time}:00`).toISOString();

    const result = await createTeeTime({
      golf_club_id: selectedClubId,
      tee_off: teeOffISO,
      base_price: formData.base_price,
      status: formData.status
    });

    if (result.success) {
      alert('티타임이 생성되었습니다.');
      setIsCreateModalOpen(false);
      resetForm();
      fetchTeeTimes();
    } else {
      alert(result.error || 'Failed to create tee time');
    }
  };

  const handleUpdateTeeTime = async () => {
    if (!editingTeeTime) return;

    const payload: any = {
      base_price: formData.base_price,
      status: formData.status
    };

    // If time changed, include tee_off
    if (formData.tee_off_time) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      payload.tee_off = new Date(`${dateStr}T${formData.tee_off_time}:00`).toISOString();
    }

    const result = await updateTeeTime(editingTeeTime.id, payload);

    if (result.success) {
      alert('티타임이 수정되었습니다.');
      setIsEditModalOpen(false);
      setEditingTeeTime(null);
      resetForm();
      fetchTeeTimes();
    } else {
      alert(result.error || 'Failed to update tee time');
    }
  };

  const handleBlockTeeTime = async (id: number) => {
    if (!confirm('이 티타임을 차단하시겠습니까?')) return;

    const result = await blockTeeTime(id);

    if (result.success) {
      alert('티타임이 차단되었습니다.');
      fetchTeeTimes();
    } else {
      alert(result.error || 'Failed to block tee time');
    }
  };

  const handleUnblockTeeTime = async (id: number) => {
    if (!confirm('이 티타임을 다시 활성화하시겠습니까?')) return;

    const result = await unblockTeeTime(id);

    if (result.success) {
      alert('티타임이 활성화되었습니다.');
      fetchTeeTimes();
    } else {
      alert(result.error || 'Failed to unblock tee time');
    }
  };

  const openEditModal = (teeTime: TeeTime) => {
    setEditingTeeTime(teeTime);
    const time = new Date(teeTime.tee_off);
    setFormData({
      tee_off_time: format(time, 'HH:mm'),
      base_price: teeTime.base_price,
      status: teeTime.status as 'OPEN' | 'BLOCKED'
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      tee_off_time: '08:00',
      base_price: 100000,
      status: 'OPEN'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            <CheckCircle size={16} />
            OPEN
          </span>
        );
      case 'BOOKED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-medium">
            <Clock size={16} />
            BOOKED
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-400 text-white rounded-full text-sm font-medium">
            <Ban size={16} />
            BLOCKED
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-green-600" size={48} />
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertCircle className="text-red-500 mb-4" size={64} />
        <h2 className="text-2xl font-bold text-gray-900">접근 권한이 없습니다</h2>
        <p className="text-gray-600 mt-2">관리 가능한 골프장이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">티타임 관리</h1>
          <p className="text-gray-600 mt-1">골프장별 티타임 생성 및 관리</p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          disabled={!selectedClubId}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <Plus size={20} />
          티타임 추가
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Golf Club Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline mr-1" size={16} />
              골프장 선택
            </label>
            <select
              value={selectedClubId || ''}
              onChange={(e) => setSelectedClubId(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {clubs.map(club => (
                <option key={club.id} value={club.id}>
                  {club.name} - {club.location_name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline mr-1" size={16} />
              날짜 선택
            </label>
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Tee Times Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        {fetching ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-green-600" size={32} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-green-50 border-b border-green-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-green-900 uppercase tracking-wider">
                    티오프 시간
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-green-900 uppercase tracking-wider">
                    기본 가격
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-green-900 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-green-900 uppercase tracking-wider">
                    예약자
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-green-900 uppercase tracking-wider">
                    수정 시간
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-green-900 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {teeTimes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      선택한 날짜에 티타임이 없습니다.
                    </td>
                  </tr>
                ) : (
                  teeTimes.map(teeTime => {
                    const isBooked = teeTime.status === 'BOOKED';
                    const isBlocked = teeTime.status === 'BLOCKED';

                    return (
                      <tr key={teeTime.id} className="hover:bg-gray-50 transition-colors">
                        {/* Tee Off Time */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Clock size={18} className="text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {format(new Date(teeTime.tee_off), 'HH:mm')}
                            </span>
                          </div>
                        </td>

                        {/* Base Price */}
                        <td className="px-6 py-4">
                          <span className="text-gray-900 font-semibold">
                            {teeTime.base_price.toLocaleString()}원
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          {getStatusBadge(teeTime.status)}
                        </td>

                        {/* Reserved By */}
                        <td className="px-6 py-4">
                          {teeTime.reserved_by ? (
                            <span className="text-sm text-gray-700">
                              {teeTime.reserved_by.substring(0, 8)}...
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>

                        {/* Updated At */}
                        <td className="px-6 py-4">
                          {teeTime.updated_at ? (
                            <span className="text-sm text-gray-600">
                              {format(new Date(teeTime.updated_at), 'MM/dd HH:mm')}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {/* Edit Button */}
                            <button
                              onClick={() => openEditModal(teeTime)}
                              disabled={isBooked}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="수정"
                            >
                              <Edit size={18} />
                            </button>

                            {/* Block/Unblock Button */}
                            {isBlocked ? (
                              <button
                                onClick={() => handleUnblockTeeTime(teeTime.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="활성화"
                              >
                                <CheckCircle size={18} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBlockTeeTime(teeTime.id)}
                                disabled={isBooked}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="차단"
                              >
                                <Ban size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">티타임 생성</h2>

            <div className="space-y-4">
              {/* Time Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  티오프 시간
                </label>
                <input
                  type="time"
                  value={formData.tee_off_time}
                  onChange={(e) => setFormData({ ...formData, tee_off_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Price Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  기본 가격 (원)
                </label>
                <input
                  type="number"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  step={1000}
                  min={0}
                />
              </div>

              {/* Status Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  초기 상태
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'OPEN' | 'BLOCKED' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="BLOCKED">BLOCKED</option>
                </select>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={handleCreateTeeTime}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingTeeTime && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">티타임 수정</h2>

            <div className="space-y-4">
              {/* Time Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  티오프 시간
                </label>
                <input
                  type="time"
                  value={formData.tee_off_time}
                  onChange={(e) => setFormData({ ...formData, tee_off_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Price Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  기본 가격 (원)
                </label>
                <input
                  type="number"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  step={1000}
                  min={0}
                />
              </div>

              {/* Status Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상태
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'OPEN' | 'BLOCKED' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="BLOCKED">BLOCKED</option>
                </select>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingTeeTime(null);
                  resetForm();
                }}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={handleUpdateTeeTime}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                수정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
