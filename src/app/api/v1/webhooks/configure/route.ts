import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { Pool } from 'pg';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
}

const WHOOP_CLIENT_ID = process.env.WHOOP_CLIENT_ID;
const WHOOP_CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET;

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const syncQueue = new Queue('webhook-sync', { connection: redis });

const configureSchema = z.object({
  userId: z.string().uuid(),
  service: z.enum(['apple_health', 'myfitnesspal', 'whoop']),
  credentials: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.string().datetime()
  }),
  syncSettings: z.object({
    frequency: z.enum(['hourly', 'daily']),
    dataTypes: z.array(z.string()),
    direction: z.enum(['import', 'export', 'bidirectional'])
  })
});

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY!, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

async function validateAppleHealthToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.healthkit.apple.com/v1/me', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

async function validateMyFitnessPalToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.myfitnesspal.com/v2/user', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

async function exchangeWhoopCode(code: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: string } | null> {
  try {
    const response = await fetch('https://api.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: WHOOP_CLIENT_ID!,
        client_secret: WHOOP_CLIENT_SECRET!
      })
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: expiresAt.toISOString()
    };
  } catch {
    return null;
  }
}

async function validateWhoopToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.whoop.com/v1/user', {
      headers { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = configureSchema.parse(body);
    const { userId, service, credentials, syncSettings } = validated;
    
    let accessToken = credentials.accessToken;
    let refreshToken = credentials.refreshToken;
    let expiresAt = credentials.expiresAt;
    let status: 'active' | 'pending_validation' = 'pending_validation';
    
    if (service === 'apple_health') {
      const isValid = await validateAppleHealthToken(accessToken);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid Apple HealthKit token provided', code: 'INVALID_CREDENTIALS' },
          { status: 400 }
        );
      }
      status = 'active';
    } else if (service === 'myfitnesspal') {
      const isValid = await validateMyFitnessPalToken(accessToken);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid MyFitnessPal token provided', code: 'INVALID_CREDENTIALS' },
          { status: 400 }
        );
      }
      status = 'active';
    } else if (service === 'whoop') {
      const exchanged = await exchangeWhoopCode(accessToken);
      if (!exchanged) {
        return NextResponse.json(
          { error: 'Failed to exchange Whoop authorization code', code: 'OAUTH_EXCHANGE_FAILED' },
          { status: 400 }
        );
      }
      accessToken = exchanged.accessToken;
      refreshToken = exchanged.refreshToken;
      expiresAt = exchanged.expiresAt;
      
      const isValid = await validateWhoopToken(accessToken);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Exchanged Whoop token is invalid', code: 'INVALID_TOKEN' },
          { status: 400 }
        );
      }
      status = 'active';
    }
    
    const encryptedAccess = encrypt(accessToken);
    const encryptedRefresh = encrypt(refreshToken);
    const webhookId = crypto.randomUUID();
    const now = new Date();
    
    const nextSync = new Date(now);
    if (syncSettings.frequency === 'hourly') {
      nextSync.setHours(nextSync.getHours() + 1);
    } else {
      nextSync.setDate(nextSync.getDate() + 1);
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const upsertQuery = `
        INSERT INTO webhook_config (
          id, user_id, service_type, access_token_encrypted, refresh_token_encrypted,
          token_expires_at, sync_frequency, last_sync_at, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (user_id, service_type) DO UPDATE SET
          access_token_encrypted = EXCLUDED.access_token_encrypted,
          refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
          token_expires_at = EXCLUDED.token_expires_at,
          sync_frequency = EXCLUDED.sync_frequency,
          is_active = EXCLUDED.is_active,
          last_sync_at = EXCLUDED.last_sync_at
        RETURNING id
      `;
      
      const values = [
        webhookId,
        userId,
        service,
        encryptedAccess,
        encryptedRefresh,
        expiresAt,
        syncSettings.frequency,
        now,
        true,
        now
      ];
      
      const result = await client.query(upsertQuery, values);
      const configId = result.rows[0].id;
      
      await client.query('COMMIT');
      
      await syncQueue.add(
        'initial-sync',
        {
          webhookId: configId,
          userId,
          service,
          dataTypes: syncSettings.dataTypes,
          direction: syncSettings.direction
        },
        {
          delay: 5000,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        }
      );
      
      return NextResponse.json({
        success: true,
        data: {
          webhookId: configId,
          status,
          nextSync: nextSync.toISOString()
        }
      });
      
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json(
        { error: `Validation error: ${messages}`, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    console.error('Webhook configuration error:', error);
    return NextResponse.json(
      { error: 'Failed to configure webhook integration', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}