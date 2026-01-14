import { calculateDynamicPrice, PricingContext, PricingResult } from '../utils/pricingEngine';

function printScenario(title: string, ctx: PricingContext) {
  const result: PricingResult = calculateDynamicPrice(ctx);
  
  console.log(`\n--- [시나리오: ${title}] ---`);
  console.log(`상황: ${ctx.teeOff.toLocaleString()} (예약: ${ctx.bookingTime.toLocaleString()})`);
  console.log(`날씨: ${ctx.weather.sky}, 기온 ${ctx.weather.temperature}도, 비 ${ctx.weather.rainProb}%, 바람 ${ctx.weather.windSpeed}m/s`);
  console.log(`고객: ${ctx.segment || 'Base'}`);
  console.log('------------------------------------------------');
  console.log(`💰 Base Price : ${result.basePrice.toLocaleString()}원`);
  console.log(`🏷️ Final Price: ${result.finalPrice.toLocaleString()}원`);
  console.log(`📝 Reasons    : ${result.reasons.join(', ') || '없음'}`);
  console.log('--- 상세 적용 규칙 ---');
  result.appliedRules.forEach(r => {
    console.log(`   [${r.layer}] ${r.description}: ${r.amount.toLocaleString()}원 (${(r.factor).toFixed(2)})`);
  });
}

const today = new Date();
const nextWeekend = new Date(today); 
nextWeekend.setDate(today.getDate() + (6 - today.getDay() + 7) % 7);
nextWeekend.setHours(12, 0, 0, 0);

const ctx1: PricingContext = {
  teeOff: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 10, 0),
  bookingTime: today,
  weather: { sky: '비', temperature: 18, rainProb: 80, windSpeed: 5 },
  segment: 'VIP'
};

const ctx2: PricingContext = {
  teeOff: nextWeekend,
  bookingTime: new Date(nextWeekend.getTime() - 1000 * 60 * 60 * 10),
  weather: { sky: '맑음', temperature: 25, rainProb: 0, windSpeed: 2 },
  segment: 'Base'
};

const ctx3: PricingContext = {
  teeOff: new Date(today.getFullYear(), 7, 15, 14, 0),
  bookingTime: new Date(today.getFullYear(), 7, 15, 8, 0),
  weather: { sky: '해', temperature: 35, rainProb: 10, windSpeed: 1 },
  segment: 'Smart'
};

console.log('⛳️ TUGOL Pricing Engine Simulation');
printScenario('비오는 평일 VIP', ctx1);
printScenario('주말 Premium 임박티', ctx2);
printScenario('혹서기 성수기 평일 임박', ctx3);
