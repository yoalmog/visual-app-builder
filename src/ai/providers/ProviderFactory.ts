// AI Provider Factory — always uses GeminiProvider (real AI)
import { AIProvider } from '../core/AIProvider';
import { AIError } from '../core/AIError';

let geminiInstance: AIProvider | null = null;

export class ProviderFactory {
  /**
   * Returns the Gemini AI provider.
   * Throws a clear AIError if NEXT_PUBLIC_GEMINI_API_KEY is not configured.
   */
  public static getProvider(_name?: string): AIProvider {
    if (!geminiInstance) {
      const { GeminiProvider } = require('./GeminiProvider');
      geminiInstance = new GeminiProvider();
    }
    return geminiInstance!;
  }

  /** Returns the configured provider name. Always 'gemini'. */
  public static detectProvider(): string {
    return 'gemini';
  }

  public static resetAll(): void {
    geminiInstance = null;
  }

  /** @deprecated Use resetAll() */
  public static resetMock(): void {
    this.resetAll();
  }
}
