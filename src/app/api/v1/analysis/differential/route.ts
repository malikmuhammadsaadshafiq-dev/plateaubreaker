import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { 
  ssl: { rejectUnauthorized: false },
  max: 10 
});

const requestSchema = z.object({
  userId: z.string().uuid(),
  plateauId: z.string().uuid(),
  breakthroughId: z.string().uuid(),
  variables: z.array(z.string()).optional()
});

const VALID_VARIABLES = [
  'weight_lb', 'calories', 'protein_g', 'carbs_g', 'fat_g', 
  'sleep_hours', 'sleep_quality', 'stress_level', 'water_ml', 'meal_timing'
] as const;

type ValidVariable = typeof VALID_VARIABLES[number];

interface DailyLogRow {
  weight_lb: number | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  sleep_hours: number | null;
  sleep_quality: number | null;
  stress_level: number | null;
  water_ml: number | null;
  meal_start: Date | null;
  meal_end: Date | null;
  logged_at: Date;
}

interface PlateauRow {
  id: string;
  user_id: string;
  start_date: Date;
  end_date: Date | null;
  duration_days: number;
}

interface BreakthroughRow {
  id: string;
  user_id: string;
  plateau_id: string;
  breakthrough_date: Date;
}

function logGamma(x: number): number {
  if (x < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  const p = [
    676.5203681218851, -125.139398722822, 771.323428777653, 
    -176.6150291621, 12.507343278687, -0.138571095265, 
    9.984369578019e-6, 1.505632735149e-7
  ];
  let y = x;
  let sum = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) {
    sum += p[i] / (y + i);
  }
  const t = y + p.length - 0.5;
  return Math.log(Math.sqrt(2 * Math.PI)) + Math.log(sum) - t + (t - 0.5) * Math.log(t);
}

function incompleteBetaContinuedFraction(x: number, a: number, b: number): number {
  const maxIterations = 200;
  const epsilon = 3e-14;
  let am = 1;
  let bm = 1;
  let az = 1;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let bz = 1 - qab * x / qap;
  
  for (let m = 1; m <= maxIterations; m++) {
    const m2 = 2 * m;
    let d = m * (b - m) * x / ((qam + m2) * (a + m2));
    let ap = az + d * am;
    let bp = bz + d * bm;
    d = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    let app = ap + d * az;
    let bpp = bp + d * bz;
    const aold = az;
    am = ap / bpp;
    bm = bp / bpp;
    az = app / bpp;
    bz = 1;
    if (Math.abs(az - aold) < epsilon * Math.abs(az)) break;
  }
  return az;
}

function incompleteBeta(x: number, a: number, b: number): number {
  if (x < 0 || x > 1) return 0;
  if (x === 0 || x === 1) return x;
  if (a <= 0 || b <= 0) return 0;
  
  const lnbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const bt = Math.exp(lnbeta - a * Math.log(x) - b * Math.log(1 - x));
  
  let result;
  if (x < (a + 1) / (a + b + 2)) {
    result = bt * incompleteBetaContinuedFraction(x, a, b) / a;
  } else {
    result = 1 - bt * incompleteBetaContinuedFraction(1 - x, b, a) / b;
  }
  return Math.max(0, Math.min(1, result));
}

function tDistributionCDF(t: number, df: number): number {
  if (df <= 0) return 0;
  const x = df / (df + t * t);
  const a = df / 2;
  const b = 0.5;
  const ib = incompleteBeta(x, a, b);
  return t >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

function calculateMean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calculateStdDev(arr: number[], mean: number): number {
  if (arr.length < 2) return 0;
  const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function welchTTest(mean1: number, mean2: number, var1: number, var2: number, n1: number, n2: number) {
  const se1 = var1 / n1;
  const se2 = var2 / n2;
  const sed = Math.sqrt(se1 + se2);
  if (sed === 0) return { t: 0, df: 1 };
  
  const t = (mean1 - mean2) / sed;
  const numerator = Math.pow(se1 + se2, 2);
  const denominator = (se1 * se1) / (n1 - 1) + (se2 * se2) / (n2 - 1);
  const df = denominator === 0 ? 1 : numerator / denominator;
  
  return { t, df: Math.max(1, df) };
}

function cohensD(mean1: number, mean2: number, sd1: number, sd2: number, n1: number, n2: number): number {
  if (n1 + n2 < 2) return 0;
  const pooledVar = ((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2);
  const pooledSd = Math.sqrt(pooledVar);
  return pooledSd === 0 ? 0 : (mean1 - mean2) / pooledSd;
}

function calculatePValue(t: number, df: number): number {
  const cdf = tDistributionCDF(Math.abs(t), df);
  return 2 * (1 - cdf);
}

function extractVariableValue(log: DailyLogRow, variable: ValidVariable): number | null {
  if (variable === 'meal_timing') {
    if (log.meal_start && log.meal_end) {
      const start = new Date(log.meal_start).getTime();
      const end = new Date(log.meal_end).getTime();
      const hours = (end - start) / (1000 * 60 * 60);
      return hours > 0 && hours < 24 ? hours : null;
    }
    return null;
  }
  const val = log[variable as keyof DailyLogRow];
  return typeof val === 'number' ? val : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = requestSchema.parse(body);
    
    const [plateau] = await sql<PlateauRow[]>`
      SELECT * FROM plateau 
      WHERE id = ${validated.plateauId} 
      AND user_id = ${validated.userId}
    `;
    
    if (!plateau) {
      return NextResponse.json(
        { error: 'Plateau not found or access denied', code: 'RESOURCE_NOT_FOUND' },
        { status: 404 }
      );
    }
    
    const [breakthrough] = await sql<BreakthroughRow[]>`
      SELECT * FROM breakthrough 
      WHERE id = ${validated.breakthrough