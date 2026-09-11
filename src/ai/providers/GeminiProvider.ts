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
5. Keep your response concise, complete, and within output token limits. Never truncate JSON.
6. Respond ONLY with valid JSON matching this schema — no extra text.

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
    const localModel = typeof window !== 'undefined' ? localStorage.getItem('apex_gemini_model') : null;
    let model = localModel || process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-3.5-flash';
    const DEPRECATED_MODELS = [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash-latest',
      'gemini-2.0-flash',
      'gemini-2.0-pro',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
    ];
    if (DEPRECATED_MODELS.includes(model) || model.includes('-exp')) {
      model = 'gemini-3.5-flash';
      if (typeof window !== 'undefined') {
        localStorage.setItem('apex_gemini_model', 'gemini-3.5-flash');
      }
    }
    this.modelName = model;
  }

  public supportsVision(): boolean { return true; }
  public supportsStructuredOutput(): boolean { return true; }

  public setModel(model: string): void {
    this.modelName = model;
    if (typeof window !== 'undefined') {
      localStorage.setItem('apex_gemini_model', model);
    }
  }

  public getModel(): string {
    return this.modelName;
  }

  private getCandidateModels(): string[] {
    const defaultOrder = [
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
    ];
    const DEPRECATED_MODELS = [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash-latest',
      'gemini-2.0-flash',
      'gemini-2.0-pro',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
    ];
    const preferred = DEPRECATED_MODELS.includes(this.modelName) ? 'gemini-3.5-flash' : this.modelName;
    const candidates = [preferred, ...defaultOrder];
    return Array.from(
      new Set(
        candidates
          .filter(Boolean)
          .filter((m) => !DEPRECATED_MODELS.includes(m) && !m.includes('-exp'))
      )
    );
  }

  private isModelNotFoundError(err: any): boolean {
    const str = String(err?.message || err?.status || err || '').toLowerCase();
    return (
      str.includes('not found') ||
      str.includes('404') ||
      str.includes('not supported for generatecontent') ||
      str.includes('listmodels') ||
      str.includes('model not available') ||
      str.includes('no longer available') ||
      str.includes('unavailable') ||
      str.includes('503') ||
      str.includes('spikes in demand') ||
      str.includes('quota exceeded') ||
      str.includes('resource_exhausted') ||
      str.includes('429')
    );
  }

  private formatGeminiErrorMessage(err: any): string {
    const raw = err?.message || String(err || 'Unknown error');
    try {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start !== -1 && end > start) {
        const jsonStr = raw.substring(start, end + 1);
        const parsed = JSON.parse(jsonStr);
        if (parsed?.error?.message) {
          return `Gemini API: ${parsed.error.message.trim()}`;
        }
        if (parsed?.message) {
          return `Gemini API: ${parsed.message.trim()}`;
        }
      }
    } catch {
      // ignore JSON parse error
    }
    return `Gemini API: ${raw}`;
  }

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
    const candidateModels = this.getCandidateModels();
    let response: any = null;
    let successfulModel = this.modelName;
    let lastErr: any = null;

    for (const model of candidateModels) {
      try {
        response = await this.client.models.generateContent({
          model,
          contents: buildUserMessage(request),
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            temperature: 0.7,
            maxOutputTokens: 16384,
          },
        });
        successfulModel = model;
        this.modelName = model;
        if (typeof window !== 'undefined') {
          localStorage.setItem('apex_gemini_model', model);
        }
        break;
      } catch (err: any) {
        lastErr = err;
        if (this.isModelNotFoundError(err)) {
          console.warn(`[GeminiProvider] Model ${model} not available. Trying next candidate...`);
          continue;
        }
        throw new AIError('PROVIDER_UNAVAILABLE', this.formatGeminiErrorMessage(err));
      }
    }

    if (!response) {
      throw new AIError(
        'PROVIDER_UNAVAILABLE',
        lastErr ? this.formatGeminiErrorMessage(lastErr) : 'No available Gemini model responded.'
      );
    }

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
      model: successfulModel,
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
      const candidateModels = this.getCandidateModels();
      let fullText = '';
      let successfulModel = this.modelName;
      let lastErr: any = null;

      for (const model of candidateModels) {
        try {
          callbacks.onProgress?.(`Contacting Gemini (${model})...`, 30);
          const streamResult = await this.client.models.generateContentStream({
            model,
            contents: buildUserMessage(request),
            config: {
              systemInstruction: SYSTEM_PROMPT,
              responseMimeType: 'application/json',
              temperature: 0.7,
              maxOutputTokens: 16384,
            },
          });

          callbacks.onProgress?.(`Receiving response from Gemini (${model})...`, 55);
          fullText = '';
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

          successfulModel = model;
          this.modelName = model;
          if (typeof window !== 'undefined') {
            localStorage.setItem('apex_gemini_model', model);
          }
          break;
        } catch (err: any) {
          lastErr = err;
          if (this.isModelNotFoundError(err)) {
            console.warn(`[GeminiProvider] Model ${model} not available (${err?.message || err}). Trying next candidate...`);
            continue;
          }
          throw err;
        }
      }

      if (!fullText) {
        throw lastErr || new AIError('PROVIDER_UNAVAILABLE', 'No available Gemini model responded.');
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
        model: successfulModel,
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
          : new AIError('PROVIDER_UNAVAILABLE', this.formatGeminiErrorMessage(err))
      );
    }
  }
}
