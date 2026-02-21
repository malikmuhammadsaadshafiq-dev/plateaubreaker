import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';

const JWKS_URL = process.env.JWKS_URL || '';
const AUDIENCE = process.env.JWT_AUDIENCE || 'plateau-breaker-api';

const detectSchema = z.object({
  userId: z.string().uuid(),
  windowSize: z.number().int().min(3).max(60).default(7),
  varianceThreshold: z.number().min(0.1).max(20).default(1.0)
});

interface DailyWeight {
  date: string;
  weight: number;
}

interface PlateauResult {
  plateausDetected: number;
  activePlateau: {
    id: string;
    startDate: string;
    durationDays: number;
    avgWeight: number;
    variance: number;
  } | null;
  historicalPlateaus: Array<{
    id: string;
    startDate: string;
    endDate?: string;
    duration