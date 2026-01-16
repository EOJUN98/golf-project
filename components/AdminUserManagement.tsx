"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import {
  User,
  Ban,
  CheckCircle,
  AlertTriangle,
  Crown,
  Trophy,
  DollarSign,
  Calendar,
  MapPin,
  TrendingUp,
  Search,
  Filter
} from 'lucide-react';

type UserRow = Database['public']['Tables']['users']['Row'];

interface AdminUserManagementProps {
  initialUsers: UserRow[];
}

type SegmentType = Database['public']['Tables']['users']['Row']['segment'];

const SEGMENT_CONFIG: Record<SegmentType, { label: string; color: string; icon: React.ReactNode }> = {
  PRESTIGE: { label: 'PRESTIGE', color: 'text-purple-400 bg-purple-900/30 border-purple-500', icon: <Crown size={14} /> },
  CHERRY: { label: 'CHERRY', color: 'text-pink-400 bg-pink-900/30 border-pink-500', icon: <Trophy size={14} /> },
  SMART: { label: 'SMART', color: 'text-blue-400 bg-blue-900/30 border-blue-500', icon: <TrendingUp size={14} /> },
  FUTURE: { label: 'FUTURE', color: 'text-green-400 bg-green-900/30 border-green-500', icon: <User size={14} /> },
};

