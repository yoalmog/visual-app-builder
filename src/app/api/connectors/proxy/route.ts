/**
 * Phase 5: /api/connectors/proxy - Secure API Proxy Route
 *
 * Security principles:
 * - This route is the ONLY place that accesses external APIs on behalf of connectors
 * - All sensitive credentials (keys, tokens) are resolved server-side only
 * - Client sends connector metadata; secrets are never sent from client
 * - All inputs are validated with Zod before use
 * - Rate limiting is enforced per connector per minute
 * - No eval, no arbitrary SQL, no shell execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ─── Input Schema ─────────────────────────────────────────────────────────────

const AuthSchema = z.object({
  type: z.enum(['none', 'api_key', 'bearer', 'basic', 'secret']),
  headerName: z.string().optional(),
  secretName: z.string().optional(),
  // NOTE: actual secrets are NOT accepted from client — only secretName references
}).optional();

const ProxyRequestSchema = z.object({
  connectorId: z.string().min(1).max(128),
  baseUrl: z.string().url().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z.string().min(0).max(2048),
  headers: z.record(z.string(), z.string()).optional().default({}),
  queryParameters: z.record(z.string(), z.string()).optional().default({}),
  body: z.any().optional(),
  authentication: AuthSchema,
  retryCount: z.number().int().min(0).max(3).optional().default(0),
});

// ─── Rate Limiter (In-Memory) ─────────────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(connectorId: string, maxPerMinute = 60): boolean {
  const now = Date.now();
  const key = connectorId;
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= maxPerMinute) return false;
  entry.count++;
  return true;
}

// ─── URL Validation ───────────────────────────────────────────────────────────

const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1', 'metadata.google.internal', '169.254.169.254'];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.some((b) => host === b || host.endsWith(`.${b}`))) return false;
    // Block private IP ranges
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

// ─── Secret Resolution ────────────────────────────────────────────────────────
// In production, resolve from environment variables or secret manager.
// Only predefined env var patterns are resolved — never arbitrary access.

function resolveSecret(secretName: string): string | null {
  if (!secretName || typeof secretName !== 'string') return null;
  // Only allow alphanumeric + underscore secret names mapped to env vars
  if (!/^[A-Z0-9_]{1,64}$/.test(secretName)) return null;
  const val = process.env[`CONNECTOR_SECRET_${secretName}`];
  return val || null;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parseResult = ProxyRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Validation failed', details: parseResult.error.flatten() }, { status: 400 });
  }

  const req = parseResult.data;

  // 2. Rate limit
  if (!checkRateLimit(req.connectorId)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // 3. Construct target URL
  const targetBase = req.baseUrl || '';
  if (!targetBase) {
    return NextResponse.json({ error: 'No baseUrl provided' }, { status: 400 });
  }

  const targetPath = req.path.startsWith('/') ? req.path : `/${req.path}`;
  let targetUrl: string;
  try {
    const url = new URL(targetPath, targetBase);
    // Append query params
    if (req.queryParameters) {
      for (const [k, v] of Object.entries(req.queryParameters)) {
        url.searchParams.set(k, String(v));
      }
    }
    targetUrl = url.toString();
  } catch {
    return NextResponse.json({ error: 'Invalid target URL construction' }, { status: 400 });
  }

  if (!isAllowedUrl(targetUrl)) {
    return NextResponse.json({ error: 'Target URL is not allowed (blocked host or invalid scheme)' }, { status: 403 });
  }

  // 4. Build headers
  const outHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'VisualAppBuilder/5.0',
    ...(req.headers || {}),
  };

  // 5. Resolve authentication
  if (req.authentication) {
    const auth = req.authentication;
    if (auth.type === 'bearer' && auth.secretName) {
      const token = resolveSecret(auth.secretName);
      if (token) outHeaders['Authorization'] = `Bearer ${token}`;
    } else if (auth.type === 'api_key' && auth.headerName && auth.secretName) {
      const key = resolveSecret(auth.secretName);
      if (key) outHeaders[auth.headerName] = key;
    } else if (auth.type === 'basic' && auth.secretName) {
      const creds = resolveSecret(auth.secretName);
      if (creds) outHeaders['Authorization'] = `Basic ${Buffer.from(creds).toString('base64')}`;
    }
  }

  // 6. Execute request with retries
  const maxAttempts = (req.retryCount || 0) + 1;
  let lastError: string = 'Unknown error';
  let lastStatus = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 200));
    }

    try {
      const fetchOptions: RequestInit = {
        method: req.method,
        headers: outHeaders,
        signal: AbortSignal.timeout(15_000), // 15s timeout
      };

      if (req.method !== 'GET' && req.method !== 'DELETE' && req.body !== undefined) {
        fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }

      const upstream = await fetch(targetUrl, fetchOptions);
      lastStatus = upstream.status;

      // Don't retry on client errors
      if (upstream.status >= 400 && upstream.status < 500) {
        const errText = await upstream.text().catch(() => '');
        return NextResponse.json(
          { error: errText || `Upstream error ${upstream.status}`, status: upstream.status },
          { status: upstream.status }
        );
      }

      if (!upstream.ok) {
        lastError = `Upstream returned ${upstream.status}`;
        continue; // retry on 5xx
      }

      // Success — forward response
      const contentType = upstream.headers.get('content-type') || '';
      let responseData: any;
      if (contentType.includes('application/json')) {
        responseData = await upstream.json();
      } else {
        responseData = await upstream.text();
      }

      return NextResponse.json(responseData, { status: upstream.status });
    } catch (err: any) {
      lastError = err.message || 'Fetch error';
      if (attempt >= maxAttempts - 1) break;
    }
  }

  return NextResponse.json({ error: lastError, status: lastStatus || 500 }, { status: 502 });
}

export const runtime = 'nodejs';
