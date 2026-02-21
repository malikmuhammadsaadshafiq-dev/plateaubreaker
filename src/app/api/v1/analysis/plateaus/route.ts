import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@vercel/postgres';

const LB_TO_KG = 0.453592;
const SPIKE_THRESHOLD_KG = 2 * LB_TO_KG; // 0.907kg
const BREAKTHROUGH_THRESHOLD_KG = 1.5 * LB_TO_KG; // 0.680kg

interface WeightLog {
  date: Date;
  weight: number;
}

interface PlateauSegment {
  startDate: Date;
  endDate: Date;
  durationDays: number;
  averageWeight: number;
  variance: number;
  confidence: number;
  breakthroughDate: Date | null;
}

const querySchema = z.object({
  user_id: z.string().uuid(),
  window_days: z.coerce.number().int().min(3).max(30).default