import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';

const querySchema = z.object({
  userId: z.string().uuid(),
  minConfidence: z.coerce.number().min(0).max(1).default(0.8),
  limit: z.coerce.number().int().positive().default(10)
});

interface CorrelationRow {
  id: string;
  variable_name: string;
  correlation_type: 'pearson' | 'spearman';
  coefficient: number;
  p_value: number;
  sample_size: number;
  lag_days: number;
  calculated_at: Date;
  date_range_start: Date;
  date_range_end: Date;
}

interface ExistingInsight {
  type: string;
  variables_involved: string[];
  message: string;
}

interface GeneratedInsight {
  id: string;
  type: 'correlation' | 'threshold' | 'lag';
  message: string;
  confidenceScore: number;
  variables: string[];
  supportingData: Record<string, unknown>;
  generatedAt: string;
}

function errorResponse(error: string, code: string, status: number = 400) {
  return NextResponse.json({ error, code }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = querySchema.safeParse({
      userId: searchParams.get('userId'),
      minConfidence: searchParams.get('minConfidence'),
      limit: searchParams.get('limit')
    });

    if (!validation.success) {
      const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return errorResponse(`Validation failed: ${errors}`, 'VALIDATION_ERROR', 400);
    }

    const { userId, minConfidence, limit } = validation.data;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const correlationsResult = await db.query(
      `SELECT id, variable_name, correlation_type, coefficient, p_value, sample_size, lag_days, calculated_at, date_range_start, date_range_end 
       FROM correlation_result 
       WHERE user_id = $1 
       AND p_value < 0.05 
       AND calculated_at >= $2
       ORDER BY ABS(coefficient) DESC`,
      [userId, thirtyDaysAgo.toISOString()]
    );

    const existingInsightsResult = await db.query(
      `SELECT type, variables_involved, message 
       FROM insight 
       WHERE user_id = $1 
       AND dismissed = false`,
      [userId]
    );

    const existingSignatures = new Set(
      existingInsightsResult.rows.map((row: ExistingInsight) => 
        `${row.type}:${[...row.variables_involved].sort().join(',')}:${row.message.substring(0, 60)}`
      )
    );

    const generatedInsights: GeneratedInsight[] = [];

    for (const corr of correlationsResult.rows as CorrelationRow[]) {
      const absCoeff = Math.abs(corr.coefficient);
      let strength: string;
      if (absCoeff >= 0.7) strength = 'Strong';
      else if (absCoeff >= 0.4) strength = 'Moderate';
      else strength = 'Weak';

      const direction = corr.coefficient > 0 ? 'positive' : 'negative';
      const confidenceScore = Math.min(0.99, (1 - corr.p_value) * absCoeff * Math.log10(corr.sample_size + 1) / 2);

      if (confidenceScore < minConfidence) continue;

      let message: string;
      let type: 'correlation' | 'lag';

      if (corr.lag_days > 0) {
        type = 'lag';
        message = `${strength} ${direction} correlation between ${corr.variable_name} and weight velocity with ${corr.lag_days}-day lag (coefficient: ${corr.coefficient.toFixed(3)})`;
      } else {
        type = 'correlation';
        message = `${strength} ${direction} correlation detected between ${corr.variable_name} and weight changes (r=${corr.coefficient.toFixed(3)}, p=${corr.p_value.toFixed(5)})`;
      }

      const signature = `${type}:${[corr.variable_name, 'weight_velocity'].sort().join(',')}:${message.substring(0, 60)}`;
      
      if (!existingSignatures.has(signature)) {
        generatedInsights.push({
          id: uuidv4(),
          type,
          message,
          confidenceScore: parseFloat(confidenceScore.toFixed(3)),
          variables: [corr.variable_name, 'weight_velocity'],
          supportingData: {
            coefficient: corr.coefficient,
            pValue: corr.p_value,
            sampleSize: corr.sample_size,
            lagDays: corr.lag_days,
            correlationType: corr.correlation_type,
            dateRange: {
              start: corr.date_range_start,
              end: corr.date_range_end
            }
          },
          generatedAt: new Date().toISOString()
        });
      }
    }

    const thresholdConfigs = [
      { variable: 'sleep_hours', highThreshold: 8.0, lowThreshold: 6.0, highLabel: '8+ hours', lowLabel: '6 hours', unit: 'hours' },
      { variable: 'stress_level', highThreshold: 7, lowThreshold: 3, highLabel: 'high (7+)', lowLabel: 'low (≤3)', unit: 'level' },
      { variable: 'water_ml', highThreshold: 2500, lowThreshold: 1500, highLabel: '2.5L+', lowLabel: '1.5L', unit: 'ml' }
    ];

    for (const config of thresholdConfigs) {
      const query = `
        WITH ordered_logs AS (
          SELECT 
            logged_at,
            weight_lb,
            ${config.variable},
            LAG(weight_lb) OVER (PARTITION BY user_id ORDER BY logged_at) as prev_weight,
            LEAD(weight_lb) OVER (PARTITION BY user_id ORDER BY logged_at) as next_weight
          FROM daily_log
          WHERE user_id = $1 
          AND logged_at >= $2
          AND weight_lb IS NOT NULL
          ORDER BY logged_at
        ),
        velocity_calc AS (
          SELECT 
            ${config.variable},
            CASE 
              WHEN next_weight IS NOT NULL THEN (next_weight - weight_lb)
              ELSE NULL 
            END as weight_velocity
          FROM ordered_logs
          WHERE next_weight IS NOT NULL
        ),
        grouped_stats AS (
          SELECT 
            CASE 
              WHEN ${config.variable} >= $3 THEN 'high'
              WHEN ${config.variable} <= $4 THEN 'low'
            END as group_name,
            AVG(weight_velocity) as avg_velocity,
            COUNT(*) as sample_count,
            STDDEV(weight_velocity) as stddev_velocity
          FROM velocity_calc
          WHERE ${config.variable} >= $3 OR ${config.variable} <= $4
          GROUP BY 
            CASE 
              WHEN ${config.variable} >= $3 THEN 'high'
              WHEN ${config.variable} <= $4 THEN 'low'
            END
        )
        SELECT * FROM grouped_stats WHERE group_name IS NOT NULL
      `;

      try {
        const thresholdResult = await db.query(query, [
          userId, 
          thirtyDaysAgo.toISOString(), 
          config.highThreshold, 
          config.lowThreshold
        ]);

        const rows = thresholdResult.rows as Array<{
          group_name: string;
          avg_velocity: number;
          sample_count: number;
          stddev_velocity: number | null;
        }>;

        if (rows.length === 2) {
          const highGroup = rows.find(r => r.group_name === 'high');
          const lowGroup = rows.find(r => r.group_name === 'low');

          if (highGroup && lowGroup && highGroup.sample_count >= 3 && lowGroup.sample_count >= 3) {
            const highVelocity = parseFloat(highGroup.avg_velocity.toFixed(3));
            const lowVelocity = parseFloat(lowGroup.avg_velocity.toFixed(3));
            const difference = parseFloat((highVelocity - lowVelocity).toFixed(2));
            const absDiff = Math.abs(difference);

            if (absDiff >= 0.05) {
              const pooledStd = Math.sqrt(
                ((highGroup.sample_count - 1) * (highGroup.stddev_velocity || 0) ** 2 + 
                 (lowGroup.sample_count - 1) * (lowGroup.stddev_velocity || 0) ** 2) / 
                (highGroup.sample_count + lowGroup.sample_count - 2)
              );
              
              const se = pooledStd * Math.sqrt(1/highGroup.sample_count + 1/lowGroup.sample_count);
              const tStat = absDiff / (se || 0.001);
              const confidenceScore = Math.min(0.95, Math.min(tStat / 3, 1) * 0.8 + 0.1);

              if (confidenceScore >= minConfidence) {
                let message: string;
                if (config.variable === 'sleep_hours') {
                  const direction = difference < 0 ? 'drops' : 'increases';
                  message =