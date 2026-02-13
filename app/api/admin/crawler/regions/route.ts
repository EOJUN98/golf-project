import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminAccess } from '@/lib/auth/getCurrentUserWithRoles';

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('CRAWLER_CONFIG_MISSING:NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!serviceRoleKey) {
    throw new Error('CRAWLER_CONFIG_MISSING:SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceRoleKey);
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdminAccess();
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
    if (error instanceof Error && error.message.startsWith('CRAWLER_CONFIG_MISSING:')) {
      const missingKey = error.message.split(':')[1] || '환경변수';
      return NextResponse.json(
        { error: `Crawler config missing: ${missingKey}` },
        { status: 500 }
      );
    }
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdminAccess();
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
    if (error instanceof Error && error.message.startsWith('CRAWLER_CONFIG_MISSING:')) {
      const missingKey = error.message.split(':')[1] || '환경변수';
      return NextResponse.json(
        { error: `Crawler config missing: ${missingKey}` },
        { status: 500 }
      );
    }
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
