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
const COLLECTION_WINDOWS = ['WEEK_BEFORE', 'TWO_DAYS_BEFORE', 'SAME_DAY_MORNING', 'IMMINENT_3H'];
const DAY_PARTS = ['PART_1', 'PART_2', 'PART_3'];
const PLATFORM_VALUES = ['WEB', 'APP'];
const AVAILABILITY_VALUES = ['AVAILABLE', 'NO_DATA', 'AUTH_REQUIRED', 'REMOVED', 'FAILED'];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  const missing = [];
  if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {
    targetId: null,
    limit: null,
    dryRun: false,
    headful: false,
    window: null,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true;
    if (arg === '--headful') args.headful = true;
    if (arg.startsWith('--target=')) args.targetId = Number(arg.split('=')[1]);
    if (arg.startsWith('--limit=')) args.limit = Number(arg.split('=')[1]);
    if (arg.startsWith('--window=')) args.window = arg.split('=')[1];
  }

  if (args.window && !COLLECTION_WINDOWS.includes(args.window)) {
    console.error(`Invalid --window value: ${args.window}`);
    console.error(`Allowed values: ${COLLECTION_WINDOWS.join(', ')}`);
    process.exit(1);
  }

  return args;
}

function parsePrice(text) {
  if (!text) return null;
  const manMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*만/);
  if (manMatch) {
    return Math.round(Number(manMatch[1]) * 10000);
  }

  const digits = text.replace(/[^0-9]/g, '');
  if (!digits) return null;
  return Number(digits);
}

function parsePlayDate(text) {
  if (!text) return null;

  const normalized = text.trim().replace(/\./g, '-').replace(/\//g, '-');
  const match = normalized.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return null;

  const [, year, month, day] = match;
  const paddedMonth = month.padStart(2, '0');
  const paddedDay = day.padStart(2, '0');
  return `${year}-${paddedMonth}-${paddedDay}`;
}

function parseTeeTime(text) {
  if (!text) return null;
  const match = text.match(/([01]?\d|2[0-3]):([0-5]\d)/);
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : null;
}

function parseYyyymmdd(value) {
  if (!value) return null;
  const clean = String(value).replace(/[^0-9]/g, '');
  if (clean.length !== 8) return null;
  return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
}

function formatYyyymmdd(dateStr) {
  return dateStr.replace(/-/g, '');
}

function toUtcDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtcDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateStr, days) {
  const date = toUtcDate(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDate(date);
}

function diffDays(a, b) {
  return Math.round((toUtcDate(a).getTime() - toUtcDate(b).getTime()) / (1000 * 60 * 60 * 24));
}

function getKstNow(now = new Date()) {
  const kstDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
  }).format(now);

  const kstHour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      hour12: false,
    }).format(now)
  );

  return { date: kstDate, hour: Number.isNaN(kstHour) ? 0 : kstHour };
}

function buildHorizonDates(now = new Date()) {
  const { date: todayKst } = getKstNow(now);
  return [
    { window: 'WEEK_BEFORE', date: addDays(todayKst, 7) },
    { window: 'TWO_DAYS_BEFORE', date: addDays(todayKst, 2) },
    { window: 'SAME_DAY_MORNING', date: todayKst },
    { window: 'IMMINENT_3H', date: todayKst },
  ];
}

function classifyCollectionWindow(playDate, teeTime, now = new Date()) {
  if (!playDate) return null;
  const { date: todayKst, hour: hourKst } = getKstNow(now);
  const dayDiff = diffDays(playDate, todayKst);

  if (dayDiff === 7) return 'WEEK_BEFORE';
  if (dayDiff === 2) return 'TWO_DAYS_BEFORE';

  if (dayDiff === 0) {
    if (hourKst < 12) return 'SAME_DAY_MORNING';
    if (teeTime) {
      const teeAt = new Date(`${playDate}T${teeTime}:00+09:00`);
      const hoursUntilTeeOff = (teeAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilTeeOff >= 0 && hoursUntilTeeOff <= 3) {
        return 'IMMINENT_3H';
      }
    }
  }

  return null;
}

function classifyDayPart(teeTime) {
  if (!teeTime) return null;
  const [hourRaw] = teeTime.split(':');
  const hour = Number(hourRaw);
  if (Number.isNaN(hour)) return null;

  if (hour < 10) return 'PART_1';
  if (hour < 14) return 'PART_2';
  return 'PART_3';
}

function normalizeCourseName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()_\-]/g, '');
}

