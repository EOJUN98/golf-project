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
    hours: 24,
    maxRows: 5000,
    json: false,
  };

  for (const arg of argv) {
    if (arg === '--json') args.json = true;
    if (arg.startsWith('--hours=')) args.hours = Number(arg.split('=')[1]);
    if (arg.startsWith('--max-rows=')) args.maxRows = Number(arg.split('=')[1]);
  }

  if (!Number.isFinite(args.hours) || args.hours <= 0 || args.hours > 24 * 30) {
    throw new Error('Invalid --hours. Allowed: 1..720');
  }
  if (!Number.isFinite(args.maxRows) || args.maxRows < 100 || args.maxRows > 50000) {
    throw new Error('Invalid --max-rows. Allowed: 100..50000');
  }

  return args;
}

function inc(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function topEntries(map, limit = 10) {
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || String(a.key).localeCompare(String(b.key)))
    .slice(0, limit);
}

function printSection(title, rows) {
  console.log(`\n[${title}]`);
  if (!rows || rows.length === 0) {
    console.log('- (none)');
    return;
  }
  for (const row of rows) {
    console.log(`- ${row.key}: ${row.count}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const missing = [];
    if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const sinceIso = new Date(Date.now() - args.hours * 60 * 60 * 1000).toISOString();

  const [{ data: targets, error: targetsError }, { data: snapshots, error: snapshotsError }] = await Promise.all([
    supabase
      .from('external_price_targets')
      .select('id, site_code, course_name, adapter_code, source_platform, active, updated_at')
      .eq('active', true),
    supabase
      .from('external_price_snapshots')
      .select('id, target_id, site_code, course_name, collection_window, day_part, slot_position, availability_status, crawl_status, error_message, crawled_at')
      .gte('crawled_at', sinceIso)
      .order('crawled_at', { ascending: false })
      .limit(args.maxRows),
  ]);

  if (targetsError) throw new Error(`Failed to load targets: ${targetsError.message}`);
  if (snapshotsError) throw new Error(`Failed to load snapshots: ${snapshotsError.message}`);

  const targetsSafe = targets || [];
  const snapshotsSafe = snapshots || [];

  const bySite = new Map();
  const byWindow = new Map();
  const byStatus = new Map();
  const byAvailability = new Map();
  const byPartSlot = new Map();
  const byTarget = new Map();
  const errorMessages = new Map();

  for (const row of snapshotsSafe) {
    inc(bySite, row.site_code || 'UNKNOWN');
    inc(byWindow, row.collection_window || 'UNSET');
    inc(byStatus, row.crawl_status || 'UNKNOWN');
    inc(byAvailability, row.availability_status || 'UNKNOWN');
    inc(byPartSlot, `${row.day_part || 'UNSET'}|${row.slot_position || 'UNSET'}`);
    inc(byTarget, String(row.target_id || 'NULL'));
    if (row.error_message) inc(errorMessages, row.error_message);
  }

  const seenTargetIds = new Set(
    snapshotsSafe.map((row) => row.target_id).filter((value) => typeof value === 'number')
  );
  const missingTargets = targetsSafe.filter((target) => !seenTargetIds.has(target.id));

  const report = {
    generated_at: new Date().toISOString(),
    since_iso: sinceIso,
    hours: args.hours,
    targets_active_count: targetsSafe.length,
    snapshots_count: snapshotsSafe.length,
    grouped: {
      by_site: topEntries(bySite, 20),
      by_window: topEntries(byWindow, 20),
      by_crawl_status: topEntries(byStatus, 20),
      by_availability: topEntries(byAvailability, 20),
      by_part_slot: topEntries(byPartSlot, 20),
      by_target: topEntries(byTarget, 20),
      top_errors: topEntries(errorMessages, 10),
    },
    targets_without_snapshots: missingTargets.map((target) => ({
      id: target.id,
      site_code: target.site_code,
      course_name: target.course_name,
      adapter_code: target.adapter_code,
      source_platform: target.source_platform,
      updated_at: target.updated_at,
    })),
  };

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('Crawler Snapshot Health');
  console.log(`- generated_at: ${report.generated_at}`);
  console.log(`- lookback_hours: ${report.hours}`);
  console.log(`- active_targets: ${report.targets_active_count}`);
  console.log(`- snapshots: ${report.snapshots_count}`);
  console.log(`- since: ${report.since_iso}`);

  printSection('By Site', report.grouped.by_site);
  printSection('By Window', report.grouped.by_window);
  printSection('By Crawl Status', report.grouped.by_crawl_status);
  printSection('By Availability', report.grouped.by_availability);
  printSection('By DayPart|Slot', report.grouped.by_part_slot);
  printSection('Top Errors', report.grouped.top_errors);

  console.log('\n[Targets Without Snapshots]');
  if (report.targets_without_snapshots.length === 0) {
    console.log('- none');
  } else {
    for (const target of report.targets_without_snapshots) {
      console.log(`- id=${target.id} site=${target.site_code} course=${target.course_name} adapter=${target.adapter_code}`);
    }
  }
}

main().catch((error) => {
  console.error('Health report failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
