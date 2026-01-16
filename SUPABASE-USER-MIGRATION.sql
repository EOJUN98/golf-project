-- ⚠️ IMPORTANT: Run this script in the Supabase SQL Editor to fix the Schema for Phase 2

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Clean up old tables (if they exist with wrong types)
-- CAUTION: This will delete existing data in these tables.
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS tee_times CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS golf_clubs CASCADE;

-- 3. Create Golf Clubs Table
CREATE TABLE golf_clubs (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location_name TEXT NOT NULL,
  location_lat DECIMAL(10, 8) NOT NULL,
  location_lng DECIMAL(11, 8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO golf_clubs (name, location_name, location_lat, location_lng) VALUES
('Club 72', 'Incheon', 37.456300, 126.705200);

-- 4. Create Users Table (Linked to Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  segment TEXT NOT NULL DEFAULT 'FUTURE' CHECK (segment IN ('FUTURE', 'PRESTIGE', 'SMART', 'CHERRY')),
  cherry_score INTEGER DEFAULT 0,
  terms_agreed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Trigger for New User Signup
-- This automatically creates a public.users row when a user signs up via Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, segment)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'name', 
    'FUTURE' -- Default Segment
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid error
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Create Tee Times Table
CREATE TABLE tee_times (
  id BIGSERIAL PRIMARY KEY,
  golf_club_id BIGINT REFERENCES golf_clubs(id) ON DELETE CASCADE,
  tee_off TIMESTAMP WITH TIME ZONE NOT NULL,
  base_price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'BOOKED', 'BLOCKED')),
  weather_condition JSONB,
  reserved_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Now uses UUID
  reserved_at TIMESTAMP WITH TIME ZONE
);

-- 7. Create Reservations Table
CREATE TABLE reservations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tee_time_id BIGINT NOT NULL REFERENCES tee_times(id),
  user_id UUID NOT NULL REFERENCES users(id),
  base_price INTEGER NOT NULL,
  final_price INTEGER NOT NULL,
  discount_breakdown JSONB,
  payment_key TEXT,
  payment_status TEXT DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tee_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read tee times" ON tee_times FOR SELECT USING (true);
CREATE POLICY "Users can see own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can see own reservations" ON reservations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create reservations" ON reservations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. Insert Dummy Tee Times (for Testing)
DO $$
DECLARE
  club_id BIGINT;
BEGIN
  SELECT id INTO club_id FROM golf_clubs LIMIT 1;
  
  -- Tomorrow 10:00 AM
  INSERT INTO tee_times (golf_club_id, tee_off, base_price, status)
  VALUES (club_id, NOW() + INTERVAL '1 day' + INTERVAL '10 hours', 250000, 'OPEN');

  -- Tomorrow 02:00 PM
  INSERT INTO tee_times (golf_club_id, tee_off, base_price, status)
  VALUES (club_id, NOW() + INTERVAL '1 day' + INTERVAL '14 hours', 220000, 'OPEN');
END $$;
