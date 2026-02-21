import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

const mealTimingSchema = z.object({
  first_meal: z.string().regex(timeRegex, "Time must be in HH:MM format"),
  last_meal: z.string().regex(timeRegex, "Time must be in HH:MM format"),
  eating_window: z.number().int().positive().optional()
});

const sleepSchema = z.object({
  duration: z.number().positive("Sleep duration must be positive"),
  quality: z.number().int().min(1).max(10, "Sleep quality must be 1-10"),
  deep_sleep_percentage: z.number().min(0).max(100, "Percentage must be 0-100")
});

const macrosSchema = z.object({
  protein: z.number().int().positive(),
  carbs: z.number().int().positive(),
  fats: z.number().int().positive()
});

const logEntrySchema = z.object({
  timestamp: z.string().datetime({ message: "Invalid ISO8601 timestamp" }),
  weight: z.number().positive("Weight must be greater than 0"),
  calories: z.number().int().positive("Calories must be positive"),
  macros: macrosSchema,
  sleep: sleepSchema,
  stress_level: z.number().int().min(1).max(10, "Stress level must be 1-10"),
  meal_timing: mealTimingSchema,
  water_intake: z.number().int().positive("Water intake must be positive"),
  notes: z.string().max(1000).optional()
});

function calculateEatingWindow(firstMeal: string, lastMeal: string): number {
  const [firstHour, firstMin] = firstMeal.split(':').map(Number);
  const [lastHour, lastMin] = lastMeal.split(':').map(Number);
  
  let startMinutes = firstHour * 60 + firstMin;
  let endMinutes = lastHour * 60 + lastMin;
  
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  return endMinutes - startMinutes;
}

function calculateMacroRatios(protein: number, carbs: number, fats: number, calories: number) {
  const proteinCals = protein * 4;
  const carbCals = carbs * 4;
  const fatCals = fats * 9;
  
  return {
    protein_percentage: calories > 0 ? parseFloat(((proteinCals / calories) * 100).toFixed(2)) : 0,
    carbs_percentage: calories > 0 ? parseFloat(((carbCals / calories) * 100).toFixed(2)) : 0,
    fats_percentage: calories > 0 ? parseFloat(((fatCals / calories) * 100).toFixed(2)) : 0
  };
}

function detectWeightAnomalies(currentWeight: number, historicalWeights: number[]): string[] {
  const anomalies: string[] = [];
  
  if (historicalWeights.length > 0) {
    const lastWeight = historicalWeights[historicalWeights.length - 1];
    const percentChange = Math.abs(currentWeight - lastWeight) / lastWeight;
    
    if (percentChange > 0.05) {
      anomalies.push(`Daily weight change ${(percentChange * 100).toFixed(1)}% exceeds 5% threshold (${lastWeight.toFixed(2)}kg → ${currentWeight.toFixed(2)}kg)`);
    }
  }
  
  if (historicalWeights.length >= 7) {
    const sorted = [...historicalWeights].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    if (currentWeight < lowerBound || currentWeight > upperBound) {
      anomalies.push(`Weight ${currentWeight.toFixed(2)}kg outside IQR bounds [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}] (IQR: ${iqr.toFixed(2)})`);
    }
  }
  
  return anomalies;
}

async function analyzePlateauStatus(
  client: any, 
  userId: string, 
  currentWeight: number, 
  timestamp: string,
  logId: string
): Promise<string> {
  const lbToKg = 0.453592;
  const maxVariance = lbToKg;
  const breakthroughThreshold = 1.5 * lbToKg;
  
  const activePlateauResult = await client.query(
    `SELECT * FROM plateaus 
     WHERE user_id = $1 AND is_broken = false 
     ORDER BY start_date DESC 
     LIMIT 1`,
    [userId]
  );
  
  if (activePlateauResult.rows.length > 0) {
    const plateau = activePlateauResult.rows[0];
    const plateauWeightsResult = await client.query(
      `SELECT weight_kg FROM daily_logs 
       WHERE user_id = $1 AND logged_at >= $2 AND logged_at <= $3
       ORDER BY logged_at DESC`,
      [userId, plateau.start_date, timestamp]
    );
    
    const weights = plateauWeightsResult.rows.map((r: any) => parseFloat(r.weight_kg));
    if (weights.length > 0) {
      const avgWeight = weights.reduce((a: number, b: number) => a + b, 0) / weights.length;
      const weightDelta = avgWeight - currentWeight;
      
      if (weightDelta >= breakthroughThreshold) {
        const breakthroughId = uuidv4();
        await client.query(
          `UPDATE plateaus 
           SET is_broken = true, 
               breakthrough_id = $1, 
               end_date = CURRENT_DATE,
               duration_days = CURRENT_DATE - start_date
           WHERE id = $2`,
          [breakthroughId, plateau.id]
        );
        
        const contextSnapshot = {
          preceding_days: weights.slice(0, 3),
          breakthrough_weight: currentWeight,
          average_plateau_weight: avgWeight
        };
        
        await client.query(
          `INSERT INTO breakthroughs (
            id, user_id, occurred_at, weight_delta, 
            preceding_plateau_id, context_snapshot, probability_score
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            breakthroughId, 
            userId, 
            timestamp, 
            parseFloat(weightDelta.toFixed(2)), 
            plateau.id, 
            JSON.stringify(contextSnapshot),
            0.85
          ]
        );
        
        return "plateau_broken";
      }
    }
    return "active_plateau";
  }
  
  const recentLogsResult = await client.query(
    `SELECT weight_kg, logged_at::date as log_date 
     FROM daily_logs 
     WHERE user_id = $1 
     AND logged_at >= $2::timestamp - INTERVAL '13 days'
     ORDER BY logged_at DESC`,
    [userId, timestamp]
  );
  
  const dailyWeights = new Map();
  recentLogsResult.rows.forEach((row: any) => {
    const date = row.log_date;
    if (!dailyWeights.has(date)) {
      dailyWeights.set(date, []);
    }
    dailyWeights.get(date).push(parseFloat(row.weight_kg));
  });
  
  const currentDate = timestamp.split('T')[0];
  if (!dailyWeights.has(currentDate)) {
    dailyWeights.set(currentDate, [currentWeight]);
  }
  
  const sortedDates = Array.from(dailyWeights.keys()).sort();
  if (sortedDates.length >= 7) {
    const last7Dates = sortedDates.slice(-7);
    const last7Weights = last7Dates.map((date: any) => {
      const w = dailyWeights.get(date);
      return w.reduce((a: number, b: number) => a + b, 0) / w.length;
    });
    
    const min = Math.min(...last7Weights);
    const max = Math.max(...last7Weights);
    const variance = max - min;
    
    if (variance <= maxVariance) {
      const plateauId = uuidv4();
      const avgWeight = last7Weights.reduce((a: number, b: number) => a + b, 0) / last7Weights.length;
      
      await client.query(
        `INSERT INTO plateaus (
          id, user_id, start_date, end_date, duration_days, 
          avg_weight, variance, is_broken
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          plateauId,
          userId,