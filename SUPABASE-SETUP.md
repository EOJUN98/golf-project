# 🗄️ TUGOL Supabase Setup Guide

Complete guide for setting up the Supabase database backend for TUGOL MVP.

---

## 📋 Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Project Created**: Create a new Supabase project
3. **Project Credentials**: Copy your project URL and anon key

---

## 🔐 Step 1: Environment Variables

Add the following to your `.env.local` file in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Weather API (기존)
NEXT_PUBLIC_WEATHER_API_KEY=your-weather-api-key
```

### How to Get Your Credentials:

1. Go to your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
4. Copy **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Important:** Restart your dev server after adding environment variables:
```bash
# Stop the current server (Ctrl+C)
npm run dev
```

---

## 🗃️ Step 2: Database Schema

Run the following SQL in your Supabase SQL Editor:

### 1. Golf Clubs Table

```sql
-- ==================================================================
-- 골프장 테이블
-- ==================================================================
CREATE TABLE IF NOT EXISTS golf_clubs (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location_name TEXT NOT NULL,
  location_lat DECIMAL(10, 8) NOT NULL,
  location_lng DECIMAL(11, 8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for location-based queries
CREATE INDEX idx_golf_clubs_location ON golf_clubs (location_lat, location_lng);

-- Sample data
INSERT INTO golf_clubs (name, location_name, location_lat, location_lng) VALUES
('Club 72', '인천', 37.456300, 126.705200);
```

---

### 2. Users Table

```sql
-- ==================================================================
-- 사용자 테이블
-- ==================================================================
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  segment TEXT NOT NULL DEFAULT 'FUTURE' CHECK (segment IN ('FUTURE', 'PRESTIGE', 'SMART', 'CHERRY')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX idx_users_email ON users (email);

-- Sample data
INSERT INTO users (name, email, phone, segment) VALUES
('재마나이', 'jaminai@tugol.com', '010-1234-5678', 'PRESTIGE');
```

---

### 3. Tee Times Table (Core)

```sql
-- ==================================================================
-- 티타임 테이블 (핵심)
-- ==================================================================
CREATE TABLE IF NOT EXISTS tee_times (
  id BIGSERIAL PRIMARY KEY,
  golf_club_id BIGINT NOT NULL REFERENCES golf_clubs(id) ON DELETE CASCADE,
  tee_off_time TIMESTAMP WITH TIME ZONE NOT NULL,
  base_price INTEGER NOT NULL CHECK (base_price > 0),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'BOOKED', 'BLOCKED', 'CANCELLED')),
  weather_data JSONB,
  reserved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reserved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tee_times_tee_off ON tee_times (tee_off_time);
CREATE INDEX idx_tee_times_status ON tee_times (status);
CREATE INDEX idx_tee_times_club_id ON tee_times (golf_club_id);

-- Weather data structure (JSONB example):
-- {
--   "status": "success",
--   "rainProb": 40,
--   "rainfall": 0,
--   "temperature": 15,
--   "sky": "CLOUDY"
-- }
```

---

### 4. Sample Tee Times Data

```sql
-- ==================================================================
-- 테스트용 티타임 데이터 생성
-- ==================================================================

-- Get the golf club ID
DO $$
DECLARE
  club_id BIGINT;
BEGIN
  SELECT id INTO club_id FROM golf_clubs WHERE name = 'Club 72' LIMIT 1;

  -- Insert 5 test tee times (similar to mock data)

  -- 1. Panic Mode (45 minutes from now)
  INSERT INTO tee_times (golf_club_id, tee_off_time, base_price, status, weather_data)
  VALUES (
    club_id,
    NOW() + INTERVAL '45 minutes',
    250000,
    'OPEN',
    '{"status": "success", "rainProb": 10, "rainfall": 0, "temperature": 18, "sky": "CLEAR"}'::jsonb
  );

  -- 2. Normal Discount (1.5 hours from now)
  INSERT INTO tee_times (golf_club_id, tee_off_time, base_price, status, weather_data)
  VALUES (
    club_id,
    NOW() + INTERVAL '90 minutes',
    280000,
    'OPEN',
    '{"status": "success", "rainProb": 40, "rainfall": 0, "temperature": 15, "sky": "CLOUDY"}'::jsonb
  );

  -- 3. Heavy Rain (2 hours from now)
  INSERT INTO tee_times (golf_club_id, tee_off_time, base_price, status, weather_data)
  VALUES (
    club_id,
    NOW() + INTERVAL '120 minutes',
    250000,
    'OPEN',
    '{"status": "success", "rainProb": 80, "rainfall": 5, "temperature": 12, "sky": "RAIN"}'::jsonb
  );

  -- 4. Weather Blocked (2.5 hours from now)
  INSERT INTO tee_times (golf_club_id, tee_off_time, base_price, status, weather_data)
  VALUES (
    club_id,
    NOW() + INTERVAL '150 minutes',
    280000,
    'BLOCKED',
    '{"status": "success", "rainProb": 90, "rainfall": 15, "temperature": 10, "sky": "HEAVY_RAIN"}'::jsonb
  );

  -- 5. Already Booked (3 hours from now)
  INSERT INTO tee_times (golf_club_id, tee_off_time, base_price, status, weather_data)
  VALUES (
    club_id,
    NOW() + INTERVAL '180 minutes',
    250000,
    'BOOKED',
    '{"status": "success", "rainProb": 10, "rainfall": 0, "temperature": 18, "sky": "CLEAR"}'::jsonb
  );

END $$;
```

---

### 5. Reservations Table (Future)

```sql
-- ==================================================================
-- 예약 테이블 (Phase 3용)
-- ==================================================================
CREATE TABLE IF NOT EXISTS reservations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tee_time_id BIGINT NOT NULL REFERENCES tee_times(id) ON DELETE CASCADE,
  final_price INTEGER NOT NULL,
  discount_breakdown JSONB,
  payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reservations_user_id ON reservations (user_id);
CREATE INDEX idx_reservations_tee_time_id ON reservations (tee_time_id);
```

---

## 🔄 Step 3: Enable Row Level Security (RLS)

For production, enable RLS policies:

```sql
-- Enable RLS
ALTER TABLE golf_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tee_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Public read access for tee times (MVP)
CREATE POLICY "Allow public read on tee_times"
  ON tee_times FOR SELECT
  USING (true);

-- Public read access for golf clubs
CREATE POLICY "Allow public read on golf_clubs"
  ON golf_clubs FOR SELECT
  USING (true);
```

---

## ✅ Step 4: Verify Installation

Run this query to check if everything is set up correctly:

```sql
SELECT
  tt.id,
  tt.tee_off_time,
  tt.base_price,
  tt.status,
  tt.weather_data,
  gc.name as club_name
FROM tee_times tt
JOIN golf_clubs gc ON tt.golf_club_id = gc.id
WHERE tt.tee_off_time >= NOW()
ORDER BY tt.tee_off_time ASC;
```

Expected result: 5 rows with test data.

---

## 🧪 Step 5: Test the Connection

After adding environment variables and restarting the server:

1. Visit `http://localhost:3000`
2. The app should now fetch data from Supabase
3. If no data exists, it will fall back to mock data
4. Check browser console for any errors

---

## 📊 Database Schema Diagram

```
┌─────────────────┐
│  golf_clubs     │
├─────────────────┤
│ id (PK)         │
│ name            │
│ location_lat    │
│ location_lng    │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐      ┌─────────────────┐
│  tee_times      │◄────►│  users          │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK)         │
│ golf_club_id    │      │ name            │
│ tee_off_time    │      │ email           │
│ base_price      │      │ segment         │
│ status          │      └─────────────────┘
│ weather_data    │               │
│ reserved_by     │               │
└────────┬────────┘               │
         │                        │
         │ 1:N                    │ 1:N
         │                        │
┌────────▼────────────────────────▼──┐
│  reservations                      │
├────────────────────────────────────┤
│ id (PK)                            │
│ user_id (FK)                       │
│ tee_time_id (FK)                   │
│ final_price                        │
│ discount_breakdown (JSONB)         │
│ payment_status                     │
└────────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### Error: "Missing Supabase environment variables"
- Check `.env.local` file exists in project root
- Verify variable names start with `NEXT_PUBLIC_`
- Restart dev server after adding variables

### Error: "relation 'tee_times' does not exist"
- Run the SQL schema in Supabase SQL Editor
- Check table was created in **Table Editor**

### Data Not Showing
- Check if sample data was inserted successfully
- Verify `tee_off_time` is in the future
- Check browser console for fetch errors

### RLS Policy Errors
- Temporarily disable RLS during development
- Ensure public read policies are created

---

## 📝 Next Steps After Setup

1. **Test with real data** - Add more tee times via SQL or admin panel
2. **Weather API integration** - Connect real weather data updates
3. **User authentication** - Add Supabase Auth for login
4. **Booking flow** - Implement reservation creation
5. **Admin dashboard** - Build management interface

---

## 🎉 Setup Complete!

Your TUGOL MVP is now connected to Supabase. The pricing engine will calculate discounts based on real database records.

**Key Files:**
- [lib/supabase.ts](lib/supabase.ts) - Supabase client configuration
- [app/page.tsx](app/page.tsx) - Data fetching logic
- [types/database.ts](types/database.ts) - TypeScript type definitions

**Status:** Ready for testing with live database! 🚀
