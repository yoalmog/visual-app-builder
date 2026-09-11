// Gemini AI Provider — Real LLM integration using @google/genai
import { GoogleGenAI } from '@google/genai';
import { AIProvider, AIRequest, AIResponse, AICostEstimate, AIStreamCallbacks } from '../core/AIProvider';
import { AIError } from '../core/AIError';

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert visual application builder AI assistant.
The user is working inside a no-code/low-code visual builder and wants to build real applications.

Your job is to understand the user's request and respond with a JSON object that describes EXACTLY what to build.

AVAILABLE OPERATION TYPES:
- create_page: { pageId, name, slug }
- add_component: { pageId, parentId, node: { id, type, name, props, styles, children } }
- update_component: { pageId, nodeId, props?, styles? }
- create_collection: { collectionId, name, fields: [{ id, name, type, required }] }
- create_workflow: { workflow: { id, name, nodes, edges } }
- update_theme: { theme: { primaryColor, backgroundColor, textColor, borderRadius, colors } }

COMPONENT TYPES: container, section, heading, text, button, image, card, form, input, select, checkbox, table, chart_bar, chart_line, chart_pie, list, navbar, footer, hero, badge, modal, tabs, sidebar

FIELD TYPES: text, number, boolean, date, email, url, image, select, relation

RULES:
1. Always generate REAL content specific to what the user asked — never generic placeholders.
2. Use descriptive IDs like col_products, page_home, btn_submit.
3. Use appropriate realistic styles (colors, padding, borderRadius, display, flexDirection, gap, etc.)
4. Children arrays must be fully nested component trees.
5. Respond ONLY with valid JSON matching this schema — no extra text.

RESPONSE SCHEMA:
{
  "intent": "generate_app" | "generate_page" | "generate_dashboard" | "generate_section" | "edit_selection" | "theme_change" | "ask",
  "summary": "Brief human-readable description of what was built",
  "explanation": "Detailed explanation of the generated components and structure",
  "operations": [ ...array of AIOperation objects... ]
}`;

// ─── Context builder (shared by generate and stream) ─────────────────────────

function buildContextBlock(request: AIRequest): string {
  const project = request.context?.project;
  const selectedNode = request.context?.selectedNode;
  const activePageId = request.context?.activePageId;

  if (!project) return '';

  return `
CURRENT PROJECT CONTEXT:
- Pages: ${JSON.stringify(project.pages?.map((p: any) => ({ id: p.id, name: p.name, slug: p.slug })))}
- Active Page ID: ${activePageId || 'none'}
- Selected Component: ${selectedNode ? JSON.stringify({ id: selectedNode.id, type: selectedNode.type, name: selectedNode.name }) : 'none'}
- Existing Collections: ${JSON.stringify(project.database?.collections?.map((c: any) => ({ id: c.id, name: c.name })) || [])}
`;
}

function buildUserMessage(request: AIRequest): string {
  return `${buildContextBlock(request)}
USER REQUEST: ${request.prompt}

