// No-Eval Static Security Guard

export class NoEvalGuard {
  /**
   * Asserts that a code snippet or string does not invoke dangerous dynamic evaluation or arbitrary execution.
   */
  public static assertNoDynamicExecution(codeOrText: string): void {
    if (!codeOrText || typeof codeOrText !== 'string') return;
    const dangerousPatterns = [
      /\beval\s*\(/i,
      /\bnew\s+Function\s*\(/i,
      /\bFunction\s*\([^)]*\)\s*\(/i,
      /\bsetTimeout\s*\(\s*["'`]/i,
      /\bsetInterval\s*\(\s*["'`]/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(codeOrText)) {
        throw new Error(`Security Violation: Unsafe dynamic code execution pattern detected (${pattern.source})`);
      }
    }
  }

  public static isSafeFromDynamicExecution(codeOrText: string): boolean {
    try {
      this.assertNoDynamicExecution(codeOrText);
      return true;
    } catch {
      return false;
    }
  }
}
