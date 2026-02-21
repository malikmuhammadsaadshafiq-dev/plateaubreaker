import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@vercel/postgres';

const requestSchema = z.object({
  userId: z.string().uuid(),
  primaryVariable: z.literal('weight'),
  secondaryVariables: z.tuple([z.string(), z.string()]),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  lagConfig: z.object({
    var1: z.number().int().min(0).max(30),
    var2: z.number().int().min(0).max(30),
  }),
  smoothing: z.enum(['none', 'ma3', 'ma7']),
});

const VALID_VARIABLES = [
  'weight',
  'calories',
  'protein',
  'carbs',
  'fat',
  'sleep_hours',
  'sleep_quality',
  'stress_level',
  'water'
] as const;

const DB_COLUMN_MAP: Record<string, string> = {
  weight: 'weight_lb',
  calories: 'calories',
  protein: 'protein_g',
  carbs: 'carbs_g',
  fat: 'fat_g',
  sleep_hours: 'sleep_hours',
  sleep_quality: 'sleep_quality',
  stress_level: 'stress_level',
  water: 'water_ml',
};

type TimeSeriesPoint = {
  date: string;
  weight: number | null;
  var1: number | null;
  var2: number | null;
};

function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n !== y.length || n === 0) return 0;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function applyMovingAverage(data: (number | null)[], window: number): (number | null)[] {
  if (window === 1) return data;
  const result: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(null);
      continue;
    }
    
    let sum = 0;
    let count = 0;
    for (let j = 0; j < window; j++) {
      const val = data[i - j];
      if (val !== null && !isNaN(val)) {
        sum += val;
        count++;
      }
    }
    result.push(count > 0 ? sum / count : null);
  }
  return result;
}

function normalizeToScale(data: (number | null)[]): (number | null)[] {
  const validValues = data.filter((v): v is number => v !== null && !isNaN(v));
  if (validValues.length === 0) return data;
  
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  const range = max - min;
  
  if (range === 0) {