import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const requestSchema = z.object({
  user_id: z.string().uuid(),
  threshold_lb: z.coerce.number().positive().default(1.5),
  lookback_days: z.coerce.number().int().positive().default(30)
});

const LB_TO_KG = 0.453592;
const KG_TO_LB = 2.20462;
const WATER_WEIGHT_THRESHOLD_KG = 0.5;

interface DailyLog {
  logged_at: Date;
  weight_kg: number;
  calories: number | null;
  sleep_hours: number | null;
}

interface HistoricalBreakthrough {
  context_snapshot: {
    avg_sleep?: number;
    avg_calories?: number;
  } | null;
}

function calculateRollingAverages(weights: number[], window: number): number[] {
  const averages: number[] = [];
  for (let i = window - 1; i < weights.length; i++) {
    let sum = 0;
    for (let j = 0; j < window; j++) {
      sum += weights[i - j];
    }
    averages.push(sum / window);
  }
  return averages;
}

function findPrecedingPlateau(
  logs: DailyLog[], 
  breakthroughIndex: number, 
  varianceThresholdKg: number
): { duration: number; startIndex: number } | null {
  if (breakthroughIndex < 7) return null;
  
  let plateauStart = breakthroughIndex - 1;
  let minWeight = logs[plateauStart].weight_kg;
  let maxWeight = logs[plateauStart].weight_kg;
  
  for (let i = breakthroughIndex - 2; i >= 0; i--) {
    const weight = logs[i].weight_kg;
    const newMin = Math.min(minWeight, weight);
    const newMax = Math.max(maxWeight, weight);
    
    if ((newMax - newMin) <= varianceThresholdKg) {
      minWeight = newMin;
      maxWeight = newMax;
      plateauStart = i;
    } else {
      break;
    }
  }
  
  const duration = breakthroughIndex - plateauStart;
  if (duration < 7) return null;
  
  return { duration, startIndex: plateauStart };
}

function isFalsePositive(
  logs: DailyLog[], 
  breakthroughIndex: number, 
  baselineWeight: number
): boolean {
  const checkDays = 2;
  const endCheck = Math.min(logs.length, breakthroughIndex + checkDays + 1);
  
  for (let i = breakthroughIndex + 1; i < endCheck; i++) {
    if (Math.abs(logs[i].weight_kg - baselineWeight) < WATER_WEIGHT_THRESHOLD_KG) {
      return true;
    }
  }
  return false;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, threshold_lb, lookback_days } = requestSchema.parse(body);
    
    const thresholdKg = threshold_lb * LB_TO_KG;
    const varianceThresholdKg = 0.2 * LB_TO_KG;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - lookback_days - 10);
    
    const logsQuery = `
      SELECT logged_at, weight_kg, calories, sleep_hours
      FROM daily_logs
      WHERE user_id = $1 
        AND logged_at >= $2 
        AND logged_at <= $3
        AND weight_kg IS NOT NULL
      ORDER BY logged_at ASC
    `;
    
    const logsResult = await db.query(logsQuery, [user_id, startDate, endDate]);
    const logs: DailyLog[] = logsResult.rows;
    
    if (logs.length < 10) {
      return NextResponse.json(
        { error: 'Insufficient data for breakthrough analysis', code: 'INSUFFICIENT_DATA' },
        { status: 400 }
      );
    }
    
    const weights = logs.map(l => l.weight_kg);
    const rollingAvgs = calculateRollingAverages(weights, 3);
    
    const historicalQuery = `
      SELECT context_snapshot
      FROM breakthroughs
      WHERE user_id = $1
    `;
    const historicalResult = await db.query(historicalQuery, [user_id]);
    const historicalBreakthroughs: HistoricalBreakthrough[] = historicalResult.rows;
    
    const breakthroughs = [];
    
    for (let i = 3; i < logs.length; i++) {
      const currentWeight = logs[i].weight_kg;
      const prevRollingAvg = rollingAvgs[i - 3];
      const deltaKg = currentWeight - prevRollingAvg;
      
      if (deltaKg <= -thresholdKg) {
        if (isFalsePositive(logs, i, prevRollingAvg)) {
          continue;
        }
        
        const plateau = findPrecedingPlateau(logs, i, varianceThresholdKg);
        const contextStart = Math.max(0, i - 3);
        const contextLogs = logs.slice(contextStart, i);
        
        const avgSleep = contextLogs.length > 0 
          ? contextLogs.reduce((sum, l) => sum + (l.sleep_hours || 0), 0) / contextLogs.length 
          : 0;
          
        const avgCalories = contextLogs.length > 0 
          ? contextLogs.reduce((sum, l) => sum + (l.calories || 0), 0) / contextLogs.length 
          : 0;
        
        let probability = 0.1;
        
        if (historicalBreakthroughs.length > 0) {
          const similarContexts = historicalBreakthroughs.filter(hb => {
            if (!hb.context_snapshot) return false;
            const snap = hb.context_snapshot;
            const sleepDiff = Math.abs((snap.avg_sleep || 0) - avgSleep);
            const calDiff = Math.abs((snap.avg_calories || 0) - avgCalories) / (avgCalories || 1);
            return sleepDiff < 1.0 && calDiff < 0.15;
          });
          
          probability = (similarContexts.length + 1) / (historicalBreakthroughs.length + 2);
          
          if (plateau && plateau.duration > 14) {
            probability = Math.min(0.95, probability * 1.3);
          }
        }