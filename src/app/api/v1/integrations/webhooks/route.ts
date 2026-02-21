import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { verify } from 'jsonwebtoken';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const inputSchema = z.object({
  user_id: z.string().uuid(),
  service: z.enum(['apple_health', 'myfitnesspal', 'whoop']),
  endpoint_url: z.string().regex(/^https:\/\/[a-zA-Z0-9][-a-zA-Z0-9]*[a-zA-Z0-9]*\.[a-zA-Z0-9][-a-zA-Z0-9]*[a-zA-Z0-9]*.*$/, 'Must be valid HTTPS URL'),
  auth_token: z.string().min(1),
  events: z.array(z.enum(['daily_log_created', 'plateau_detected', 'breakthrough_achieved'])).min(1),
  active: z.boolean()
});

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || Buffer.from(ENCRYPTION_KEY, 'hex').length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes) for AES-256');
}

function encryptAES256(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function generateSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

async function verifyEndpointWithRetry(
  url: string, 
  secret: string
): Promise<{ success: boolean; challenge: string; attempts: number }> {
  const challenge = crypto.randomBytes(16).toString('hex');
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': secret,
          'X-PlateauBreaker-Event': 'verification',
          'User-Agent': 'PlateauBreaker-Webhook/1.0'
        },
        body: JSON.stringify({
          challenge,
          type: 'url_verification',
          timestamp: new Date().toISOString()
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.challenge === challenge) {
          return { success: true, challenge, attempts: attempt + 1 };
        }
      }
      
      if (attempt < maxRetries - 1) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    } catch (error) {
      if (attempt < maxRetries - 1) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }
  
  return { success: false, challenge, attempts: maxRetries };
}

function formatServicePayload(service: string) {
  const timestamp = new Date().toISOString();
  const base = { timestamp, event: 'test', webhook_id: 'test-webhook-id' };
  
  switch (service) {
    case 'apple_health':
      return {
        ...base,
        data: {
          samples: [
            {
              type: 'HKQuantityTypeIdentifierBodyMass',
              quantity: 70.5