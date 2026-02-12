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

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, ...rest] = arg.slice(2).split('=');
    out[key] = rest.join('=');
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const adapter = args.adapter || `${args.site}_generic`;
  const requiresFinalSelector = adapter.includes('generic');
  const required = ['site', 'course', 'url'];
  if (requiresFinalSelector) required.push('final');
  const missing = required.filter((key) => !args[key]);

  if (missing.length > 0) {
    console.error(`Missing args: ${missing.map((key) => `--${key}`).join(', ')}`);
    console.error('Example:');
    console.error(
      "npm run crawl:target:add -- --site=smartscore --course='클럽72' --url='https://example.com' --final='.final-price' --original='.origin-price' --date='.play-date' --time='.tee-time' --wait='.price-wrap'"
    );
    console.error(
      "Option: --adapter=golfpang_list --platform=WEB --config='{\"club_id\":3,\"join_type\":\"join\"}'"
    );
    process.exit(1);
  }

  let parserConfig = {};
  if (args.config) {
    try {
      parserConfig = JSON.parse(args.config);
    } catch (error) {
      console.error(`Invalid JSON for --config: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const platform = (args.platform || 'WEB').toUpperCase();
  if (!['WEB', 'APP'].includes(platform)) {
    console.error(`Invalid --platform value: ${platform}`);
    console.error('Allowed values: WEB, APP');
    process.exit(1);
  }

  const payload = {
    site_code: args.site,
    course_name: args.course,
    url: args.url,
    final_price_selector: args.final || '.final-price',
    original_price_selector: args.original || null,
    play_date_selector: args.date || null,
    tee_time_selector: args.time || null,
    wait_for_selector: args.wait || null,
    adapter_code: adapter,
    source_platform: platform,
    parser_config: parserConfig,
    active: args.active ? args.active === 'true' : true,
  };

  const { data, error } = await supabase
    .from('external_price_targets')
    .upsert(payload, { onConflict: 'site_code,url' })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to upsert target:', error.message);
    process.exit(1);
  }

  console.log('Target saved:');
  console.log(JSON.stringify(data, null, 2));
}

main().catch((error) => {
  console.error('Command failed:', error);
  process.exit(1);
});