function courseMatches(targetCourse, rowCourse) {
  if (!targetCourse || targetCourse === '*') return true;
  const targetNorm = normalizeCourseName(targetCourse);
  const rowNorm = normalizeCourseName(rowCourse);
  return rowNorm.includes(targetNorm) || targetNorm.includes(rowNorm);
}

function toSourcePlatform(value) {
  const upper = String(value || 'WEB').toUpperCase();
  return PLATFORM_VALUES.includes(upper) ? upper : 'WEB';
}

function toAvailability(value) {
  const upper = String(value || '').toUpperCase();
  return AVAILABILITY_VALUES.includes(upper) ? upper : 'AVAILABLE';
}

function parseParserConfig(target) {
  const raw = target?.parser_config;
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}

function fillPriceMetrics(row) {
  const finalPrice = row.final_price ?? null;
  const originalPrice = row.original_price ?? null;
  const discountAmount =
    originalPrice && finalPrice && originalPrice > finalPrice ? originalPrice - finalPrice : null;
  const discountRate =
    originalPrice && finalPrice && originalPrice > finalPrice
      ? Number(((originalPrice - finalPrice) / originalPrice).toFixed(4))
      : null;

  return {
    ...row,
    discount_amount: discountAmount,
    discount_rate: discountRate,
  };
}

function pickSlotRows(partRows) {
  const sorted = [...partRows].sort((a, b) => (a.tee_time || '').localeCompare(b.tee_time || ''));
  const count = sorted.length;
  if (count === 0) return [];
  if (count === 1) return [{ slot: 'EARLY', row: sorted[0] }];
  if (count === 2) return [
    { slot: 'EARLY', row: sorted[0] },
    { slot: 'LATE', row: sorted[1] },
  ];
  const mid = Math.floor((count - 1) / 2);
  return [
    { slot: 'EARLY', row: sorted[0] },
    { slot: 'MIDDLE', row: sorted[mid] },
    { slot: 'LATE', row: sorted[count - 1] },
  ];
}

function sampleRowsByDayParts(rows) {
  const out = [];
  for (const part of DAY_PARTS) {
    const partRows = rows.filter((row) => row.day_part === part);
    for (const picked of pickSlotRows(partRows)) {
      out.push({
        ...picked.row,
        slot_position: picked.slot,
      });
    }
  }
  return out;
}

function buildBaseSnapshot(target, row = {}) {
  return {
    target_id: target.id,
    site_code: target.site_code,
    course_name: row.course_name || target.course_name,
    source_url: row.source_url || target.url,
    play_date: row.play_date || null,
    tee_time: row.tee_time || null,
    currency: row.currency || 'KRW',
    original_price: row.original_price ?? null,
    final_price: row.final_price ?? null,
    crawl_status: row.crawl_status || 'SUCCESS',
    availability_status: toAvailability(row.availability_status),
    source_platform: toSourcePlatform(row.source_platform || target.source_platform),
    collection_window: row.collection_window || null,
    day_part: row.day_part || null,
    slot_position: row.slot_position || null,
    error_message: row.error_message || null,
    payload: row.payload || {},
  };
}

