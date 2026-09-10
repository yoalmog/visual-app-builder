// Phase8FailureInjector — REMOVED.
// Failure simulation has been replaced by real error handling.
// The system no longer injects artificial failures; real errors from Gemini,
// transactions, and verification are surfaced and handled directly.
//
// This stub is kept to avoid import errors in PlatformCertificationEngine.

export type InjectedFailureType =
  | 'GOAL_PARSING_FAILURE'
  | 'CONTEXT_FAILURE'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_TIMEOUT'
  | 'PLAN_GENERATION_FAILURE'
  | 'PLAN_VALIDATION_FAILURE'
  | 'APPROVAL_TIMEOUT'
  | 'OPERATION_FAILURE'
  | 'VERIFICATION_FAILURE'
  | 'TRANSACTION_INTERRUPTED'
  | 'PERSISTENCE_FAILURE'
  | 'MIGRATION_FAILURE'
  | 'BUILD_FAILURE'
  | 'REGRESSION_DETECTED'
  | 'CONCURRENT_LOCK_CONTENTION';

/** @deprecated Failure injection removed. Real errors are handled via AIError and AITransactionManager. */
export class Phase8FailureInjector {
  public static simulateFailure(
    _type: InjectedFailureType,
    _project: any,
    _step?: any
  ): { detected: boolean; recovered: boolean; safeProject: any; message: string } {
    throw new Error(
      '[Phase8FailureInjector] Failure simulation has been removed. ' +
      'Real error handling is in place via AIError, AITransactionManager.rollback(), and AutonomousVerificationEngine.'
    );
  }
}
