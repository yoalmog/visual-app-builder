// AI Secret Filter and Redaction

const SENSITIVE_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/gi,                          // OpenAI keys
  /claude-[a-zA-Z0-9]{20,}/gi,                      // Anthropic keys
  /AIza[0-9A-Za-z-_]{35}/gi,                        // Google API keys
  /Bearer\s+[a-zA-Z0-9_\-\.]{16,}/gi,               // Bearer tokens
  /(password|secret|apikey|api_key|service_role|access_token|private_key)["']?\s*[:=]\s*["']?([^"' \n\r]+)/gi,
  /postgres:\/\/[^@\n]+:[^@\n]+@[^\/\n]+/gi,       // Database connection strings with passwords
  /mongodb(\+srv)?:\/\/[^@\n]+:[^@\n]+@[^\/\n]+/gi,
];

export class AISecretFilter {
  /**
   * Redacts sensitive strings, secrets, tokens, and database passwords from text.
   */
  public static redactText(input: string): string {
    if (!input || typeof input !== 'string') return '';
    let result = input;

    // Direct token patterns
    result = result.replace(/sk-[a-zA-Z0-9]{20,}/gi, '[REDACTED_SECRET]');
    result = result.replace(/claude-[a-zA-Z0-9]{20,}/gi, '[REDACTED_SECRET]');
    result = result.replace(/AIza[0-9A-Za-z-_]{35}/gi, '[REDACTED_SECRET]');
    result = result.replace(/Bearer\s+[a-zA-Z0-9_\-\.]{16,}/gi, 'Bearer [REDACTED_SECRET]');
    result = result.replace(/postgres:\/\/[^@\n]+:[^@\n]+@[^\/\n]+/gi, 'postgres://[REDACTED_CREDENTIALS]');
    result = result.replace(/mongodb(\+srv)?:\/\/[^@\n]+:[^@\n]+@[^\/\n]+/gi, 'mongodb://[REDACTED_CREDENTIALS]');

    // Key-value pair patterns: password=xyz or apiKey: xyz
    result = result.replace(
      /(password|secret|apikey|api_key|service_role|access_token|private_key)(["']?\s*[:=]\s*["']?)([^"' \n\r]+)/gi,
      (_match, keyName, separator) => `${keyName}${separator}[REDACTED]`
    );

    return result;
  }

  /**
   * Recursively traverses an object and redacts any string property containing secrets or sensitive keys.
   */
  public static redactObject<T = any>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
      return this.redactText(obj) as unknown as T;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactObject(item)) as unknown as T;
    }
    if (typeof obj === 'object') {
      const copy: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('secret') ||
          lowerKey.includes('password') ||
          lowerKey.includes('privatekey') ||
          lowerKey.includes('apikey') ||
          lowerKey.includes('service_role')
        ) {
          copy[key] = '[REDACTED]';
        } else {
          copy[key] = this.redactObject(value);
        }
      }
      return copy as T;
    }
    return obj;
  }
}