async function loadTargets(supabase, args) {
  let query = supabase
    .from('external_price_targets')
    .select('*')
    .eq('active', true)
    .order('id', { ascending: true });

  if (Number.isFinite(args.targetId)) {
    query = query.eq('id', args.targetId);
  }

  if (Number.isFinite(args.limit)) {
    query = query.limit(args.limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load targets: ${error.message}`);
  }
  return data || [];
}

function appendQueryParam(inputUrl, key, value) {
  const url = new URL(inputUrl);
  url.searchParams.set(key, value);
  return url.toString();
}

function parseMonthDayToDate(monthDayText, now = new Date()) {
  const match = String(monthDayText || '').match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (!match) return null;

  const { date: todayKst } = getKstNow(now);
  const [todayYear, todayMonth, todayDay] = todayKst.split('-').map(Number);
  const month = Number(match[1]);
  const day = Number(match[2]);

  const thisYearCandidate = `${todayYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const delta = diffDays(thisYearCandidate, todayKst);
  const year = delta < -180 ? todayYear + 1 : todayYear;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function crawlGenericSingle(browser, target) {
  const page = await browser.newPage();
  try {
    await page.goto(target.url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    if (target.wait_for_selector) {
      await page.waitForSelector(target.wait_for_selector, { timeout: 15000 });
    }

    const extracted = await page.evaluate((selectors) => {
      const read = (selector) => {
        if (!selector) return null;
        const node = document.querySelector(selector);
        if (!node) return null;
        return node.textContent ? node.textContent.trim() : null;
      };

      return {
        pageTitle: document.title,
        finalPriceText: read(selectors.finalPrice),
        originalPriceText: read(selectors.originalPrice),
        playDateText: read(selectors.playDate),
        teeTimeText: read(selectors.teeTime),
      };
    }, {
      finalPrice: target.final_price_selector,
      originalPrice: target.original_price_selector,
      playDate: target.play_date_selector,
      teeTime: target.tee_time_selector,
    });

    return {
      success: true,
      rows: [
        buildBaseSnapshot(target, {
          source_url: target.url,
          play_date: parsePlayDate(extracted.playDateText),
          tee_time: parseTeeTime(extracted.teeTimeText),
          original_price: parsePrice(extracted.originalPriceText),
          final_price: parsePrice(extracted.finalPriceText),
          crawl_status: 'SUCCESS',
          availability_status: extracted.finalPriceText ? 'AVAILABLE' : 'NO_DATA',
          source_platform: 'WEB',
          payload: {
            ...extracted,
            selectors: {
              final_price_selector: target.final_price_selector,
              original_price_selector: target.original_price_selector,
              play_date_selector: target.play_date_selector,
              tee_time_selector: target.tee_time_selector,
            },
          },
        }),
      ],
    };
  } catch (error) {
    return {
      success: false,
      rows: [
        buildBaseSnapshot(target, {
          source_url: target.url,
          crawl_status: 'FAILED',
          availability_status: 'FAILED',
          error_message: error instanceof Error ? error.message : String(error),
          source_platform: 'WEB',
          payload: {
            selector: target.final_price_selector,
          },
        }),
      ],
    };
  } finally {
    await page.close();
  }
}

async function crawlGolfPangList(browser, target, args) {
  const page = await browser.newPage();
  const now = new Date();
  const desiredWindows = args.window ? [args.window] : COLLECTION_WINDOWS;

  try {
    const horizonDates = buildHorizonDates(now).filter((item) => desiredWindows.includes(item.window));
    const out = [];

    for (const horizon of horizonDates) {
      const pageUrl = appendQueryParam(
        target.url || 'https://www.golfpang.com/web/round/join_list.do',
        'rd_date',
        horizon.date
      );

      await page.goto(pageUrl, {
        waitUntil: 'networkidle',
        timeout: 60000,
      });

      await page.waitForTimeout(1500);

      const rows = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('#tblList tr'))
          .slice(1)
          .map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => (td.textContent || '').trim()))
          .filter((cells) => cells.length >= 8)
          .map((cells) => ({
            bookingDateText: cells[1] || null,
            teeTimeText: cells[2] || null,
            courseNameText: cells[4] || null,
            finalPriceText: cells[7] || null,
            rawCells: cells,
          }));
      });

      for (const row of rows) {
        if (!courseMatches(target.course_name, row.courseNameText)) {
          continue;
        }

        out.push(
          buildBaseSnapshot(target, {
            course_name: row.courseNameText || target.course_name,
            source_url: page.url(),
            play_date: horizon.date,
            tee_time: parseTeeTime(row.teeTimeText),
            final_price: parsePrice(row.finalPriceText),
            crawl_status: 'SUCCESS',
            availability_status: row.finalPriceText ? 'AVAILABLE' : 'NO_DATA',
            source_platform: 'WEB',
            collection_window: horizon.window,
            payload: {
              bookingDateText: row.bookingDateText,
              teeTimeText: row.teeTimeText,
              courseNameText: row.courseNameText,
              finalPriceText: row.finalPriceText,
              rawCells: row.rawCells,
            },
          })
        );
      }

      if (horizon.window === 'IMMINENT_3H') {
        const hasImminent = out.some((row) => row.collection_window === 'IMMINENT_3H');
        if (!hasImminent) {
          out.push(
            buildBaseSnapshot(target, {
              source_url: page.url(),
              play_date: horizon.date,
              crawl_status: 'SUCCESS',
              availability_status: 'NO_DATA',
              source_platform: 'WEB',
              collection_window: 'IMMINENT_3H',
              error_message: 'No imminent (<=3h) listing found',
              payload: { reason: 'no_imminent_rows_on_page' },
            })
          );
        }
      }
    }

    return { success: true, rows: out };
  } catch (error) {
    return {
      success: false,
      rows: [
        buildBaseSnapshot(target, {
          source_url: target.url,
          crawl_status: 'FAILED',
          availability_status: 'FAILED',
          source_platform: 'WEB',
          error_message: error instanceof Error ? error.message : String(error),
          payload: { adapter: 'golfpang_list' },
        }),
      ],
    };
  } finally {
    await page.close();
  }
}

