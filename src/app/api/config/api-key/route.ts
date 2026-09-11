import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ProviderFactory } from '@/ai/providers/ProviderFactory';

const ENV_LOCAL_PATH = path.join(process.cwd(), '.env.local');

export async function GET() {
  const envKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  let diskKey = '';

  if (fs.existsSync(ENV_LOCAL_PATH)) {
    try {
      const content = fs.readFileSync(ENV_LOCAL_PATH, 'utf-8');
      const match = content.match(/NEXT_PUBLIC_GEMINI_API_KEY\s*=\s*(.*)/);
      if (match && match[1]) {
        diskKey = match[1].trim();
      }
    } catch {
      // ignore
    }
  }

  const effectiveKey = envKey || diskKey;
  const configured = effectiveKey.length > 0;
  const maskedKey = configured
    ? `${effectiveKey.slice(0, 6)}••••••••${effectiveKey.slice(-4)}`
    : '';

  return NextResponse.json({
    configured,
    maskedKey,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key cannot be empty.' },
        { status: 400 }
      );
    }

    // Update in-memory environment variables immediately
    const nextPublicKey = ['NEXT', 'PUBLIC', 'GEMINI', 'API', 'KEY'].join('_');
    process.env[nextPublicKey] = apiKey;
    process.env['GEMINI_API_KEY'] = apiKey;

    // Reset ProviderFactory so the next request uses the newly configured key
    ProviderFactory.resetAll();

    // Persist into .env.local file
    let content = '';
    if (fs.existsSync(ENV_LOCAL_PATH)) {
      content = fs.readFileSync(ENV_LOCAL_PATH, 'utf-8');
    }

    if (content.includes('NEXT_PUBLIC_GEMINI_API_KEY=')) {
      content = content.replace(
        /NEXT_PUBLIC_GEMINI_API_KEY=.*/g,
        `NEXT_PUBLIC_GEMINI_API_KEY=${apiKey}`
      );
    } else {
      content = `${content.trim()}\nNEXT_PUBLIC_GEMINI_API_KEY=${apiKey}\n`;
    }

    fs.writeFileSync(ENV_LOCAL_PATH, content, 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Gemini API key configured and persisted successfully.',
      maskedKey: `${apiKey.slice(0, 6)}••••••••${apiKey.slice(-4)}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to save Gemini API key' },
      { status: 500 }
    );
  }
}
