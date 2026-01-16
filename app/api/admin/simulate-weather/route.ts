import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function generateRandomWeather() {
  const rand = Math.random();
  
  if (rand < 0.2) {
    // 20% Heavy Rain
    return {
      sky: 'RAIN',
      temperature: 15 + Math.floor(Math.random() * 5),
      rainProb: 80 + Math.floor(Math.random() * 20),
      windSpeed: 5 + Math.floor(Math.random() * 5)
    };
  } else if (rand < 0.4) {
    // 20% Cloudy/Light Rain
    return {
      sky: 'CLOUDY',
      temperature: 18 + Math.floor(Math.random() * 5),
      rainProb: 40 + Math.floor(Math.random() * 30),
      windSpeed: 2 + Math.floor(Math.random() * 3)
    };
  } else {
    // 60% Clear
    return {
      sky: 'CLEAR',
      temperature: 22 + Math.floor(Math.random() * 8),
      rainProb: Math.floor(Math.random() * 20),
      windSpeed: 1 + Math.floor(Math.random() * 3)
    };
  }
}

export async function POST() {
  try {
    const { data: teeTimes, error: fetchError } = await supabase
      .from('tee_times')
      .select('id')
      .eq('status', 'OPEN');

    if (fetchError) throw fetchError;

    let updatedCount = 0;

    // Update each tee time with random weather
    for (const t of (teeTimes as any[]) || []) {
      const weather = generateRandomWeather();

      const { error } = await (supabase as any)
        .from('tee_times')
        .update({ weather_condition: weather })
        .eq('id', t.id);

      if (!error) updatedCount++;
    }

    return NextResponse.json({
      message: 'Weather simulation completed',
      updatedCount,
      totalCount: teeTimes?.length
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
