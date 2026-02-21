import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash, randomInt } from 'crypto';
import { Pool } from 'pg';
import Queue from 'bull';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const exportQueue = new Queue('csv-exports', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  }
});

const exportSchema = z.object({
  user_id: z.string().uuid(),
  start_date: z.string().datetime().nullable(),
  end_date: z.string().datetime().nullable(),
  fields: z.array(z.enum([
    'weight', 'calories', 'protein', 'carbs', 'fats', 
    'sleep', 'sleep_quality', 'stress', 'water', 'meal_timing'
  ])),
  format: z.enum(['raw', 'interpolated']),
  anonymize: z.boolean()
});

type ExportRequest = z.infer<typeof exportSchema>;

const fieldMapping: Record<string, string> = {
  weight: 'weight_kg',
  calories: 'calories',
  protein: 'protein_g',
  carbs: 'carbs_g',
  fats: 'fats_g',
  sleep: 'sleep_hours',
  sleep_quality: 'sleep_quality',
  stress: 'stress_level',
  water: 'water_ml',
  meal_timing: 'first_meal_at'
};

function sanitizeCSVField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=\+\-\t\r\n@]/.test(str)) {
    return `'${str}`;
  }
  if (str.includes(',') || str.includes('\n') || str.includes('"') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function interpolateLOCF(records: any[], fields: string[]): any[] {
  if (records.length === 0) return [];
  
  const sorted = [...records].sort((a, b) => 
    new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
  );
  
  const startDate = new Date(sorted[0].logged_at);
  const endDate = new Date(sorted[sorted.length - 1].logged_at);
  const result: any[] = [];
  const lastValues: Record<string, any> = {};
  
  const dateMap = new Map<string, any>();
  sorted.forEach(record => {
    const dateKey = new Date(record.logged_at).toISOString().split('T')[0];
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, record);
    }
  });
  
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    const record = dateMap.get(dateKey);
    
    if (record) {
      fields.forEach(field