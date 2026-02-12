#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const crawlerRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(crawlerRoot, '..');

dotenv.config({ path: path.join(crawlerRoot, '.env.local') });
dotenv.config({ path: path.join(projectRoot, '.env.local') });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function parseArgs(argv) {
  const args = {
    date: null,
    from: 1,
    to: 500,
    concurrency: 8,
    joinType: 'join',
    minCount: 1,
    headful: false,
    writeTargetId: null,
    writeSite: null,
  };

  for (const arg of argv) {
    if (arg === '--headful') args.headful = true;
    if (arg.startsWith('--date=')) args.date = arg.split('=')[1];
    if (arg.startsWith('--from=')) args.from = Number(arg.split('=')[1]);
    if (arg.startsWith('--to=')) args.to = Number(arg.split('=')[1]);
    if (arg.startsWith('--concurrency=')) args.concurrency = Number(arg.split('=')[1]);
    if (arg.startsWith('--join-type=')) args.joinType = arg.split('=')[1];
    if (arg.startsWith('--min-count=')) args.minCount = Number(arg.split('=')[1]);
    if (arg.startsWith('--write-target-id=')) args.writeTargetId = Number(arg.split('=')[1]);
    if (arg.startsWith('--write-site=')) args.writeSite = arg.split('=')[1];
  }

  if (!Number.isFinite(args.from) || !Number.isFinite(args.to) || args.from < 1 || args.to < args.from) {
    throw new Error('Invalid range. Use --from=<number> --to=<number>');
  }
  if (!Number.isFinite(args.concurrency) || args.concurrency < 1 || args.concurrency > 50) {
    throw new Error('Invalid --concurrency. Allowed: 1..50');
  }
  if (!Number.isFinite(args.minCount) || args.minCount < 0) {
    throw new Error('Invalid --min-count. Must be >= 0');
  }

  return args;
}

function kstDatePlus(days) {
  const now = new Date();
  const kstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  kstNow.setDate(kstNow.getDate() + days);
  const y = kstNow.getFullYear();
  const m = String(kstNow.getMonth() + 1).padStart(2, '0');
  const d = String(kstNow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toYyyymmdd(dateText) {
  const clean = String(dateText || '').replace(/[^0-9]/g, '');
  if (clean.length !== 8) throw new Error(`Invalid date: ${dateText}. Expected YYYY-MM-DD`);
  return clean;
}

async function discoverClubIds(args) {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    throw new Error('Missing dependency: playwright. Run: npm --prefix crawler install');
  }

  const bookingDay = toYyyymmdd(args.date || kstDatePlus(7));
  const scanIds = Array.from({ length: args.to - args.from + 1 }, (_, idx) => args.from + idx);
  const browser = await playwright.chromium.launch({ headless: !args.headful });
  const context = await browser.newContext();
  const landingUrl = `https://www.teeupnjoy.com/hp/join/reslist.do?bookingDay=${bookingDay}`;

  try {
    const workers = Array.from({ length: args.concurrency }, async (_, workerIdx) => {
      const page = await context.newPage();
      await page.goto(landingUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      const hits = [];
      for (let i = workerIdx; i < scanIds.length; i += args.concurrency) {
        const clubId = scanIds[i];
        let result = null;
        let attempts = 0;

        while (attempts < 3) {
          attempts += 1;
          try {
            result = await page.evaluate(
              async ({ bookingDayValue, clubIdValue, joinTypeValue }) => {
                const params = new URLSearchParams();
                params.set('trgetTcYn', 'Y');
                params.set('bookingDay', bookingDayValue);
                params.set('bookingEndDay', bookingDayValue);
                params.set('clubId', String(clubIdValue));
                params.set('joinType', joinTypeValue);

                const response = await fetch('/hp/join/hpJoinTeeTimeSearchClub.do', {
                  method: 'POST',
                  headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                  body: params.toString(),
                  credentials: 'include',
                });

                const text = await response.text();
                try {
                  const json = JSON.parse(text);
                  const count = Number(json?.resultListCnt?.[bookingDayValue] || 0);
                  return {
                    ok: true,
                    success: !!json.success,
                    count,
                    redirect: json.redirect || null,
                  };
                } catch {
                  return { ok: false, success: false, count: 0, redirect: null };
                }
              },
              {
                bookingDayValue: bookingDay,
                clubIdValue: clubId,
                joinTypeValue: args.joinType,
              }
            );
            break;
          } catch {
            if (attempts >= 3) {
              result = { ok: false, success: false, count: 0, redirect: null };
              break;
            }
            await page.waitForTimeout(150 * attempts);
          }
        }

        if (result.ok && result.success && result.count >= args.minCount) {
          hits.push({ club_id: clubId, count: result.count });
        }
      }
      await page.close();
      return hits;
    });

    const batches = await Promise.all(workers);
    const merged = batches.flat().sort((a, b) => b.count - a.count || a.club_id - b.club_id);
    return {
      booking_day: bookingDay,
      range: [args.from, args.to],
      min_count: args.minCount,
      found_count: merged.length,
      rows: merged,
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function maybeWriteToTarget(args, result) {
  if (!args.writeTargetId && !args.writeSite) return null;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Writing target requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let targetQuery = supabase.from('external_price_targets').select('id, parser_config');
  if (Number.isFinite(args.writeTargetId)) {
    targetQuery = targetQuery.eq('id', args.writeTargetId);
  } else {
    targetQuery = targetQuery.eq('site_code', args.writeSite || 'teeupnjoy').order('id', { ascending: true }).limit(1);
  }

  const { data: target, error: targetError } = await targetQuery.single();
  if (targetError || !target) {
    throw new Error(`Failed to load target: ${targetError?.message || 'not found'}`);
  }

  const parserConfig = (target.parser_config && typeof target.parser_config === 'object')
    ? target.parser_config
    : {};

  const clubIds = result.rows.map((row) => row.club_id);
  const updatedConfig = {
    ...parserConfig,
    join_type: parserConfig.join_type || args.joinType,
    club_ids: clubIds,
    discovery: {
      booking_day: result.booking_day,
      found_count: result.found_count,
      scanned_from: args.from,
      scanned_to: args.to,
      discovered_at: new Date().toISOString(),
    },
  };

  const { error: updateError } = await supabase
    .from('external_price_targets')
    .update({ parser_config: updatedConfig, updated_at: new Date().toISOString() })
    .eq('id', target.id);

  if (updateError) {
    throw new Error(`Failed to update target parser_config: ${updateError.message}`);
  }

  return { target_id: target.id, club_ids_count: clubIds.length };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await discoverClubIds(args);
  console.log(JSON.stringify(result, null, 2));

  const writeResult = await maybeWriteToTarget(args, result);
  if (writeResult) {
    console.log(`Updated target ${writeResult.target_id} with ${writeResult.club_ids_count} club_ids.`);
  }
}

main().catch((error) => {
  console.error('Discover failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
