import { requireAdminAccess } from '@/lib/auth/getCurrentUserWithRoles';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { seedCoreData } from './actions';

export const dynamic = 'force-dynamic';

function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('ADMIN_SETTINGS_CONFIG_MISSING:NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceRoleKey) throw new Error('ADMIN_SETTINGS_CONFIG_MISSING:SUPABASE_SERVICE_ROLE_KEY');

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// 테이블 이름을 Database 타입의 키로 제한하여 타입 안전성 확보
async function countTable(supabase: ReturnType<typeof getSupabaseServiceClient>, table: keyof Database['public']['Tables']) {
  // (supabase as any) 제거 및 정적 타이핑 적용
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const currentUser = await requireAdminAccess();
  const resolvedSearchParams = await searchParams;
  const messageRaw = resolvedSearchParams?.message;
  const message = messageRaw ? decodeURIComponent(messageRaw) : null;

  let counts: Record<string, number> | null = null;
  let configError: string | null = null;

  try {
    const supabase = getSupabaseServiceClient();
    
    // [Performance] 직렬 await 대신 Promise.all로 병렬 처리하여 응답 속도 개선
    const [golf_clubs, tee_times, reservations, users, weather_cache, external_price_targets, external_price_snapshots] = await Promise.all([
      countTable(supabase, 'golf_clubs'),
      countTable(supabase, 'tee_times'),
      countTable(supabase, 'reservations'),
      countTable(supabase, 'users'),
      countTable(supabase, 'weather_cache'),
      countTable(supabase, 'external_price_targets'),
      countTable(supabase, 'external_price_snapshots'),
    ]);

    counts = { golf_clubs, tee_times, reservations, users, weather_cache, external_price_targets, external_price_snapshots };

  } catch (e) {
    configError = e instanceof Error ? e.message : 'Unknown error';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">설정</h1>
        <p className="text-gray-600 mt-1">DB 연결/데이터 상태 점검 및 초기 데이터 생성</p>
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm">
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900">현재 로그인</h2>
        <div className="mt-2 text-sm text-gray-700">
          <div>권한: {(currentUser.isSuperAdmin || currentUser.isAdmin) ? 'ADMIN' : 'CLUB ADMIN'}</div>
          <div>사용자: {currentUser.email}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900">DB 상태</h2>

        {configError ? (
          <div className="mt-3 text-sm text-red-700">
            DB 조회 실패: {configError}
            <div className="mt-2 text-gray-600">
              Vercel 환경변수에 `SUPABASE_SERVICE_ROLE_KEY`가 설정되어 있어야 관리자 페이지에서 전체 데이터/집계가 안정적으로 동작합니다.
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(counts || {}).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-gray-200 p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase">{key}</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900">데이터 보정</h2>
        <p className="mt-2 text-sm text-gray-600">
          미래 티타임/날씨가 비어 있으면 대시보드와 프라이싱이 “작동안하는 것처럼” 보일 수 있습니다.
          이 작업은 Club 72를 보장하고, 미래 14일 기준 누락된 티타임/날씨만 안전하게 보충합니다.
        </p>

        <form action={seedCoreData} className="mt-4">
          <button
            type="submit"
            className="px-5 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50"
          >
            미래 14일 데이터 보정 실행
          </button>
          <p className="mt-2 text-xs text-gray-500">
            기본 동작: 비프로덕션 또는 `ADMIN_SEED_ENABLED=true`일 때만 실행됩니다. 슈퍼어드민만 가능.
          </p>
        </form>
      </div>
    </div>
  );
}
