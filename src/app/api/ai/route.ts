// Server-side secure AI API route
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ProviderFactory } from '@/ai/providers/ProviderFactory';
import { AISecretFilter } from '@/ai/security/AISecretFilter';
import { PromptInjectionDefense } from '@/ai/security/PromptInjectionDefense';

const RequestSchema = z.object({
  prompt: z.string().min(1),
  mode: z.enum(['ask', 'generate', 'edit', 'debug', 'agent']).optional(),
  context: z.record(z.string(), z.any()).optional(),
  images: z
    .array(
      z.object({
        url: z.string().optional(),
        base64: z.string().optional(),
        mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
      })
    )
    .optional(),
});

// Simple sliding window rate-limiter per IP (max 30 requests per minute)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const rateData = rateLimitMap.get(ip) || { count: 0, resetTime: now + 60000 };

    if (now > rateData.resetTime) {
      rateData.count = 0;
      rateData.resetTime = now + 60000;
    }

    if (rateData.count >= 30) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 30 requests per minute.' },
        { status: 429 }
      );
    }
    rateData.count++;
    rateLimitMap.set(ip, rateData);

    const body = await req.json();
    const parseResult = RequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: parseResult.error.format() },
        { status: 400 }
      );
    }


    const { prompt, mode, context, images } = parseResult.data;

    // Prompt injection check
    const injectionCheck = PromptInjectionDefense.sanitizeInstruction(prompt);
    if (!injectionCheck.safe) {
      return NextResponse.json(
        { error: 'Suspicious instruction pattern detected.', flaggedReason: injectionCheck.flaggedReason },
        { status: 400 }
      );
    }

    // Redact any secrets from input context before processing
    const redactedContext = AISecretFilter.redactObject(context);

    const provider = ProviderFactory.getProvider('mock');
    const response = await provider.generate({
      id: `srv_${Date.now()}`,
      prompt: injectionCheck.sanitized,
      mode,
      context: redactedContext,
      images,
    });

    // Ensure output is free of secrets
    const redactedResponse = AISecretFilter.redactObject(response);

    return NextResponse.json(redactedResponse);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Server error processing AI request' },
      { status: 500 }
    );
  }
}
