import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSuperAdminAccess } from '@/lib/auth/getCurrentUserWithRoles';

type RegionKey = '충청' | '수도권' | '강원' | '경상' | '전라' | '제주';

const ALLOWED_REGIONS: RegionKey[] = ['충청', '수도권', '강원', '경상', '전라', '제주'];

function normalizeCourseName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()_\-]/g, '');
}

function isValidRegion(value: string): value is RegionKey {
  return ALLOWED_REGIONS.includes(value as RegionKey);
}

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSuperAdminAccess();
    const body = await request.json();
    const courseNameRaw = String(body?.courseName || '').trim();
    const regionRaw = String(body?.region || '').trim();
    const noteRaw = String(body?.note || '').trim();

    if (!courseNameRaw) {
      return NextResponse.json({ error: 'courseName is required' }, { status: 400 });
    }
    if (!isValidRegion(regionRaw)) {
      return NextResponse.json({ error: 'Invalid region' }, { status: 400 });
    }

    const normalized = normalizeCourseName(courseNameRaw);
    const supabase = getAdminSupabase();

    const payload = {
      course_name: courseNameRaw,
      course_name_normalized: normalized,
      region: regionRaw,
      note: noteRaw || null,
      active: true,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('external_course_regions')
      .upsert(payload, { onConflict: 'course_name_normalized' })
      .select('id, course_name, course_name_normalized, region, active, updated_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, mapping: data });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Unauthorized: Super admin access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireSuperAdminAccess();
    const body = await request.json();
    const courseNameRaw = String(body?.courseName || '').trim();

    if (!courseNameRaw) {
      return NextResponse.json({ error: 'courseName is required' }, { status: 400 });
    }

    const normalized = normalizeCourseName(courseNameRaw);
    const supabase = getAdminSupabase();

    const { error } = await supabase
      .from('external_course_regions')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('course_name_normalized', normalized);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Unauthorized: Super admin access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
