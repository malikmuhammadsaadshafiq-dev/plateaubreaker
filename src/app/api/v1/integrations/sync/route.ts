import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { prisma } from '@/lib/prisma';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY environment variable required');

const dateRangeSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime()
});

const syncRequestSchema = z.object({
  userId: z.string().uuid(),
  service: z.enum(['apple_health', 'whoop', 'myfitnesspal']),
  dateRange: dateRangeSchema
});

type SyncService = 'apple_health' | 'whoop' | 'myfitnesspal';

interface SyncResult {
  recordsImported: number;
  recordsUpdated: number;
  errors: Array<{ source: string; message: string }>;
}

interface ExternalDailyLog {
  loggedAt: Date;
  weightLb?: number;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  sleepHours?: number;
  sleepQuality?: number;
  stressLevel?: number;
  mealStart?: Date;
  mealEnd?: Date;
  waterMl?: number;
}

function decryptToken(encryptedData: string): string {
  const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) throw new Error('Invalid encrypted token format');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const key = scryptSync(ENCRYPTION_KEY!, 'salt', 32);
  
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function fetchWithExponentialBackoff(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

async function syncAppleHealth(
  userId: string,
  accessToken: string,
  dateRange: { start: string; end: string }
): Promise<SyncResult> {
  const result: SyncResult = { recordsImported: 0, recordsUpdated: 0, errors: [] };
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  
  try {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
    
    const weightResponse = await fetchWithExponentialBackoff(
      `https://api.healthkit.apple.com/v1/records/query?type=BodyMass&startDate=${dateRange.start}&endDate=${dateRange.end}`,
      { headers }
    );
    const weightData = await weightResponse.json();
    
    const sleepResponse = await fetchWithExponentialBackoff(
      `https://api.healthkit.apple.com/v1/records/query?type=SleepAnalysis&startDate=${dateRange.start}&endDate=${dateRange.end}`,
      { headers }
    );
    const sleepData = await sleepResponse.json();
    
    const waterResponse = await fetchWithExponentialBackoff(
      `https://api.healthkit.apple.com/v1/records/query?type=DietaryWater&startDate=${dateRange.start}&endDate=${dateRange.end}`,
      { headers }
    );
    const waterData = await waterResponse.json();
    
    const logsByDate = new Map<string, Partial<ExternalDailyLog>>();
    
    if (weightData.records) {
      for (const record of weightData.records) {
        const date = record.startDate.split('T')[0];
        if (!logsByDate.has(date)) logsByDate.set(date, { loggedAt: new Date(record.startDate) });
        const log = logsByDate.get(date)!;
        log.weightLb = parseFloat(record.quantity);
      }
    }
    
    if (sleepData.records) {
      for (const record of sleepData.records) {
        const date = record.startDate.split('T')[0];
        if (!logsByDate.has(date)) logsByDate.set(date, { loggedAt: new Date(record.startDate) });
        const log = logsByDate.get(date)!;
        const start = new Date(record.startDate).getTime();
        const end = new Date(record.endDate).getTime();
        const hours = (end - start) / (1000 * 60 * 60);
        log.sleepHours = hours;
        
        if (record.value === 'ASLEEP') {
          log.sleepQuality = Math.min(10, Math.max(1, Math.round(hours / 8 * 10)));
        }
      }
    }
    
    if (waterData.records) {
      for (const record of waterData.records) {
        const date = record.startDate.split('T')[0];
        if (!logsByDate.has(date)) logsByDate.set(date, { loggedAt: new Date(record.startDate) });
        const log = logsByDate.get(date)!;
        log.waterMl = (log.waterMl || 0) + Math.round(parseFloat(record.quantity) * 1000);
      }
    }
    
    for (const [dateStr, logData] of logsByDate) {
      const existing = await prisma.dailyLog.findFirst({
        where: {
          user_id: userId,
          logged_at: {
            gte: new Date(dateStr),
            lt: new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });
      
      const data = {
        weight_lb: logData.weightLb,
        sleep_hours: logData.sleepHours,
        sleep_quality: logData.sleepQuality,
        water_ml: logData.waterMl,
        updated_at: new Date()
      };
      
      if (existing) {
        await prisma.dailyLog.update({
          where: { id: existing.id },
          data
        });
        result.recordsUpdated++;
      } else {
        await prisma.dailyLog.create({
          data: {
            id: crypto.randomUUID(),
            user_id: userId,
            logged_at: logData.loggedAt!,
            ...data,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        result.recordsImported++;
      }
    }
  } catch (error) {
    result.errors.push({ source: 'apple_health', message: (error as Error).message });
  }
  
  return result;
}

async function syncWhoop(
  userId: string,
  accessToken: string,
  dateRange: { start: string; end: string }
): Promise<SyncResult> {
  const result: SyncResult = { recordsImported: 0, recordsUpdated: 0, errors: [] };
  
  try {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
    
    const sleepResponse = await fetchWithExponentialBackoff(
      `https://api.whoop.com/v1/activities/sleep?start=${dateRange.start}&end=${dateRange.end}`,
      { headers }
    );
    const sleepData = await sleepResponse.json();
    
    const cycleResponse = await fetchWithExponentialBackoff(
      `https://api.whoop.com/v1/cycles?start=${dateRange.start}&end=${dateRange.end}`,
      { headers }
    );
    const cycleData = await cycleResponse.json();
    
    const logsByDate = new Map<string, Partial<ExternalDailyLog>>();
    
    if (sleepData.records) {
      for (const record of sleepData.records) {
        const date = record.activity.start.split('T')[0];
        if (!logsByDate.has(date)) logsByDate.set(date, { loggedAt: new Date(record.activity.start) });
        const log = logsByDate.get(date)!;
        log.sleepHours = record.activity.total_sleep_duration / 3600;
        log.sleepQuality = Math.round(record.score / 10);
      }
    }
    
    if (cycleData.records) {
      for (const record of cycleData.records) {
        const date = record.day.split('T')[0];
        if (!logsByDate.has(date)) logsByDate.set(date, { loggedAt: new Date(record.day) });
        const log = logsByDate.get(date)!;
        log.stressLevel = Math.min(10, Math.max(1, Math.round(record.strain / 10)));
      }
    }
    
    for (const [dateStr, logData] of logsByDate) {
      const existing = await prisma.dailyLog.findFirst({
        where: {
          user_id: userId,
          logged_at: {
            gte: new Date(dateStr),
            lt: new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });
      
      const data = {
        sleep_hours: logData.sleepHours,
        sleep_quality: logData.sleepQuality,
        stress_level: logData.stressLevel,
        updated_at: new Date()
      };
      
      if (existing) {
        await prisma.dailyLog.update({
          where: { id: existing.id },
          data
        });
        result.recordsUpdated++;
      } else {
        await prisma.dailyLog.create({
          data: {
            id: crypto.randomUUID(),
            user_id: userId,
            logged_at: logData.loggedAt!,
            ...data,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        result.recordsImported++;
      }
    }
  } catch (error) {
    result.errors.push({ source: 'whoop', message: (error as Error).message });
  }
  
  return result;
}

async function syncMyFitnessPal(
  userId: string,
  accessToken: string,
  dateRange: { start: string; end: string }
): Promise<SyncResult> {
  const result: SyncResult = { recordsImported: 0, recordsUpdated: 0, errors: [] };
  
  try {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
    
    const diaryResponse = await fetchWithExponentialBackoff(
      `https://api.myfitnesspal.com/v2/diary?from=${dateRange.start}&to=${dateRange.end}`,
      { headers }
    );
    const diaryData = await diaryResponse.json();
    
    const logsByDate = new Map<string, Partial<ExternalDailyLog>>();
    
    if (diaryData.items) {
      for (const item of diaryData.items) {
        const date = item.date;
        if (!logsByDate.has(date)) {
          logsByDate.set(date, { 
            loggedAt: new Date(date),
            mealStart: item.meals?.[0]?.logged_at ? new