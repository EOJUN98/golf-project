-- USERS
CREATE TABLE public.users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  segment TEXT NOT NULL DEFAULT 'FUTURE',
  cherry_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GOLF CLUBS
CREATE TABLE public.golf_clubs (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TEE TIMES
CREATE TABLE public.tee_times (
  id BIGSERIAL PRIMARY KEY,
  golf_club_id BIGINT NOT NULL REFERENCES public.golf_clubs(id),
  tee_off TIMESTAMPTZ NOT NULL,
  base_price INTEGER NOT NULL,
  current_price INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KRW',
  status TEXT NOT NULL, -- 'OPEN' | 'BOOKED' | 'BLOCKED'
  reserved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT,
  updated_at TIMESTAMPTZ
);

-- CLUB ADMINS
CREATE TABLE public.club_admins (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  golf_club_id BIGINT NOT NULL REFERENCES public.golf_clubs(id) ON DELETE CASCADE,
  UNIQUE (user_id, golf_club_id)
);
