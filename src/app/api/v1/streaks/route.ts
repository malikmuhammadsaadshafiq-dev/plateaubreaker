import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const querySchema = z.object({
  userId: z.string().uuid({ message: "Invalid user ID format" }),
  variable: z.enum(['weight', 'calories', 'protein', 'carbs', 'fat', 'sleep', 'sleep_quality', 'stress', 'meal_timing', 'water']).optional()
});

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function differenceInDays(dateLeft: Date, dateRight: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((startOfDay(dateLeft).getTime() - startOfDay(dateRight).getTime()) / msPerDay);
}

interface StreakMetrics {
  currentStreak: number;
  longestStreak: number;
  densityScore: number;
  lastLogged: Date | null;
  badges: string[];
}

function calculateStreakMetrics(dates: Date[], referenceDate: Date = new Date()): StreakMetrics {
  if (dates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      densityScore: 0,
      lastLogged: null,
      badges: []
    };
  }

  const sortedAsc = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const sortedDesc = [...sortedAsc].reverse();
  
  const lastLogged = sortedDesc[0];
  const firstLogged = sortedAsc[0];
  const today = startOfDay(referenceDate);
  
  let currentStreak = 0;
  const lastLogDay = startOfDay(lastLogged);
  const daysSinceLastLog = differenceInDays(today, lastLogDay);
  
  if (daysSinceLastLog <= 1) {
    currentStreak = 1;
    for (let i = 1; i < sortedDesc.length; i++) {
      const curr = startOfDay(sortedDesc[i]);
      const prev = startOfDay(sortedDesc[i-1]);
      if (differenceInDays(prev, curr) === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }
  
  let longestStreak = 1;
  let currentRun = 1;
  
  for (let i = 1; i < sortedAsc.length; i++) {
    const prev = startOfDay(sortedAsc[i-1]);
    const curr = startOfDay(sortedAsc[i]);
    const diff = differenceInDays(curr, prev);
    
    if (diff === 1) {
      currentRun++;
      longestStreak = Math.max(longestStreak, currentRun);
    } else if (diff > 1) {
      longestStreak = Math.max(longestStreak, currentRun);
      currentRun = 1;
    }
  }
  longestStreak = Math.max(longestStreak, currentRun);
  
  const totalDaysSinceStart = differenceInDays(today, firstLogged) + 1;
  const uniqueDays = new Set(sortedAsc.map(d => startOfDay(d).toISOString())).size;
  const densityScore = Math.min(1, Math.max(0, uniqueDays / totalDaysSinceStart));
  
  const badges: string[] = [];
  if (longestSt