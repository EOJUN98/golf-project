-- Generate Tee Times for 2026-01-28 to 2026-02-14 (KST)
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    -- Configuration
    start_date DATE := '2026-01-28';
    end_date DATE := '2026-02-14';
    start_hour TIME := '06:00:00';
    end_hour TIME := '18:00:00';
    interval_minutes INTERVAL := '10 minutes';
    
    -- Variables
    curr_date DATE;
    curr_ts TIMESTAMP;
    target_timestamptz TIMESTAMPTZ;
    club_id BIGINT;
BEGIN
    -- 1. Get Golf Club ID (Use existing or create default)
    SELECT id INTO club_id FROM public.golf_clubs LIMIT 1;
    
    IF club_id IS NULL THEN
        INSERT INTO public.golf_clubs (name, location_name, location_lat, location_lng) 
        VALUES ('Club 72', 'Incheon', 37.456300, 126.705200) 
        RETURNING id INTO club_id;
    END IF;

    -- 2. Loop through Dates
    curr_date := start_date;
    WHILE curr_date <= end_date LOOP
        
        -- 3. Loop through Times (Daily 06:00 ~ 18:00)
        curr_ts := (curr_date || ' ' || start_hour)::TIMESTAMP;
        
        WHILE curr_ts::TIME <= end_hour LOOP
            
            -- Interpret the timestamp as KST ('Asia/Seoul') and convert to UTC for storage
            target_timestamptz := curr_ts AT TIME ZONE 'Asia/Seoul';

            -- Insert if not exists
            IF NOT EXISTS (
                SELECT 1 FROM public.tee_times 
                WHERE golf_club_id = club_id 
                AND tee_off = target_timestamptz
            ) THEN
                INSERT INTO public.tee_times (
                    golf_club_id, 
                    tee_off, 
                    base_price, 
                    status
                ) VALUES (
                    club_id, 
                    target_timestamptz, 
                    150000, -- Base Price
                    'OPEN'
                );
            END IF;

            curr_ts := curr_ts + interval_minutes;
        END LOOP;

        curr_date := curr_date + 1;
    END LOOP;

    RAISE NOTICE 'Tee times generated successfully from % to % for Club ID %', start_date, end_date, club_id;
END $$;
