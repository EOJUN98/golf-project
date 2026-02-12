#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const crawlerRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(crawlerRoot, '..');

dotenv.config({ path: path.join(crawlerRoot, '.env.local') });
dotenv.config({ path: path.join(projectRoot, '.env.local') });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  const missing = [];
  if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const DEFAULT_TARGETS = [
  {
    site_code: 'teeupnjoy',
    course_name: '*',
    url: 'https://www.teeupnjoy.com/hp/join/reslist.do',
    adapter_code: 'teeupnjoy_api',
    source_platform: 'WEB',
    parser_config: {
      join_type: 'join',
      // TODO: Replace with actual registered-club mapping IDs.
      club_ids: [3],
    },
  },
  {
    site_code: 'golfrock',
    course_name: '*',
    url: 'https://m.golfrock.co.kr/join_new_sub.asp',
    adapter_code: 'golfrock_list',
    source_platform: 'WEB',
    parser_config: {},
  },
  {
    site_code: 'golfpang',
    course_name: '*',
    url: 'https://www.golfpang.com/web/round/join_list.do',
    adapter_code: 'golfpang_list',
    source_platform: 'WEB',
    parser_config: {},
  },
  {
    site_code: 'golfmon',
    course_name: '*',
    url: 'app://golfmon',
    adapter_code: 'golfmon_app',
    source_platform: 'APP',
    parser_config: {
      note: 'App channel - requires authenticated API/device integration',
    },
  },
  {
    site_code: 'smartscore',
    course_name: '*',
    url: 'app://smartscore',
    adapter_code: 'smartscore_app',
    source_platform: 'APP',
    parser_config: {
      note: 'App channel - requires authenticated API/device integration',
    },
  },
];

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const target of DEFAULT_TARGETS) {
    const payload = {
      ...target,
      final_price_selector: '.final-price',
      original_price_selector: null,
      play_date_selector: null,
      tee_time_selector: null,
      wait_for_selector: null,
      active: true,
    };

    const { data, error } = await supabase
      .from('external_price_targets')
      .upsert(payload, { onConflict: 'site_code,url' })
      .select('id, site_code, course_name, adapter_code, source_platform, active')
      .single();

    if (error) {
      console.error(`[${target.site_code}] Failed: ${error.message}`);
      continue;
    }

    console.log(`[${target.site_code}] Upserted target id=${data.id}`);
  }

  console.log('Default target seeding finished.');
}

main().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