Generate the operations to fulfill this request. Be specific and generate realistic, detailed content.`;
}

function parseStructuredResponse(rawText: string): any {
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const data = JSON.parse(cleaned);
  if (!data.operations || !Array.isArray(data.operations)) {
    throw new Error('Gemini response missing "operations" array');
  }
  return data;
}

// ─── Gemini Provider ──────────────────────────────────────────────────────────

export class GeminiProvider implements AIProvider {
  public id = 'gemini';
  public name = 'Google Gemini';

  private client: GoogleGenAI;
  private modelName: string;
  private static inMemoryApiKey: string | null = null;

  public static setApiKey(key: string): void {
    GeminiProvider.inMemoryApiKey = key.trim() || null;
  }

  constructor() {
    const localKey = typeof window !== 'undefined' ? localStorage.getItem('apex_gemini_api_key') : null;
    const apiKey =
      GeminiProvider.inMemoryApiKey ||
      (localKey && localKey.trim().length > 0 ? localKey.trim() : null) ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim().length === 0) {
      throw new AIError(
        'PROVIDER_UNAVAILABLE',
        '⚠️ Gemini API key not configured. Add NEXT_PUBLIC_GEMINI_API_KEY to your .env.local file and restart the server.\n\nGet a free key at: https://aistudio.google.com/apikey'
      );
    }
    this.client = new GoogleGenAI({ apiKey });
    this.modelName = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash-exp';
  }

  public supportsVision(): boolean { return true; }
  public supportsStructuredOutput(): boolean { return true; }

  public async estimateCost(request: AIRequest): Promise<AICostEstimate> {
    const inputTokens = Math.ceil((request.prompt?.length || 0) / 4) + 800;
    const outputTokens = 2000;
    return {
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: outputTokens,
      estimatedCostUsd: (inputTokens * 0.00000035) + (outputTokens * 0.00000105),
    };
  }

  public async generate(request: AIRequest): Promise<AIResponse> {
    if (request.signal?.aborted) {
      throw new AIError('CANCELLED', 'Request was cancelled.');
    }

    const startMs = Date.now();

    const response = await this.client.models.generateContent({
      model: this.modelName,
      contents: buildUserMessage(request),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    });

    const rawText = response.text || '';
    const durationMs = Date.now() - startMs;

    let structuredData: any;
    try {
      structuredData = parseStructuredResponse(rawText);
    } catch (parseErr: any) {
      throw new AIError(
        'PROVIDER_UNAVAILABLE',
        `Gemini returned an unexpected response format. ${parseErr?.message || ''}\n\nRaw response (first 300 chars):\n${rawText.slice(0, 300)}`
      );
    }

    const usageMetadata = response.usageMetadata;

    return {
      id: `gemini_resp_${Date.now()}`,
      provider: this.id,
      model: this.modelName,
      text: structuredData.explanation || structuredData.summary || 'Generated successfully.',
      structuredData,
      finishReason: 'stop',
      usage: {
        inputTokens: usageMetadata?.promptTokenCount || 0,
        outputTokens: usageMetadata?.candidatesTokenCount || 0,
        totalTokens: usageMetadata?.totalTokenCount || 0,
        durationMs,
        estimatedCostUsd:
          ((usageMetadata?.promptTokenCount || 0) * 0.00000035) +
          ((usageMetadata?.candidatesTokenCount || 0) * 0.00000105),
      },
    };
  }

  public async stream(request: AIRequest, callbacks: AIStreamCallbacks): Promise<void> {
    if (request.signal?.aborted) {
      callbacks.onError?.(new AIError('CANCELLED', 'Request was cancelled.'));
      return;
    }

    callbacks.onProgress?.('Sending request to Gemini AI...', 15);
    const startMs = Date.now();

    try {
      callbacks.onProgress?.('Gemini AI analyzing your request...', 30);

      const streamResult = await this.client.models.generateContentStream({
        model: this.modelName,
        contents: buildUserMessage(request),
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      });

      callbacks.onProgress?.('Gemini AI generating application structure...', 55);

      let fullText = '';
      for await (const chunk of streamResult) {
        if (request.signal?.aborted) {
          callbacks.onError?.(new AIError('CANCELLED', 'Request was cancelled.'));
          return;
        }
        const chunkText = chunk.text || '';
        fullText += chunkText;
        if (chunkText) {
          callbacks.onToken?.(chunkText);
        }
      }

      callbacks.onProgress?.('Parsing AI response...', 80);

      let structuredData: any;
      try {
        structuredData = parseStructuredResponse(fullText);
      } catch (parseErr: any) {
        callbacks.onError?.(
          new AIError(
            'PROVIDER_UNAVAILABLE',
            `Gemini returned an unexpected response format. ${parseErr?.message || ''}`
          )
        );
        return;
      }

      callbacks.onProgress?.('Applying changes to canvas...', 95);

      callbacks.onComplete?.({
        id: `gemini_stream_${Date.now()}`,
        provider: this.id,
        model: this.modelName,
        text: structuredData.explanation || structuredData.summary || 'Generated successfully.',
        structuredData,
        finishReason: 'stop',
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, durationMs: Date.now() - startMs },
      });
    } catch (err: any) {
      if (request.signal?.aborted) {
        callbacks.onError?.(new AIError('CANCELLED', 'Request was cancelled.'));
        return;
      }
      callbacks.onError?.(
        err instanceof AIError
          ? err
          : new AIError('PROVIDER_UNAVAILABLE', `Gemini API error: ${err?.message || String(err)}`)
      );
    }
  }
}
