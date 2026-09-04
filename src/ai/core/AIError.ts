// Typed AI Error Hierarchy

export type AIErrorCode =
  | 'PROVIDER_UNAVAILABLE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'MALFORMED_OUTPUT'
  | 'SCHEMA_VALIDATION_FAILED'
  | 'PERMISSION_DENIED'
  | 'STALE_STATE'
  | 'UNSAFE_OPERATION'
  | 'PROMPT_INJECTION_DETECTED'
  | 'SECRET_EXPOSURE_PREVENTED'
  | 'AGENT_MAX_STEPS_EXCEEDED';

export class AIError extends Error {
  public readonly code: AIErrorCode;
  public readonly recoverable: boolean;
  public readonly details?: Record<string, any>;

  constructor(
    code: AIErrorCode,
    message: string,
    options?: { recoverable?: boolean; details?: Record<string, any>; cause?: Error }
  ) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.recoverable = options?.recoverable ?? false;
    this.details = options?.details;
    if (options?.cause) {
      this.cause = options.cause;
    }
    Object.setPrototypeOf(this, AIError.prototype);
  }
}
