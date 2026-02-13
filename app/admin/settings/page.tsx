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

async function countTable(supabase: ReturnType<typeof getSupabaseServiceClient>, table: string) {
  const { count, error } = await (supabase as any).from(table).select('id', { count: 'exact', head: true });
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
    counts = {
      golf_clubs: await countTable(supabase, 'golf_clubs'),
      tee_times: await countTable(supabase, 'tee_times'),
      reservations: await countTable(supabase, 'reservations'),
      users: await countTable(supabase, 'users'),
      weather_cache: await countTable(supabase, 'weather_cache'),
      external_price_targets: await countTable(supabase, 'external_price_targets'),
      external_price_snapshots: await countTable(supabase, 'external_price_snapshots'),
    };
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
        <h2 className="text-lg font-bold text-gray-900">초기 데이터</h2>
        <p className="mt-2 text-sm text-gray-600">
          골프장/티타임/날씨 데이터가 0이면 대시보드, 티타임관리, 프라이싱이 전부 “비어 보이는” 상태가 됩니다.
          개발/초기 세팅 단계에서는 샘플 데이터를 만들어서 전체 플로우를 먼저 검증하는 게 안전합니다.
        </p>

        <form action={seedCoreData} className="mt-4">
          <button
            type="submit"
            className="px-5 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50"
          >
            샘플 데이터 생성(Club 72 + 14일 티타임 + 날씨)
          </button>
          <p className="mt-2 text-xs text-gray-500">
            기본 동작: 비프로덕션 또는 `ADMIN_SEED_ENABLED=true`일 때만 실행됩니다. 슈퍼어드민만 가능.
          </p>
        </form>
      </div>
    </div>
  );
}
