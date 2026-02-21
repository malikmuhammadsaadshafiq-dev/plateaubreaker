export enum InsightType {
  CORRELATION = 'correlation',
  PLATEAU_WARNING = 'plateau_warning',
  BREAKTHROUGH_PATTERN = 'breakthrough_pattern',
  COMPLIANCE_REMINDER = 'compliance_reminder',
  TREND_ANOMALY = 'trend_anomaly',
  OPTIMIZATION_SUGGESTION = 'optimization_suggestion'
}

export enum WebhookService {
  APPLE_HEALTH = 'apple_health',
  MYFITNESSPAL = 'myfitnesspal',
  WHOOP = 'whoop',
  SENDGRID = 'sendgrid',
  AWS_S3 = 'aws_s3'
}

export interface StatsConfig {
  analysis_preferences?: {
    correlation_threshold?: number;
    plateau_window_days?: number;
    breakthrough_drop_threshold?: number;
    notification_frequency?: 'daily' | 'weekly' | 'breakthrough_only';
    timezone?: string;
  };
  [key: string]: unknown;
}

export interface ContextSnapshot {
  weight_kg?: number;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fats_g?: number;
  sleep_hours?: number;
  sleep_quality?: number;
  stress_level?: number;
  water_ml?: number;
  first_meal_at?: string;
  last_meal_at?: string;
  days_prior?: number;
  [key: string]: unknown;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  timezone: string;
  created_at: Date;
  stats_config: StatsConfig;
  api_key: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  logged_at: Date;
  weight_kg: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  sleep_hours: number;
  sleep_quality: number;
  stress_level: number;
  first_meal_at: string;
  last_meal_at: string;
  water_ml: number;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface Plateau {
  id: string;
  user_id: string;
  start_date: Date;
  end_date: Date;
  duration_days: number;
  avg_weight: number;
  variance: number;
  is_broken: boolean;
  breakthrough_id: string | null;
}

export interface Breakthrough {
  id: string;
  user_id: string;
  occurred_at: Date;
  weight_delta
}
