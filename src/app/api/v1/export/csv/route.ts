import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Pool } from 'pg';

const querySchema = z.object({
  userId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  includeCorrelations: z.enum(['true', 'false']).transform((val) => val === 'true').default('false'),
});

interface DailyLogRow {
  id: string;
  user_id: string;
  logged_at: string;
  weight_lb: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sleep_hours: number;
  sleep_quality: number;
  stress_level: number;
  meal_start: string;
  meal_end: string;
  water_ml: number;
  created_at: string;
  prev_weight: number | null;
  meal_window_hours: number;
}

interface PlateauRow {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string | null;
  duration_days: number;
  avg_weight: number;
  variance_lb: number;
  is_active: boolean;
  detected_at: string;
}

interface BreakthroughRow {
  id: string;
  user_id: string;
  plateau_id: string;
  breakthrough_date: string;
  weight_drop_lb: number;
  previous_weight: number;
  new_weight: number;
  trigger_factors: string[];
  forensic_analysis: Record<string, any>;
}

interface CorrelationRow {
  id: string;
  user_id: string;
  variable_name: string;
  correlation_type: 'pearson' | 'spearman';
  coefficient: number;
  p_value: number;
  sample_size: number;
  lag_days: number;
  calculated_at: string;
  date_range_start: string;
  date_range_end: string;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_EXPORT_BUCKET || 'plateaubreaker-exports';

function escapeCSV(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCSV(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCSV).join(',');
  const dataLines = rows.map(row => row.map(escapeCSV).join(','));
  return [headerLine, ...dataLines].join('\n');
}

function extractUserIdFromToken(authHeader: string): string