export default function AdminUserManagement({ initialUsers }: AdminUserManagementProps) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSegment, setFilterSegment] = useState<SegmentType | 'ALL'>('ALL');
  const [filterBlacklist, setFilterBlacklist] = useState<'ALL' | 'BLACKLISTED' | 'ACTIVE'>('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesSegment = filterSegment === 'ALL' || user.segment === filterSegment;
    const matchesBlacklist = filterBlacklist === 'ALL' ||
                             (filterBlacklist === 'BLACKLISTED' && user.blacklisted) ||
                             (filterBlacklist === 'ACTIVE' && !user.blacklisted);
    return matchesSearch && matchesSegment && matchesBlacklist;
  });

  const toggleBlacklist = async (userId: string, currentBlacklisted: boolean) => {
    const reason = currentBlacklisted
      ? null
      : window.prompt('차단 사유를 입력하세요:');

    if (!currentBlacklisted && !reason) return;

    setProcessingId(userId);
    try {
      const { error } = await (supabase as any)
        .from('users')
        .update({
          blacklisted: !currentBlacklisted,
          blacklist_reason: currentBlacklisted ? null : reason,
          blacklisted_at: currentBlacklisted ? null : new Date().toISOString(),
          blacklisted_by: currentBlacklisted ? null : 'ADMIN' // Replace with actual admin ID
        })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u =>
        u.id === userId
          ? {
              ...u,
              blacklisted: !currentBlacklisted,
              blacklist_reason: currentBlacklisted ? null : reason,
              blacklisted_at: currentBlacklisted ? null : new Date().toISOString(),
            }
          : u
      ));

      alert(currentBlacklisted ? '차단 해제되었습니다.' : '차단되었습니다.');
    } catch (err) {
      console.error(err);
      alert('처리 실패');
    } finally {
      setProcessingId(null);
    }
  };

  const overrideSegment = async (userId: string, currentSegment: SegmentType) => {
    const newSegmentStr = window.prompt(
      `새로운 세그먼트를 입력하세요 (현재: ${currentSegment}):\nFUTURE / PRESTIGE / SMART / CHERRY`,
      currentSegment
    );
    if (!newSegmentStr) return;

    const newSegment = newSegmentStr.toUpperCase() as SegmentType;
    if (!['FUTURE', 'PRESTIGE', 'SMART', 'CHERRY'].includes(newSegment)) {
      return alert('유효한 세그먼트가 아닙니다.');
    }

    setProcessingId(userId);
    try {
      const { error } = await (supabase as any)
        .from('users')
        .update({
          segment: newSegment,
          segment_override_by: 'ADMIN', // Replace with actual admin ID
          segment_override_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, segment: newSegment } : u
      ));

      alert('세그먼트가 변경되었습니다.');
    } catch (err) {
      console.error(err);
      alert('처리 실패');
    } finally {
      setProcessingId(null);
    }
  };

  const adjustCherryScore = async (userId: string, currentScore: number) => {
    const newScoreStr = window.prompt(
      `체리 점수를 입력하세요 (현재: ${currentScore}, 범위: 0-100):`,
      currentScore.toString()
    );
    if (!newScoreStr) return;

    const newScore = parseInt(newScoreStr, 10);
    if (isNaN(newScore) || newScore < 0 || newScore > 100) {
      return alert('0-100 사이의 숫자를 입력하세요.');
    }

    setProcessingId(userId);
    try {
      const { error } = await (supabase as any)
        .from('users')
        .update({ cherry_score: newScore })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, cherry_score: newScore } : u
      ));

      alert('체리 점수가 변경되었습니다.');
    } catch (err) {
      console.error(err);
      alert('처리 실패');
    } finally {
      setProcessingId(null);
    }
  };

  // Statistics
  const stats = {
    total: users.length,
    blacklisted: users.filter(u => u.blacklisted).length,
    prestige: users.filter(u => u.segment === 'PRESTIGE').length,
    totalRevenue: users.reduce((sum, u) => sum + u.total_spent, 0),
  };

  return (
    <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
      {/* Header & Stats */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
            <User className="text-blue-400" />
            사용자 관리
          </h2>
          <div className="flex gap-4 text-sm">
            <span className="text-gray-400">전체: <span className="text-white font-bold">{stats.total}</span></span>
            <span className="text-gray-400">차단: <span className="text-red-400 font-bold">{stats.blacklisted}</span></span>
            <span className="text-gray-400">PRESTIGE: <span className="text-purple-400 font-bold">{stats.prestige}</span></span>
            <span className="text-gray-400">총 매출: <span className="text-green-400 font-bold">{stats.totalRevenue.toLocaleString()}원</span></span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2 bg-gray-700 px-4 py-2 rounded-lg flex-1 min-w-[250px]">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="이메일 또는 이름 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-white w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={filterSegment}
            onChange={(e) => setFilterSegment(e.target.value as any)}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 outline-none"
          >
            <option value="ALL">모든 세그먼트</option>
            <option value="PRESTIGE">PRESTIGE</option>
            <option value="CHERRY">CHERRY</option>
            <option value="SMART">SMART</option>
            <option value="FUTURE">FUTURE</option>
          </select>

          <select
            value={filterBlacklist}
            onChange={(e) => setFilterBlacklist(e.target.value as any)}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 outline-none"
          >
            <option value="ALL">전체 상태</option>
            <option value="ACTIVE">활성</option>
            <option value="BLACKLISTED">차단됨</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700 text-sm">
              <th className="p-3">사용자</th>
              <th className="p-3">세그먼트</th>
              <th className="p-3">체리 점수</th>
              <th className="p-3">예약 내역</th>
              <th className="p-3">노쇼</th>
              <th className="p-3">상태</th>
              <th className="p-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const segmentConfig = SEGMENT_CONFIG[user.segment];
              const isProcessing = processingId === user.id;

              return (
                <tr
                  key={user.id}
                  className={`border-b border-gray-700/50 hover:bg-gray-700/30 ${user.blacklisted ? 'opacity-60' : ''}`}
                >
                  {/* User Info */}
                  <td className="p-4">
                    <div>
                      <div className="font-bold text-white">{user.name || '이름 없음'}</div>
                      <div className="text-sm text-gray-400">{user.email}</div>
                      {user.phone && <div className="text-xs text-gray-500">{user.phone}</div>}
                    </div>
                  </td>

                  {/* Segment */}
                  <td className="p-4">
                    <button
                      onClick={() => overrideSegment(user.id, user.segment)}
                      disabled={isProcessing}
                      className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-bold ${segmentConfig.color} hover:opacity-80 transition-opacity`}
                    >
                      {segmentConfig.icon}
                      {segmentConfig.label}
                    </button>
                    {user.segment_override_by && (
                      <div className="text-xs text-yellow-400 mt-1">✏️ 수동 설정</div>
                    )}
                  </td>

                  {/* Cherry Score */}
                  <td className="p-4">
                    <button
                      onClick={() => adjustCherryScore(user.id, user.cherry_score)}
                      disabled={isProcessing}
                      className="flex items-center gap-1 hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                    >
                      <Trophy size={14} className="text-yellow-400" />
                      <span className="font-mono text-yellow-400">{user.cherry_score}</span>
                    </button>
                  </td>

                  {/* Booking Stats */}
                  <td className="p-4 text-sm">
                    <div className="flex items-center gap-1 text-blue-400">
                      <Calendar size={14} />
                      <span>{user.total_bookings}회</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-400 text-xs">
                      <DollarSign size={12} />
                      <span>{user.total_spent.toLocaleString()}원</span>
                    </div>
                  </td>

                  {/* No-Show Count */}
                  <td className="p-4">
                    {user.no_show_count > 0 ? (
                      <div className="flex items-center gap-1 text-red-400 font-bold">
                        <AlertTriangle size={14} />
                        {user.no_show_count}회
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-gray-500 text-sm">
                        <CheckCircle size={14} />
                        없음
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    {user.blacklisted ? (
                      <div>
                        <div className="flex items-center gap-1 text-red-400 font-bold text-sm">
                          <Ban size={14} />
                          차단됨
                        </div>
                        {user.blacklist_reason && (
                          <div className="text-xs text-gray-400 mt-1">{user.blacklist_reason}</div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-green-400 text-sm">
                        <CheckCircle size={14} />
                        정상
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-4">
                    <button
                      onClick={() => toggleBlacklist(user.id, user.blacklisted)}
                      disabled={isProcessing}
                      className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${
                        user.blacklisted
                          ? 'bg-green-900/30 text-green-400 border-green-600 hover:bg-green-900/50'
                          : 'bg-red-900/30 text-red-400 border-red-500 hover:bg-red-900/50'
                      }`}
                    >
                      {isProcessing ? '처리중...' : user.blacklisted ? '차단 해제' : '차단'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-gray-500">검색 결과가 없습니다.</div>
        )}
      </div>
    </div>
  );
}
