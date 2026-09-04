// Prompt Injection Defense & Untrusted Input Sanitizer

const DANGEROUS_INSTRUCTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /system\s+override/i,
  /disregard\s+(all\s+)?(safety|rules|instructions)/i,
  /you\s+are\s+now\s+in\s+(developer|unrestricted|god)\s+mode/i,
  /delete\s+(all\s+)?(collections?|users?|databases?|records?)/i,
  /drop\s+table/i,
  /bypass\s+(rls|permissions?|authorization)/i,
];

export class PromptInjectionDefense {
  /**
   * Scans a prompt or input for prompt injection attack patterns.
   */
  public static containsInjectionAttempt(input: string): boolean {
    if (!input || typeof input !== 'string') return false;
    return DANGEROUS_INSTRUCTION_PATTERNS.some((p) => p.test(input));
  }

  /**
   * Encloses untrusted data (database records, uploaded files, API responses) in secure XML-like data boundary delimiters
   * so the LLM clearly processes it as passive data rather than instructions.
   */
  public static wrapUntrustedData(label: string, data: any): string {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    // Sanitize any boundary escape attempts
    const sanitized = serialized.replace(/<\/untrusted_data>/gi, '&lt;/untrusted_data&gt;');
    return `<untrusted_data type="${label}">\n${sanitized}\n</untrusted_data>`;
  }

  /**
   * Validates user instructions and raises an error or flag if an injection attempt is detected.
   */
  public static sanitizeInstruction(prompt: string): { safe: boolean; sanitized: string; flaggedReason?: string } {
    if (this.containsInjectionAttempt(prompt)) {
      return {
        safe: false,
        sanitized: prompt.replace(/ignore\s+(all\s+)?(previous|prior)\s+instructions/gi, '[blocked instruction attempt]'),
        flaggedReason: 'Suspicious instruction pattern detected matching known prompt injection signatures.',
      };
    }
    return { safe: true, sanitized: prompt };
  }
}
