// Multimodal UI Generation: Image/Screenshot analysis via real Gemini Vision API
import { GoogleGenAI } from '@google/genai';
import { ImageInput } from '../core/AIProvider';
import { AIOperation } from '../operations/AIOperation';
import { AIError } from '../core/AIError';

export interface VisualInferenceResult {
  detectedLayout: 'dashboard' | 'form' | 'landing' | 'table';
  colorPalette: { primary: string; background: string; text: string };
  sections: Array<{ type: string; title?: string; componentCount: number }>;
  operations: AIOperation[];
}

const VISION_SYSTEM_PROMPT = `You are an expert UI analyst. Analyze the provided screenshot or image and return a JSON object describing the UI structure.

RESPONSE SCHEMA:
{
  "detectedLayout": "dashboard" | "form" | "landing" | "table",
  "colorPalette": { "primary": "#hex", "background": "#hex", "text": "#hex" },
  "sections": [{ "type": "string", "title": "string", "componentCount": number }],
  "operations": [
    {
      "id": "op_page_vision",
      "type": "create_page",
      "description": "...",
      "risk": "low",
      "reversible": true,
      "pageId": "page_vision",
      "name": "Analyzed Layout",
      "slug": "/vision-preview"
    },
    ...additional add_component operations to recreate the UI...
  ]
}

Rules:
- Detect real colors from the image, not guesses
- Identify ALL visible UI sections (navbar, hero, cards, tables, charts, forms, footers)
- Generate add_component operations to recreate each detected section
- Use realistic component types: container, heading, text, button, card, table, chart_bar, chart_line, navbar, footer
- Return ONLY valid JSON, no extra text`;

export class ScreenshotAnalyzer {
  /**
   * Analyzes an image using Gemini Vision API and infers UI structure, layout, and color palette.
   * Returns a VisualInferenceResult with AIOperations to recreate the detected UI.
   */
  public static async analyze(image: ImageInput): Promise<VisualInferenceResult> {
    const localKey = typeof window !== 'undefined' ? localStorage.getItem('apex_gemini_api_key') : null;
    const apiKey = (localKey && localKey.trim().length > 0 ? localKey.trim() : null) || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
      throw new AIError(
        'PROVIDER_UNAVAILABLE',
        '⚠️ Gemini API key not configured. Add NEXT_PUBLIC_GEMINI_API_KEY to your .env.local file or configure it in Settings.'
      );
    }

    const client = new GoogleGenAI({ apiKey });
    const modelName = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash-exp';

    // Build the image part for Gemini
    let imagePart: any;
    if (image.base64) {
      imagePart = {
        inlineData: {
          mimeType: image.mimeType,
          data: image.base64,
        },
      };
    } else if (image.url) {
      // For URL-based images, fetch and convert to base64
      const res = await fetch(image.url);
      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      imagePart = {
        inlineData: {
          mimeType: image.mimeType || 'image/png',
          data: base64,
        },
      };
    } else {
      throw new AIError('PROVIDER_UNAVAILABLE', 'Image must have either base64 or url set.');
    }

    const response = await client.models.generateContent({
      model: modelName,
      contents: [
        {
          parts: [
            imagePart,
            { text: 'Analyze this UI screenshot and return the structured JSON describing what you see.' },
          ],
        },
      ],
      config: {
        systemInstruction: VISION_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    });

    const rawText = response.text || '';
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let result: VisualInferenceResult;
    try {
      result = JSON.parse(cleaned);
    } catch (err: any) {
      throw new AIError(
        'PROVIDER_UNAVAILABLE',
        `Gemini Vision returned an unexpected response format: ${err?.message || ''}`
      );
    }

    // Ensure required fields exist
    if (!result.operations) result.operations = [];
    if (!result.sections) result.sections = [];
    if (!result.colorPalette) result.colorPalette = { primary: '#2563EB', background: '#FFFFFF', text: '#0F172A' };
    if (!result.detectedLayout) result.detectedLayout = 'landing';

    return result;
  }
}