async function crawlGolfRockList(browser, target) {
  const page = await browser.newPage();

  try {
    const listUrl = target.url || 'https://m.golfrock.co.kr/join_new_sub.asp';
    await page.goto(listUrl, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    await page.waitForTimeout(1000);

    const rows = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('tr[onclick*="join_view_new"]')).map((tr) => {
        const cells = Array.from(tr.querySelectorAll('td')).map((td) =>
          (td.textContent || '').replace(/\s+/g, ' ').trim()
        );
        return {
          cells,
          onclick: tr.getAttribute('onclick') || '',
        };
      });
    });

    const out = [];
    for (const row of rows) {
      const dateTime = row.cells[0] || '';
      const courseAndPrice = row.cells[1] || '';

      const dateMatch = dateTime.match(/(\d{1,2})\/(\d{1,2})\([^)]*\)\s*([0-2]?\d:[0-5]\d)/);
      const playDate = dateMatch ? parseMonthDayToDate(`${dateMatch[1]}/${dateMatch[2]}`) : null;
      const teeTime = dateMatch ? parseTeeTime(dateMatch[3]) : null;

      const courseName = courseAndPrice
        .replace(/([0-9]+(?:\.[0-9]+)?)\s*만/g, '')
        .replace(/([0-9,]+)\s*원/g, '')
        .trim();

      if (!courseMatches(target.course_name, courseName)) {
        continue;
      }

      const relativeMatch = row.onclick.match(/location\.replace\('([^']+)'\)/i);
      const detailUrl = relativeMatch ? new URL(relativeMatch[1], listUrl).toString() : listUrl;

      out.push(
        buildBaseSnapshot(target, {
          course_name: courseName || target.course_name,
          source_url: detailUrl,
          play_date: playDate,
          tee_time: teeTime,
          final_price: parsePrice(courseAndPrice),
          crawl_status: 'SUCCESS',
          availability_status: 'AVAILABLE',
          source_platform: 'WEB',
          payload: {
            dateTime,
            courseAndPrice,
            onclick: row.onclick,
            rawCells: row.cells,
          },
        })
      );
    }

    if (out.length === 0) {
      const pageText = (await page.textContent('body')) || '';
      const authRequired = /로그인시\s*확인가능|로그인|login/i.test(pageText);
      return {
        success: true,
        rows: [
          buildBaseSnapshot(target, {
            source_url: page.url(),
            crawl_status: authRequired ? 'SUCCESS' : 'FAILED',
            availability_status: authRequired ? 'AUTH_REQUIRED' : 'NO_DATA',
            source_platform: 'WEB',
            error_message: authRequired
              ? 'Price/details require login'
              : 'No matching listings found for target course',
            payload: { adapter: 'golfrock_list' },
          }),
        ],
      };
    }

    return { success: true, rows: out };
  } catch (error) {
    return {
      success: false,
      rows: [
        buildBaseSnapshot(target, {
          source_url: target.url,
          crawl_status: 'FAILED',
          availability_status: 'FAILED',
          source_platform: 'WEB',
          error_message: error instanceof Error ? error.message : String(error),
          payload: { adapter: 'golfrock_list' },
        }),
      ],
    };
  } finally {
    await page.close();
  }
}

async function crawlTeeupNjoyApi(browser, target, args) {
  const parserConfig = parseParserConfig(target);
  const clubId = parserConfig.club_id;
  const joinType = parserConfig.join_type || 'join';
  const page = await browser.newPage();
  const desiredWindows = args.window ? [args.window] : COLLECTION_WINDOWS;

  if (!clubId) {
    return {
      success: true,
      rows: [
        buildBaseSnapshot(target, {
          source_url: target.url,
          crawl_status: 'FAILED',
          availability_status: 'FAILED',
          source_platform: 'WEB',
          error_message: 'Missing parser_config.club_id for teeupnjoy',
          payload: { parser_config: parserConfig },
        }),
      ],
    };
  }

  try {
    const out = [];
    const horizonDates = buildHorizonDates(new Date()).filter((item) => desiredWindows.includes(item.window));

    for (const horizon of horizonDates) {
      const listUrl = appendQueryParam(
        target.url || 'https://www.teeupnjoy.com/hp/join/reslist.do',
        'bookingDay',
        formatYyyymmdd(horizon.date)
      );

      await page.goto(listUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      const jsonResponse = await page.evaluate(
        async ({ bookingDay, clubIdValue, joinTypeValue }) => {
          const params = new URLSearchParams();
          params.set('trgetTcYn', 'Y');
          params.set('bookingDay', bookingDay);
          params.set('bookingEndDay', bookingDay);
          params.set('clubId', String(clubIdValue));
          params.set('joinType', joinTypeValue);

          const response = await fetch('/hp/join/hpJoinTeeTimeSearchClub.do', {
            method: 'POST',
            headers: {
              'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
            body: params.toString(),
            credentials: 'include',
          });

          const text = await response.text();
          try {
            return { ok: true, json: JSON.parse(text) };
          } catch {
            return { ok: false, text: text.slice(0, 500) };
          }
        },
        {
          bookingDay: formatYyyymmdd(horizon.date),
          clubIdValue: clubId,
          joinTypeValue: joinType,
        }
      );

      if (!jsonResponse.ok) {
        out.push(
          buildBaseSnapshot(target, {
            source_url: listUrl,
            play_date: horizon.date,
            crawl_status: 'FAILED',
            availability_status: 'FAILED',
            source_platform: 'WEB',
            collection_window: horizon.window,
            error_message: 'Failed to parse teeupnjoy response',
            payload: { response_head: jsonResponse.text },
          })
        );
        continue;
      }

      const json = jsonResponse.json;
      if (!json.success) {
        out.push(
          buildBaseSnapshot(target, {
            source_url: listUrl,
            play_date: horizon.date,
            crawl_status: 'SUCCESS',
            availability_status: 'AUTH_REQUIRED',
            source_platform: 'WEB',
            collection_window: horizon.window,
            error_message: json.redirect ? `Redirected to ${json.redirect}` : 'Request rejected',
            payload: json,
          })
        );
        continue;
      }

      const rows = (json.resultList && json.resultList[formatYyyymmdd(horizon.date)]) || [];
      for (const item of rows) {
        const courseName = item.prName || target.course_name;
        if (!courseMatches(target.course_name, courseName)) {
          continue;
        }

        const teeTime = item.bookingTime
          ? `${String(item.bookingTime).slice(0, 2)}:${String(item.bookingTime).slice(2, 4)}`
          : null;

        out.push(
          buildBaseSnapshot(target, {
            course_name: courseName,
            source_url: listUrl,
            play_date: parseYyyymmdd(item.bookingDay) || horizon.date,
            tee_time: parseTeeTime(teeTime),
            final_price: parsePrice(item.bookDiscount),
            crawl_status: 'SUCCESS',
            availability_status: item.bookDiscount ? 'AVAILABLE' : 'NO_DATA',
            source_platform: 'WEB',
            collection_window: horizon.window,
            payload: item,
          })
        );
      }

      if (horizon.window === 'IMMINENT_3H') {
        const hasImminent = out.some((row) => row.collection_window === 'IMMINENT_3H');
        if (!hasImminent) {
          out.push(
            buildBaseSnapshot(target, {
              source_url: listUrl,
              play_date: horizon.date,
              crawl_status: 'SUCCESS',
              availability_status: 'NO_DATA',
              source_platform: 'WEB',
              collection_window: 'IMMINENT_3H',
              error_message: 'No imminent (<=3h) listing found',
              payload: { club_id: clubId, reason: 'no_imminent_rows_in_api' },
            })
          );
        }
      }
    }

    return { success: true, rows: out };
  } catch (error) {
    return {
      success: false,
      rows: [
        buildBaseSnapshot(target, {
          source_url: target.url,
          crawl_status: 'FAILED',
          availability_status: 'FAILED',
          source_platform: 'WEB',
          error_message: error instanceof Error ? error.message : String(error),
          payload: { adapter: 'teeupnjoy_api', parser_config: parserConfig },
        }),
      ],
    };
  } finally {
    await page.close();
  }
}

function postProcessRows(target, rows, args) {
  const now = new Date();
  const desiredWindows = args.window ? [args.window] : COLLECTION_WINDOWS;

  const normalized = rows
    .map((row) => {
      const collectionWindow =
        row.collection_window || classifyCollectionWindow(row.play_date, row.tee_time, now);

      if (!collectionWindow || !desiredWindows.includes(collectionWindow)) {
        return null;
      }

      return fillPriceMetrics({
        ...row,
        collection_window: collectionWindow,
        day_part: row.day_part || classifyDayPart(row.tee_time),
      });
    })
    .filter(Boolean);

  const directRows = normalized.filter((row) => row.availability_status !== 'AVAILABLE' || !row.tee_time);
  const availableRows = normalized.filter((row) => row.availability_status === 'AVAILABLE' && row.tee_time);

  const grouped = new Map();
  for (const row of availableRows) {
    const key = `${row.collection_window}|${row.play_date || 'unknown'}`;
    const bucket = grouped.get(key) || [];
    bucket.push(row);
    grouped.set(key, bucket);
  }

  const sampled = [];
  for (const rowsOfGroup of grouped.values()) {
    sampled.push(...sampleRowsByDayParts(rowsOfGroup));
  }

  const out = [...directRows, ...sampled];
  const hasImminentRows = out.some((row) => row.collection_window === 'IMMINENT_3H');

  if (!hasImminentRows && desiredWindows.includes('IMMINENT_3H')) {
    const { date: todayKst } = getKstNow(now);
    out.push(
      fillPriceMetrics(
        buildBaseSnapshot(target, {
          source_url: target.url,
          play_date: todayKst,
          crawl_status: 'SUCCESS',
          availability_status: 'NO_DATA',
          source_platform: target.source_platform || 'WEB',
          collection_window: 'IMMINENT_3H',
          error_message: 'No imminent (<=3h) listing found',
          payload: { reason: 'imminent_window_empty_after_sampling' },
        })
      )
    );
  }

  return out;
}

async function crawlTarget(browser, target, args) {
  const adapterCode = (target.adapter_code || target.site_code || 'generic_single').toLowerCase();

  if (adapterCode.includes('golfpang')) {
    return crawlGolfPangList(browser, target, args);
  }
  if (adapterCode.includes('golfrock')) {
    return crawlGolfRockList(browser, target);
  }
  if (adapterCode.includes('teeup')) {
    return crawlTeeupNjoyApi(browser, target, args);
  }
  if (adapterCode.includes('golfmon') || adapterCode.includes('smartscore')) {
    return {
      success: true,
      rows: [
        buildBaseSnapshot(target, {
          crawl_status: 'SUCCESS',
          availability_status: 'AUTH_REQUIRED',
          source_platform: target.source_platform || 'APP',
          error_message: 'App source requires authenticated app/API integration',
          payload: { adapter: adapterCode },
        }),
      ],
    };
  }
  return crawlGenericSingle(browser, target);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let playwright;
  try {
    playwright = await import('playwright');
  } catch (error) {
    console.error('Missing dependency: playwright');
    console.error('Run: npm i -D playwright');
    process.exit(1);
  }

  const targets = await loadTargets(supabase, args);
  if (targets.length === 0) {
    console.log('No active crawl targets found.');
    return;
  }

  console.log(`Starting crawl for ${targets.length} target(s)...`);
  const browser = await playwright.chromium.launch({ headless: !args.headful });

  const summary = {
    success: 0,
    failed: 0,
    rows: 0,
  };

  try {
    for (const target of targets) {
      console.log(
        `[${target.id}] Crawling ${target.site_code} - ${target.course_name} (adapter: ${target.adapter_code || target.site_code || 'generic_single'})`
      );
      const crawled = await crawlTarget(browser, target, args);
      const rowsToSave = postProcessRows(target, crawled.rows || [], args);

      if (crawled.success) {
        summary.success += 1;
      } else {
        summary.failed += 1;
      }
      summary.rows += rowsToSave.length;

      if (args.dryRun) {
        console.log(`[${target.id}] dry-run rows (${rowsToSave.length}):`);
        for (const row of rowsToSave) {
          console.log(row);
        }
        continue;
      }

      if (rowsToSave.length === 0) {
        console.log(`[${target.id}] No rows selected for configured windows.`);
        continue;
      }

      const { error } = await supabase.from('external_price_snapshots').insert(rowsToSave);

      if (error) {
        summary.failed += 1;
        console.error(`[${target.id}] Save failed: ${error.message}`);
      } else {
        console.log(`[${target.id}] Saved ${rowsToSave.length} row(s)`);
      }
    }
  } finally {
    await browser.close();
  }

  console.log('Crawl finished:', summary);
}

main().catch((error) => {
  console.error('Crawler crashed:', error);
  process.exit(1);
});
